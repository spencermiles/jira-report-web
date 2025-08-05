import { prisma } from '../db';
import { GraphQLError } from 'graphql';
import { Prisma } from '@prisma/client';

export const resolvers = {
  Query: {
    projects: async () => {
      return await prisma.project.findMany({
        orderBy: { updatedAt: 'desc' }
      });
    },

    project: async (_: any, { key }: { key: string }) => {
      const project = await prisma.project.findUnique({
        where: { key }
      });
      
      if (!project) {
        throw new GraphQLError(`Project with key ${key} not found`);
      }
      
      return project;
    },

    issues: async (_: any, { filters }: { filters?: any }) => {
      const whereClause: Prisma.IssueWhereInput = {};
      
      if (filters) {
        if (filters.projectKeys?.length) {
          whereClause.project = {
            key: { in: filters.projectKeys }
          };
        }
        
        if (filters.issueTypes?.length) {
          whereClause.issueType = { in: filters.issueTypes };
        }
        
        if (filters.priorities?.length) {
          whereClause.priority = { in: filters.priorities };
        }
        
        if (filters.createdAfter || filters.createdBefore) {
          whereClause.created = {};
          if (filters.createdAfter) whereClause.created.gte = new Date(filters.createdAfter);
          if (filters.createdBefore) whereClause.created.lte = new Date(filters.createdBefore);
        }
        
        if (filters.resolvedAfter || filters.resolvedBefore) {
          whereClause.resolved = {};
          if (filters.resolvedAfter) whereClause.resolved.gte = new Date(filters.resolvedAfter);
          if (filters.resolvedBefore) whereClause.resolved.lte = new Date(filters.resolvedBefore);
        }
        
        if (filters.statuses?.length) {
          if (filters.statuses.includes('resolved') && !filters.statuses.includes('unresolved')) {
            whereClause.resolved = { not: null };
          } else if (filters.statuses.includes('unresolved') && !filters.statuses.includes('resolved')) {
            whereClause.resolved = null;
          }
        }
      }
      
      return await prisma.issue.findMany({
        where: whereClause,
        orderBy: { created: 'desc' }
      });
    },

    issue: async (_: any, { key }: { key: string }) => {
      const issue = await prisma.issue.findUnique({
        where: { key }
      });
      
      if (!issue) {
        throw new GraphQLError(`Issue with key ${key} not found`);
      }
      
      return issue;
    }
  },

  Mutation: {
    uploadJiraData: async (_: any, { 
      data, 
      workflowMappings, 
      projectKey, 
      projectName 
    }: {
      data: any[];
      workflowMappings: any[];
      projectKey: string;
      projectName: string;
    }) => {
      try {
        return await prisma.$transaction(async (tx) => {
          // Create or update project
          const project = await tx.project.upsert({
            where: { key: projectKey },
            update: { name: projectName },
            create: {
              key: projectKey,
              name: projectName
            }
          });

          // Create workflow mappings
          await tx.workflowMapping.deleteMany({
            where: { projectId: project.id }
          });
          
          await tx.workflowMapping.createMany({
            data: workflowMappings.map(mapping => ({
              projectId: project.id,
              jiraStatusName: mapping.jiraStatusName,
              canonicalStage: mapping.canonicalStage
            }))
          });

          let issuesCreated = 0;
          let sprintsCreated = 0;
          const sprintCache = new Map<string, number>();

          // Process each issue
          for (const issueData of data) {
            // Create sprints if they don't exist
            for (const sprintInfo of issueData.sprintInfo || []) {
              if (!sprintCache.has(sprintInfo.name)) {
                const sprint = await tx.sprint.upsert({
                  where: {
                    projectId_name: {
                      projectId: project.id,
                      name: sprintInfo.name
                    }
                  },
                  update: {
                    startDate: sprintInfo.startDate ? new Date(sprintInfo.startDate) : null,
                    endDate: sprintInfo.endDate ? new Date(sprintInfo.endDate) : null
                  },
                  create: {
                    name: sprintInfo.name,
                    startDate: sprintInfo.startDate ? new Date(sprintInfo.startDate) : null,
                    endDate: sprintInfo.endDate ? new Date(sprintInfo.endDate) : null,
                    projectId: project.id
                  }
                });
                sprintCache.set(sprintInfo.name, sprint.id);
                if (sprint) sprintsCreated++;
              }
            }

            // Create or update issue
            const issue = await tx.issue.upsert({
              where: { key: issueData.key },
              update: {
                summary: issueData.summary,
                issueType: issueData.issueType,
                priority: issueData.priority,
                storyPoints: issueData.storyPoints,
                parentKey: issueData.parentKey,
                webUrl: issueData.webUrl,
                resolved: issueData.resolved ? new Date(issueData.resolved) : null,
                rawData: issueData.rawData
              },
              create: {
                jiraId: issueData.jiraId,
                key: issueData.key,
                summary: issueData.summary,
                issueType: issueData.issueType,
                priority: issueData.priority,
                projectId: project.id,
                storyPoints: issueData.storyPoints,
                parentKey: issueData.parentKey,
                webUrl: issueData.webUrl,
                created: new Date(issueData.created),
                resolved: issueData.resolved ? new Date(issueData.resolved) : null,
                rawData: issueData.rawData
              }
            });

            if (issue) issuesCreated++;

            // Create status changes
            await tx.statusChange.deleteMany({
              where: { issueId: issue.id }
            });

            if (issueData.changelogs?.length) {
              await tx.statusChange.createMany({
                data: issueData.changelogs.map((changelog: any) => ({
                  issueId: issue.id,
                  fieldName: changelog.fieldName,
                  fromValue: changelog.fromString,
                  toValue: changelog.toString,
                  changed: new Date(changelog.created)
                }))
              });
            }

            // Link to sprints
            await tx.issuesSprints.deleteMany({
              where: { issueId: issue.id }
            });

            for (const sprintInfo of issueData.sprintInfo || []) {
              const sprintId = sprintCache.get(sprintInfo.name);
              if (sprintId) {
                await tx.issuesSprints.create({
                  data: {
                    issueId: issue.id,
                    sprintId: sprintId
                  }
                });
              }
            }
          }

          return {
            success: true,
            message: `Successfully uploaded ${issuesCreated} issues`,
            projectsCreated: 1,
            issuesCreated,
            sprintsCreated
          };
        });
      } catch (error) {
        console.error('Upload error:', error);
        throw new GraphQLError(`Failed to upload data: ${error}`);
      }
    },

    deleteProject: async (_: any, { id }: { id: string }) => {
      try {
        await prisma.project.delete({
          where: { id: parseInt(id) }
        });
        return true;
      } catch (error) {
        throw new GraphQLError(`Failed to delete project: ${error}`);
      }
    }
  },

  // Field resolvers
  Project: {
    issues: async (parent: any, { filters }: { filters?: any }) => {
      const whereClause: Prisma.IssueWhereInput = {
        projectId: parent.id
      };
      
      // Apply filters similar to Query.issues
      if (filters) {
        if (filters.issueTypes?.length) {
          whereClause.issueType = { in: filters.issueTypes };
        }
        // ... other filters
      }
      
      return await prisma.issue.findMany({
        where: whereClause,
        orderBy: { created: 'desc' }
      });
    },

    sprints: async (parent: any) => {
      return await prisma.sprint.findMany({
        where: { projectId: parent.id },
        orderBy: { startDate: 'desc' }
      });
    },

    workflowMappings: async (parent: any) => {
      return await prisma.workflowMapping.findMany({
        where: { projectId: parent.id }
      });
    },

    metrics: async (parent: any) => {
      // This would use the PostgreSQL view we'll create
      const result = await prisma.$queryRaw`
        SELECT 
          COUNT(*) as total_issues,
          COUNT(CASE WHEN resolved IS NOT NULL THEN 1 END) as resolved_issues,
          AVG(CASE WHEN resolved IS NOT NULL THEN EXTRACT(EPOCH FROM (resolved - created)) / 86400.0 END) as avg_lead_time
        FROM issues 
        WHERE project_id = ${parent.id}
      `;
      
      const metrics = Array.isArray(result) ? result[0] : result;
      
      return {
        totalIssues: Number(metrics.total_issues) || 0,
        resolvedIssues: Number(metrics.resolved_issues) || 0,
        averageLeadTime: Number(metrics.avg_lead_time) || null,
        averageCycleTime: null, // Will implement with view
        flowEfficiency: null,
        firstTimeThrough: null
      };
    }
  },

  Issue: {
    project: async (parent: any) => {
      return await prisma.project.findUnique({
        where: { id: parent.projectId }
      });
    },

    sprints: async (parent: any) => {
      const issuesSprints = await prisma.issuesSprints.findMany({
        where: { issueId: parent.id },
        include: { sprint: true }
      });
      return issuesSprints.map(is => is.sprint);
    },

    statusChanges: async (parent: any) => {
      return await prisma.statusChange.findMany({
        where: { issueId: parent.id },
        orderBy: { changed: 'asc' }
      });
    },

    parent: async (parent: any) => {
      if (!parent.parentKey) return null;
      return await prisma.issue.findUnique({
        where: { key: parent.parentKey }
      });
    },

    children: async (parent: any) => {
      return await prisma.issue.findMany({
        where: { parentKey: parent.key }
      });
    },

    metrics: async (parent: any) => {
      // For now, return basic structure. Will implement with PostgreSQL view
      return {
        leadTime: null,
        cycleTime: null,
        groomingCycleTime: null,
        devCycleTime: null,
        qaCycleTime: null,
        blockers: 0,
        reviewChurn: 0,
        qaChurn: 0,
        stageTimestamps: {}
      };
    }
  },

  Sprint: {
    project: async (parent: any) => {
      return await prisma.project.findUnique({
        where: { id: parent.projectId }
      });
    },

    issues: async (parent: any) => {
      const issuesSprints = await prisma.issuesSprints.findMany({
        where: { sprintId: parent.id },
        include: { issue: true }
      });
      return issuesSprints.map(is => is.issue);
    }
  }
};