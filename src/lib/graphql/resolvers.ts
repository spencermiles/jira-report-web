import { prisma } from '../db';
import { GraphQLError } from 'graphql';
import { Prisma } from '@prisma/client';
import { 
  withErrorHandling, 
  Logger, 
  NotFoundError, 
  ValidationError,
  validatePagination,
  validateProjectKeys,
  validateDateRange,
  PerformanceMonitor,
  RateLimiter 
} from './error-handling';
import { WorkflowMappingService } from '@/services/workflow-mapping.service';

// Helper function to build advanced filter clauses
function buildIssueWhereClause(filters?: any): Prisma.IssueWhereInput {
  const whereClause: Prisma.IssueWhereInput = {};
  
  if (!filters) return whereClause;
  
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
  
  if (filters.storyPoints?.length) {
    whereClause.storyPoints = { in: filters.storyPoints };
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
  
  if (filters.parentKey) {
    whereClause.parentKey = filters.parentKey;
  }
  
  if (filters.search) {
    whereClause.OR = [
      { summary: { contains: filters.search, mode: 'insensitive' } },
      { key: { contains: filters.search, mode: 'insensitive' } }
    ];
  }
  
  if (filters.sprints?.length) {
    whereClause.sprints = {
      some: {
        sprint: {
          name: { in: filters.sprints }
        }
      }
    };
  }
  
  return whereClause;
}

// Helper function to build SQL WHERE clause for database views
function buildViewWhereClause(filters?: any, projectIdField = 'project_id'): string {
  const conditions: string[] = [];
  
  if (!filters) return '';
  
  if (filters.projectKeys?.length) {
    const projectKeysStr = filters.projectKeys.map((k: string) => `'${k}'`).join(',');
    conditions.push(`EXISTS (SELECT 1 FROM projects p WHERE p.id = ${projectIdField} AND p.key IN (${projectKeysStr}))`);
  }
  
  if (filters.issueTypes?.length) {
    const typesStr = filters.issueTypes.map((t: string) => `'${t}'`).join(',');
    conditions.push(`issue_type IN (${typesStr})`);
  }
  
  if (filters.priorities?.length) {
    const prioritiesStr = filters.priorities.map((p: string) => `'${p}'`).join(',');
    conditions.push(`priority IN (${prioritiesStr})`);
  }
  
  if (filters.cycleTimeMin !== undefined) {
    conditions.push(`cycle_time >= ${filters.cycleTimeMin}`);
  }
  
  if (filters.cycleTimeMax !== undefined) {
    conditions.push(`cycle_time <= ${filters.cycleTimeMax}`);
  }
  
  if (filters.leadTimeMin !== undefined) {
    conditions.push(`lead_time >= ${filters.leadTimeMin}`);
  }
  
  if (filters.leadTimeMax !== undefined) {
    conditions.push(`lead_time <= ${filters.leadTimeMax}`);
  }
  
  if (filters.hasBlockers === true) {
    conditions.push(`blockers > 0`);
  } else if (filters.hasBlockers === false) {
    conditions.push(`blockers = 0`);
  }
  
  if (filters.hasChurn === true) {
    conditions.push(`(review_churn > 0 OR qa_churn > 0)`);
  } else if (filters.hasChurn === false) {
    conditions.push(`review_churn = 0 AND qa_churn = 0`);
  }
  
  if (filters.createdAfter) {
    conditions.push(`created >= '${filters.createdAfter}'`);
  }
  
  if (filters.createdBefore) {
    conditions.push(`created <= '${filters.createdBefore}'`);
  }
  
  if (filters.resolvedAfter) {
    conditions.push(`resolved >= '${filters.resolvedAfter}'`);
  }
  
  if (filters.resolvedBefore) {
    conditions.push(`resolved <= '${filters.resolvedBefore}'`);
  }
  
  if (filters.statuses?.length) {
    if (filters.statuses.includes('resolved') && !filters.statuses.includes('unresolved')) {
      conditions.push(`resolved IS NOT NULL`);
    } else if (filters.statuses.includes('unresolved') && !filters.statuses.includes('resolved')) {
      conditions.push(`resolved IS NULL`);
    }
  }
  
  if (filters.search) {
    conditions.push(`(summary ILIKE '%${filters.search}%' OR key ILIKE '%${filters.search}%')`);
  }
  
  return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
}

// Helper function to build ORDER BY clause
function buildOrderByClause(sort?: any): string {
  if (!sort) return 'ORDER BY created DESC';
  
  const direction = sort.direction === 'ASC' ? 'ASC' : 'DESC';
  
  switch (sort.field) {
    case 'created':
      return `ORDER BY created ${direction}`;
    case 'resolved':
      return `ORDER BY resolved ${direction}`;
    case 'cycleTime':
      return `ORDER BY cycle_time ${direction}`;
    case 'leadTime':
      return `ORDER BY lead_time ${direction}`;
    case 'priority':
      return `ORDER BY priority ${direction}`;
    case 'storyPoints':
      return `ORDER BY story_points ${direction}`;
    default:
      return `ORDER BY created ${direction}`;
  }
}

export const resolvers = {
  Query: {
    projects: async () => {
      return await prisma.project.findMany({
        orderBy: { updatedAt: 'desc' }
      });
    },

    project: withErrorHandling(async (_: any, { key }: { key: string }) => {
      if (!key || key.trim().length === 0) {
        throw new ValidationError('Project key is required', 'key');
      }
      
      const project = await prisma.project.findUnique({
        where: { key: key.trim() }
      });
      
      if (!project) {
        throw new NotFoundError('Project', key);
      }
      
      return project;
    }, 'project'),

    issues: withErrorHandling(async (_: any, { 
      filters, 
      pagination = { limit: 50, offset: 0 }, 
      sort 
    }: { 
      filters?: any; 
      pagination?: any; 
      sort?: any; 
    }, context: any) => {
      // Rate limiting
      const clientId = context.req.headers['x-forwarded-for'] || context.req.ip || 'unknown';
      if (!RateLimiter.checkLimit(clientId)) {
        throw new GraphQLError('Rate limit exceeded', {
          extensions: { code: 'RATE_LIMIT_EXCEEDED' }
        });
      }
      
      // Validate inputs
      const validatedPagination = validatePagination(pagination);
      validateProjectKeys(filters?.projectKeys);
      validateDateRange(filters?.createdAfter, filters?.createdBefore);
      validateDateRange(filters?.resolvedAfter, filters?.resolvedBefore);
      // For advanced filtering with metrics, use database views
      if (filters && (
        filters.cycleTimeMin !== undefined || 
        filters.cycleTimeMax !== undefined ||
        filters.leadTimeMin !== undefined ||
        filters.leadTimeMax !== undefined ||
        filters.hasBlockers !== undefined ||
        filters.hasChurn !== undefined
      )) {
        const whereClause = buildViewWhereClause(filters);
        const orderClause = buildOrderByClause(sort);
        
        const countResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count
          FROM issue_metrics
          ${whereClause ? Prisma.sql([whereClause]) : Prisma.empty}
        `;
        
        const totalCount = Number(countResult[0].count);
        
        const issues = await prisma.$queryRaw<Array<{
          id: number;
          key: string;
          jira_id: string;
          summary: string;
          issue_type: string;
          priority: string;
          project_id: number;
          story_points: number | null;
          created: Date;
          resolved: Date | null;
        }>>`
          SELECT 
            id, key, jira_id, summary, issue_type, priority, 
            project_id, story_points, created, resolved
          FROM issue_metrics
          ${whereClause ? Prisma.sql([whereClause]) : Prisma.empty}
          ${Prisma.sql([orderClause])}
          LIMIT ${validatedPagination.limit}
          OFFSET ${validatedPagination.offset}
        `;
        
        // Convert to GraphQL format
        const formattedIssues = issues.map(issue => ({
          id: issue.id.toString(),
          key: issue.key,
          jiraId: issue.jira_id,
          summary: issue.summary,
          issueType: issue.issue_type,
          priority: issue.priority,
          projectId: issue.project_id,
          storyPoints: issue.story_points,
          created: issue.created,
          resolved: issue.resolved,
          parentKey: null, // Will be resolved via field resolver
          webUrl: null,
          rawData: {}
        }));
        
        return {
          issues: formattedIssues,
          totalCount,
          hasNextPage: pagination.offset + pagination.limit < totalCount,
          hasPreviousPage: pagination.offset > 0
        };
      }
      
      // For simple filtering, use Prisma directly
      const whereClause = buildIssueWhereClause(filters);
      
      const [issues, totalCount] = await Promise.all([
        prisma.issue.findMany({
          where: whereClause,
          orderBy: sort?.field === 'created' 
            ? { created: sort.direction === 'ASC' ? 'asc' : 'desc' }
            : { created: 'desc' },
          take: validatedPagination.limit,
          skip: validatedPagination.offset
        }),
        prisma.issue.count({ where: whereClause })
      ]);
      
      return {
        issues,
        totalCount,
        hasNextPage: validatedPagination.offset + validatedPagination.limit < totalCount,
        hasPreviousPage: validatedPagination.offset > 0
      };
    }, 'issues'),

    projectSummaries: async (_: any, { 
      filters, 
      pagination = { limit: 50, offset: 0 }, 
      sort 
    }: { 
      filters?: any; 
      pagination?: any; 
      sort?: any; 
    }) => {
      // Early return optimization: check if we have any data at all
      const hasData = await prisma.project.count();
      if (hasData === 0) {
        return {
          projects: [],
          totalCount: 0,
          aggregatedMetrics: {
            totalProjects: 0,
            totalIssues: 0,
            totalResolvedIssues: 0,
            overallAverageLeadTime: null,
            overallAverageCycleTime: null,
            overallFlowEfficiency: null
          }
        };
      }

      const whereClause = buildViewWhereClause(filters, 'id');
      const orderClause = sort?.field === 'name' 
        ? `ORDER BY name ${sort.direction === 'ASC' ? 'ASC' : 'DESC'}`
        : 'ORDER BY updated_at DESC';
      
      const [projects, countResult, aggregatedResult] = await Promise.all([
        prisma.$queryRaw<Array<{
          id: number;
          key: string;
          name: string;
          created_at: Date;
          updated_at: Date;
          total_issues: bigint;
          resolved_issues: bigint;
          avg_lead_time: number | null;
          avg_cycle_time: number | null;
          median_lead_time: number | null;
          median_cycle_time: number | null;
          flow_efficiency: number | null;
          first_time_through: number | null;
        }>>`
          SELECT 
            p.id, p.key, p.name, p.created_at, p.updated_at,
            ps.total_issues, ps.resolved_issues, ps.avg_lead_time,
            ps.avg_cycle_time, ps.median_lead_time, ps.median_cycle_time, 
            ps.flow_efficiency, ps.first_time_through
          FROM projects p
          LEFT JOIN project_summary ps ON p.id = ps.id
          ${whereClause ? Prisma.sql([whereClause.replace('project_id', 'p.id')]) : Prisma.empty}
          ${Prisma.sql([orderClause])}
          LIMIT ${pagination.limit}
          OFFSET ${pagination.offset}
        `,
        
        prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count
          FROM projects p
          LEFT JOIN project_summary ps ON p.id = ps.id
          ${whereClause ? Prisma.sql([whereClause.replace('project_id', 'p.id')]) : Prisma.empty}
        `,
        
        prisma.$queryRaw<Array<{
          total_projects: bigint;
          total_issues: bigint;
          total_resolved_issues: bigint;
          overall_avg_lead_time: number | null;
          overall_avg_cycle_time: number | null;
          overall_flow_efficiency: number | null;
        }>>`
          SELECT 
            COUNT(DISTINCT p.id) as total_projects,
            SUM(COALESCE(ps.total_issues, 0)) as total_issues,
            SUM(COALESCE(ps.resolved_issues, 0)) as total_resolved_issues,
            AVG(ps.avg_lead_time) as overall_avg_lead_time,
            AVG(ps.avg_cycle_time) as overall_avg_cycle_time,
            AVG(ps.flow_efficiency) as overall_flow_efficiency
          FROM projects p
          LEFT JOIN project_summary ps ON p.id = ps.id
          ${whereClause ? Prisma.sql([whereClause.replace('project_id', 'p.id')]) : Prisma.empty}
        `
      ]);
      
      const totalCount = Number(countResult[0].count);
      const aggregated = aggregatedResult[0];
      
      const formattedProjects = projects.map(project => ({
        id: project.id.toString(),
        key: project.key,
        name: project.name,
        createdAt: project.created_at,
        updatedAt: project.updated_at,
        issueCount: Number(project.total_issues || 0),
        lastActivity: project.updated_at,
        metrics: {
          totalIssues: Number(project.total_issues || 0),
          resolvedIssues: Number(project.resolved_issues || 0),
          // Use median for consistency with individual project screen
          averageLeadTime: project.median_lead_time ? parseFloat(project.median_lead_time.toString()) : null,
          averageCycleTime: project.median_cycle_time ? parseFloat(project.median_cycle_time.toString()) : null,
          flowEfficiency: project.flow_efficiency ? parseFloat(project.flow_efficiency.toString()) : null,
          firstTimeThrough: project.first_time_through ? parseFloat(project.first_time_through.toString()) : null
        }
      }));
      
      return {
        projects: formattedProjects,
        totalCount,
        aggregatedMetrics: {
          totalProjects: Number(aggregated.total_projects),
          totalIssues: Number(aggregated.total_issues),
          totalResolvedIssues: Number(aggregated.total_resolved_issues),
          overallAverageLeadTime: aggregated.overall_avg_lead_time ? parseFloat(aggregated.overall_avg_lead_time.toString()) : null,
          overallAverageCycleTime: aggregated.overall_avg_cycle_time ? parseFloat(aggregated.overall_avg_cycle_time.toString()) : null,
          overallFlowEfficiency: aggregated.overall_flow_efficiency ? parseFloat(aggregated.overall_flow_efficiency.toString()) : null
        }
      };
    },

    issue: withErrorHandling(async (_: any, { key }: { key: string }) => {
      if (!key || key.trim().length === 0) {
        throw new ValidationError('Issue key is required', 'key');
      }
      
      const issue = await prisma.issue.findUnique({
        where: { key: key.trim() }
      });
      
      if (!issue) {
        throw new NotFoundError('Issue', key);
      }
      
      return issue;
    }, 'issue'),

    cycleTimeDistribution: async (_: any, { 
      projectKeys, 
      filters 
    }: { 
      projectKeys?: string[]; 
      filters?: any; 
    }) => {
      // Early return optimization: check if we have any data at all
      const hasData = await prisma.issue.count();
      if (hasData === 0) {
        return [
          { range: 'No Data', count: 0, percentage: 0 }
        ];
      }

      const combinedFilters = { ...filters, projectKeys };
      const whereClause = buildViewWhereClause(combinedFilters);
      
      const results = await prisma.$queryRaw<Array<{
        range: string;
        count: bigint;
        total_count: bigint;
      }>>`
        WITH cycle_time_buckets AS (
          SELECT 
            CASE 
              WHEN cycle_time IS NULL THEN 'No Data'
              WHEN cycle_time <= 1 THEN '0-1 days'
              WHEN cycle_time <= 3 THEN '1-3 days'
              WHEN cycle_time <= 7 THEN '3-7 days'
              WHEN cycle_time <= 14 THEN '7-14 days'
              WHEN cycle_time <= 30 THEN '14-30 days'
              ELSE '30+ days'
            END as range,
            COUNT(*) as count
          FROM issue_metrics
          ${whereClause ? Prisma.sql([whereClause]) : Prisma.empty}
          GROUP BY 1
        ),
        total_issues AS (
          SELECT COUNT(*) as total_count
          FROM issue_metrics
          ${whereClause ? Prisma.sql([whereClause]) : Prisma.empty}
        )
        SELECT 
          ctb.range,
          ctb.count,
          ti.total_count
        FROM cycle_time_buckets ctb
        CROSS JOIN total_issues ti
        ORDER BY 
          CASE ctb.range
            WHEN '0-1 days' THEN 1
            WHEN '1-3 days' THEN 2
            WHEN '3-7 days' THEN 3
            WHEN '7-14 days' THEN 4
            WHEN '14-30 days' THEN 5
            WHEN '30+ days' THEN 6
            ELSE 7
          END
      `;
      
      return results.map(result => ({
        range: result.range,
        count: Number(result.count),
        percentage: Number(result.total_count) > 0 
          ? parseFloat(((Number(result.count) / Number(result.total_count)) * 100).toFixed(1))
          : 0
      }));
    },

    flowMetricsTrend: async (_: any, { 
      projectKeys, 
      period, 
      filters 
    }: { 
      projectKeys?: string[]; 
      period: string; 
      filters?: any; 
    }) => {
      // Early return optimization: check if we have any data at all
      const hasData = await prisma.issue.count();
      if (hasData === 0) {
        return [];
      }

      const combinedFilters = { ...filters, projectKeys };
      const whereClause = buildViewWhereClause(combinedFilters);
      
      let dateFormat = '';
      let dateGrouping = '';
      
      switch (period) {
        case 'week':
          dateFormat = 'YYYY-"W"WW';
          dateGrouping = `TO_CHAR(resolved, '${dateFormat}')`;
          break;
        case 'month':
          dateFormat = 'YYYY-MM';
          dateGrouping = `TO_CHAR(resolved, '${dateFormat}')`;
          break;
        case 'quarter':
          dateFormat = 'YYYY-Q';
          dateGrouping = `TO_CHAR(resolved, '${dateFormat}')`;
          break;
        default:
          throw new GraphQLError(`Invalid period: ${period}. Must be 'week', 'month', or 'quarter'`);
      }
      
      const results = await prisma.$queryRaw<Array<{
        period: string;
        avg_cycle_time: number | null;
        avg_lead_time: number | null;
        flow_efficiency: number | null;
        throughput: bigint;
        first_time_through: number | null;
      }>>`
        SELECT 
          ${Prisma.sql([dateGrouping])} as period,
          ROUND(AVG(cycle_time), 1) as avg_cycle_time,
          ROUND(AVG(lead_time), 1) as avg_lead_time,
          ROUND(AVG(CASE 
            WHEN lead_time > 0 THEN 
              (COALESCE(grooming_cycle_time, 0) + COALESCE(dev_cycle_time, 0) + COALESCE(qa_cycle_time, 0)) / lead_time * 100
            ELSE 0 
          END), 1) as flow_efficiency,
          COUNT(*) as throughput,
          ROUND(AVG(CASE WHEN review_churn = 0 AND qa_churn = 0 THEN 100.0 ELSE 0.0 END), 1) as first_time_through
        FROM issue_metrics
        ${whereClause ? Prisma.sql([whereClause + ' AND resolved IS NOT NULL']) : Prisma.sql(['WHERE resolved IS NOT NULL'])}
        GROUP BY ${Prisma.sql([dateGrouping])}
        ORDER BY period DESC
        LIMIT 12
      `;
      
      return results.map(result => ({
        period: result.period,
        averageCycleTime: result.avg_cycle_time ? parseFloat(result.avg_cycle_time.toString()) : null,
        averageLeadTime: result.avg_lead_time ? parseFloat(result.avg_lead_time.toString()) : null,
        flowEfficiency: result.flow_efficiency ? parseFloat(result.flow_efficiency.toString()) : null,
        throughput: Number(result.throughput),
        firstTimeThrough: result.first_time_through ? parseFloat(result.first_time_through.toString()) : null
      }));
    }
  },

  Mutation: {
    uploadJiraData: async (_: any, { 
      data, 
      workflowMappings
    }: {
      data: any[];
      workflowMappings?: any[];
    }) => {
      try {
        // Extract unique projects from issues data
        const projectsMap = new Map<string, { key: string; name: string; issues: any[] }>();
        
        // Group issues by project
        for (const issueData of data) {
          const projectKey = issueData.projectKey;
          if (!projectsMap.has(projectKey)) {
            projectsMap.set(projectKey, {
              key: projectKey,
              name: projectKey, // Default to key, will be updated if name is found
              issues: []
            });
          }
          projectsMap.get(projectKey)!.issues.push(issueData);
        }

        // Generate workflow mappings OUTSIDE transaction to avoid deadlocks
        let finalWorkflowMappings = workflowMappings || [];
        
        if (!workflowMappings || workflowMappings.length === 0) {
          try {
            console.log('No workflow mappings provided, generating with AI...');
            const workflowService = new WorkflowMappingService();
            
            // Debug the data structure to understand why no status names are being extracted
            console.log('Sample issue data structure:');
            console.log('First issue changelogs:', JSON.stringify(data[0]?.changelogs?.slice(0, 5), null, 2));
            console.log('First issue changelog field:', data[0]?.changelog ? 'has changelog' : 'no changelog');
            
            // Look for status changes specifically
            const statusChangeExamples = data.slice(0, 5).flatMap(issue => 
              (issue.changelogs || []).filter((changelog: any) => 
                changelog.fieldName === 'status' || changelog.field_name === 'status'
              )
            );
            console.log('Status change examples:', JSON.stringify(statusChangeExamples, null, 2));
            
            const statusNames = workflowService.extractStatusNames(data);
            console.log('Extracted status names:', statusNames);
            
            if (statusNames.length > 0) {
              console.log(`Found ${statusNames.length} unique status names:`, statusNames);
              
              // Use the first project for context (could be enhanced to handle multi-project)
              const firstProjectKey = Array.from(projectsMap.keys())[0];
              const firstProject = projectsMap.get(firstProjectKey);
              
              console.log('Starting OpenAI API call for workflow mapping...');
              console.log('Request payload:', {
                projectKey: firstProjectKey,
                projectName: firstProject?.name,
                statusNames
              });
              const startTime = Date.now();
              
              const mappingResponse = await workflowService.generateMappings({
                projectKey: firstProjectKey,
                projectName: firstProject?.name,
                statusNames
              });
              
              const endTime = Date.now();
              console.log(`OpenAI API call completed in ${endTime - startTime}ms`);
              console.log('Raw mapping response:', mappingResponse);
              
              finalWorkflowMappings = mappingResponse.mappings.map(mapping => ({
                jiraStatusName: mapping.jiraStatusName,
                canonicalStage: mapping.canonicalStage
              }));
              
              console.log('Generated workflow mappings:', finalWorkflowMappings);
            } else {
              console.log('No status names found in data, skipping AI generation');
            }
          } catch (error) {
            console.warn('Failed to generate AI workflow mappings, using defaults:', error);
            // Fall back to basic mappings
            finalWorkflowMappings = [
              { jiraStatusName: 'To Do', canonicalStage: 'BACKLOG' },
              { jiraStatusName: 'In Progress', canonicalStage: 'IN_PROGRESS' },
              { jiraStatusName: 'In Review', canonicalStage: 'IN_REVIEW' },
              { jiraStatusName: 'Done', canonicalStage: 'DONE' },
              { jiraStatusName: 'Closed', canonicalStage: 'DONE' },
            ];
          }
        }

        console.log('Starting transaction with finalWorkflowMappings:', finalWorkflowMappings);
        console.log('finalWorkflowMappings length:', finalWorkflowMappings.length);

        return await prisma.$transaction(async (tx) => {

          let projectsCreated = 0;
          let issuesCreated = 0;
          let sprintsCreated = 0;

          // Process each project
          for (const [projectKey, projectData] of projectsMap) {
            // Check if project exists before upsert
            const existingProject = await tx.project.findUnique({
              where: { key: projectKey }
            });
            
            const isNewProject = !existingProject;
            
            // Create or update project
            const project = await tx.project.upsert({
              where: { key: projectKey },
              update: { name: projectData.name },
              create: {
                key: projectKey,
                name: projectData.name
              }
            });
            
            if (isNewProject) {
              projectsCreated++;
            }

            // Create workflow mappings for this project
            console.log(`Creating workflow mappings for project ${projectKey} (id: ${project.id})`);
            console.log(`Mappings to create:`, finalWorkflowMappings);
            
            await tx.workflowMapping.deleteMany({
              where: { projectId: project.id }
            });
            
            const mappingData = finalWorkflowMappings.map(mapping => ({
              projectId: project.id,
              jiraStatusName: mapping.jiraStatusName,
              canonicalStage: mapping.canonicalStage
            }));
            
            console.log(`Mapped workflow data:`, mappingData);
            
            await tx.workflowMapping.createMany({
              data: mappingData
            });
            
            console.log(`Created ${mappingData.length} workflow mappings for project ${projectKey}`);

            const sprintCache = new Map<string, number>();

            // Process each issue for this project
            for (const issueData of projectData.issues) {
            // Create sprints if they don't exist
            for (const sprintInfo of issueData.sprintInfo || []) {
              if (!sprintCache.has(sprintInfo.name)) {
                // Find existing sprint first
                let sprint = await tx.sprint.findFirst({
                  where: {
                    projectId: project.id,
                    name: sprintInfo.name
                  }
                });
                
                let isNewSprint = false;
                if (!sprint) {
                  // Create new sprint if doesn't exist
                  sprint = await tx.sprint.create({
                    data: {
                      name: sprintInfo.name,
                      startDate: sprintInfo.startDate ? new Date(sprintInfo.startDate) : null,
                      endDate: sprintInfo.endDate ? new Date(sprintInfo.endDate) : null,
                      projectId: project.id
                    }
                  });
                  isNewSprint = true;
                } else {
                  // Update existing sprint with any new date info
                  sprint = await tx.sprint.update({
                    where: { id: sprint.id },
                    data: {
                      startDate: sprintInfo.startDate ? new Date(sprintInfo.startDate) : sprint.startDate,
                      endDate: sprintInfo.endDate ? new Date(sprintInfo.endDate) : sprint.endDate
                    }
                  });
                }
                
                sprintCache.set(sprintInfo.name, sprint.id);
                if (isNewSprint) sprintsCreated++;
              }
            }

            // Check if issue exists before upsert
            const existingIssue = await tx.issue.findUnique({
              where: { key: issueData.key }
            });
            
            const isNewIssue = !existingIssue;

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

            if (isNewIssue) issuesCreated++;

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
          } // Close project loop

          return {
            success: true,
            message: `Successfully uploaded ${issuesCreated} issues across ${projectsCreated} projects`,
            projectsCreated,
            issuesCreated,
            sprintsCreated
          };
        }, {
          timeout: 60000 // Increase timeout to 60 seconds for JIRA data uploads
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
      // Combine project filter with any provided filters
      const combinedFilters = {
        ...filters,
        projectKeys: [parent.key] // Ensure we only get issues for this project
      };
      
      const whereClause = buildIssueWhereClause(combinedFilters);
      
      return await prisma.issue.findMany({
        where: whereClause,
        orderBy: { created: 'desc' }
      });
    },

    sprints: async (parent: any, _: any, context: any) => {
      return await context.dataloaders.sprintsByProjectLoader.load(parent.id);
    },

    workflowMappings: async (parent: any, _: any, context: any) => {
      return await context.dataloaders.workflowMappingsByProjectLoader.load(parent.id);
    },

    metrics: async (parent: any, _: any, context: any) => {
      return await context.dataloaders.projectMetricsLoader.load(parent.id);
    }
  },

  Issue: {
    project: async (parent: any, _: any, context: any) => {
      return await context.dataloaders.projectLoader.load(parent.projectId);
    },

    sprints: async (parent: any, _: any, context: any) => {
      return await context.dataloaders.sprintsByIssueLoader.load(parent.id);
    },

    statusChanges: async (parent: any, _: any, context: any) => {
      return await context.dataloaders.statusChangesByIssueLoader.load(parent.id);
    },

    parent: async (parent: any, _: any, context: any) => {
      if (!parent.parentKey) return null;
      return await context.dataloaders.issueByKeyLoader.load(parent.parentKey);
    },

    children: async (parent: any, _: any, context: any) => {
      return await context.dataloaders.childrenByParentKeyLoader.load(parent.key);
    },

    metrics: async (parent: any, _: any, context: any) => {
      return await context.dataloaders.issueMetricsLoader.load(parent.id);
    }
  },

  Sprint: {
    project: async (parent: any, _: any, context: any) => {
      return await context.dataloaders.projectLoader.load(parent.projectId);
    },

    issues: async (parent: any) => {
      // Sprint issues require a different approach since we don't have a direct loader
      // This is acceptable as it's not commonly called in nested scenarios
      const issuesSprints = await prisma.issuesSprints.findMany({
        where: { sprintId: parent.id },
        include: { issue: true }
      });
      return issuesSprints.map(is => is.issue);
    }
  }
};