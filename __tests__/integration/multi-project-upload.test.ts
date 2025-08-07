import { ApolloServer } from '@apollo/server';
import { typeDefs } from '../../src/lib/graphql/schema';
import { resolvers } from '../../src/lib/graphql/resolvers';
import { setupTestDatabase, teardownTestDatabase, prisma } from '../setup/test-db';
import { Company } from '@prisma/client';

describe('Multi-Project Upload Integration Tests', () => {
  let testServer: ApolloServer;
  let testCompany: Company;

  beforeAll(async () => {
    await setupTestDatabase();
    testServer = new ApolloServer({
      typeDefs,
      resolvers,
    });
    await testServer.start();
  });

  afterAll(async () => {
    if (testServer) {
      await testServer.stop();
    }
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await setupTestDatabase();
    
    // Create test company for each test with unique name
    testCompany = await prisma.company.create({
      data: {
        name: `Test Company ${Date.now()}`,
        slug: `test-company-${Date.now()}`,
        description: 'A test company for integration tests'
      }
    });
  });

  describe('uploadJiraData Mutation', () => {
    const UPLOAD_JIRA_DATA_MUTATION = `
      mutation UploadJiraData($companyId: ID!, $data: [JiraIssueInput!]!, $workflowMappings: [WorkflowMappingInput!]!) {
        uploadJiraData(companyId: $companyId, data: $data, workflowMappings: $workflowMappings) {
          success
          message
          projectsCreated
          issuesCreated
          sprintsCreated
        }
      }
    `;

    const createMockIssue = (projectKey: string, issueKey: string, options: any = {}) => ({
      jiraId: `${projectKey}-${issueKey}-id`,
      key: `${projectKey}-${issueKey}`,
      summary: `Test issue ${issueKey}`,
      issueType: 'Story',
      priority: 'Medium',
      projectKey,
      created: '2024-01-01T00:00:00Z',
      rawData: { test: true },
      changelogs: [],
      sprintInfo: [],
      ...options,
    });

    const defaultWorkflowMappings = [
      { jiraStatusName: 'To Do', canonicalStage: 'backlog' },
      { jiraStatusName: 'In Progress', canonicalStage: 'in_progress' },
      { jiraStatusName: 'Done', canonicalStage: 'done' },
    ];

    it('should create multiple projects when issues have different project keys', async () => {
      const issues = [
        createMockIssue('PROJ1', '1'),
        createMockIssue('PROJ1', '2'),
        createMockIssue('PROJ2', '1'),
        createMockIssue('PROJ2', '2'),
        createMockIssue('PROJ3', '1'),
      ];

      const response = await testServer.executeOperation({
        query: UPLOAD_JIRA_DATA_MUTATION,
        variables: {
          companyId: testCompany.id,
          data: issues,
          workflowMappings: defaultWorkflowMappings,
        },
      }, {
        contextValue: {
          req: { headers: {}, ip: 'test' }
        }
      });

      expect(response.body.kind).toBe('single');
      const result = (response.body as any).singleResult;
      
      expect(result.errors).toBeUndefined();
      expect(result.data).toBeDefined();
      
      const uploadResult = result.data.uploadJiraData;
      expect(uploadResult.success).toBe(true);
      expect(uploadResult.projectsCreated).toBe(3); // Should create 3 unique projects
      expect(uploadResult.issuesCreated).toBe(5); // Should create 5 issues
      expect(uploadResult.message).toContain('5 issues across 3 projects');

      // Verify projects were created in database
      const projects = await prisma.project.findMany({
        where: { companyId: testCompany.id },
        orderBy: { key: 'asc' },
      });
      expect(projects).toHaveLength(3);
      expect(projects.map(p => p.key)).toEqual(['PROJ1', 'PROJ2', 'PROJ3']);
      
      // Verify issues were assigned to correct projects
      const proj1Issues = await prisma.issue.findMany({
        where: { 
          projectId: projects[0].id,
          companyId: testCompany.id 
        },
      });
      expect(proj1Issues).toHaveLength(2);
      
      const proj2Issues = await prisma.issue.findMany({
        where: { 
          projectId: projects[1].id,
          companyId: testCompany.id 
        },
      });
      expect(proj2Issues).toHaveLength(2);
      
      const proj3Issues = await prisma.issue.findMany({
        where: { 
          projectId: projects[2].id,
          companyId: testCompany.id 
        },
      });
      expect(proj3Issues).toHaveLength(1);
    });

    it('should update existing projects when uploading issues with same project keys', async () => {
      // Create existing project
      await prisma.project.create({
        data: {
          key: 'EXISTING',
          name: 'Existing Project',
          companyId: testCompany.id,
        },
      });

      const issues = [
        createMockIssue('EXISTING', '1'),
        createMockIssue('EXISTING', '2'),
        createMockIssue('NEW', '1'),
      ];

      const response = await testServer.executeOperation({
        query: UPLOAD_JIRA_DATA_MUTATION,
        variables: {
          companyId: testCompany.id,
          data: issues,
          workflowMappings: defaultWorkflowMappings,
        },
      }, {
        contextValue: {
          req: { headers: {}, ip: 'test' }
        }
      });

      const result = (response.body as any).singleResult;
      const uploadResult = result.data.uploadJiraData;
      
      expect(uploadResult.projectsCreated).toBe(1); // Only NEW project should be created
      expect(uploadResult.issuesCreated).toBe(3);

      const projects = await prisma.project.findMany({
        where: { companyId: testCompany.id },
        orderBy: { key: 'asc' },
      });
      expect(projects).toHaveLength(2);
    });

    it('should handle projects with sprints correctly', async () => {
      const issues = [
        createMockIssue('PROJ1', '1', {
          sprintInfo: [
            { name: 'Sprint 1', startDate: '2024-01-01', endDate: '2024-01-14' },
          ],
        }),
        createMockIssue('PROJ1', '2', {
          sprintInfo: [
            { name: 'Sprint 1', startDate: '2024-01-01', endDate: '2024-01-14' },
            { name: 'Sprint 2', startDate: '2024-01-15', endDate: '2024-01-28' },
          ],
        }),
        createMockIssue('PROJ2', '1', {
          sprintInfo: [
            { name: 'Sprint A', startDate: '2024-02-01', endDate: '2024-02-14' },
          ],
        }),
      ];

      const response = await testServer.executeOperation({
        query: UPLOAD_JIRA_DATA_MUTATION,
        variables: {
          companyId: testCompany.id,
          data: issues,
          workflowMappings: defaultWorkflowMappings,
        },
      }, {
        contextValue: {
          req: { headers: {}, ip: 'test' }
        }
      });

      const result = (response.body as any).singleResult;
      const uploadResult = result.data.uploadJiraData;
      
      expect(uploadResult.sprintsCreated).toBe(3); // Sprint 1, Sprint 2, Sprint A
      
      // Verify sprints are associated with correct projects
      const proj1 = await prisma.project.findFirst({
        where: { 
          companyId: testCompany.id,
          key: 'PROJ1' 
        },
        include: { sprints: true },
      });
      expect(proj1?.sprints).toHaveLength(2);
      expect(proj1?.sprints.map(s => s.name).sort()).toEqual(['Sprint 1', 'Sprint 2']);

      const proj2 = await prisma.project.findFirst({
        where: { 
          companyId: testCompany.id,
          key: 'PROJ2' 
        },
        include: { sprints: true },
      });
      expect(proj2?.sprints).toHaveLength(1);
      expect(proj2?.sprints[0].name).toBe('Sprint A');
    });

    it('should apply workflow mappings to each project', async () => {
      const issues = [
        createMockIssue('PROJ1', '1'),
        createMockIssue('PROJ2', '1'),
      ];

      const customMappings = [
        { jiraStatusName: 'Backlog', canonicalStage: 'backlog' },
        { jiraStatusName: 'Development', canonicalStage: 'in_progress' },
        { jiraStatusName: 'Testing', canonicalStage: 'review' },
        { jiraStatusName: 'Complete', canonicalStage: 'done' },
      ];

      await testServer.executeOperation({
        query: UPLOAD_JIRA_DATA_MUTATION,
        variables: {
          companyId: testCompany.id,
          data: issues,
          workflowMappings: customMappings,
        },
      }, {
        contextValue: {
          req: { headers: {}, ip: 'test' }
        }
      });

      // Verify each project has the workflow mappings
      const projects = await prisma.project.findMany({
        where: { companyId: testCompany.id },
        include: { workflowMappings: true },
        orderBy: { key: 'asc' },
      });

      expect(projects).toHaveLength(2);
      
      for (const project of projects) {
        expect(project.workflowMappings).toHaveLength(4);
        expect(project.workflowMappings.map(m => m.jiraStatusName).sort()).toEqual(
          ['Backlog', 'Complete', 'Development', 'Testing']
        );
      }
    });

    it('should handle issues with changelogs', async () => {
      const issues = [
        createMockIssue('PROJ1', '1', {
          changelogs: [
            {
              fieldName: 'status',
              fromString: 'To Do',
              toString: 'In Progress',
              created: '2024-01-05T10:00:00Z',
            },
            {
              fieldName: 'status',
              fromString: 'In Progress',
              toString: 'Done',
              created: '2024-01-10T10:00:00Z',
            },
          ],
        }),
      ];

      await testServer.executeOperation({
        query: UPLOAD_JIRA_DATA_MUTATION,
        variables: {
          companyId: testCompany.id,
          data: issues,
          workflowMappings: defaultWorkflowMappings,
        },
      }, {
        contextValue: {
          req: { headers: {}, ip: 'test' }
        }
      });

      const issue = await prisma.issue.findFirst({
        where: { 
          companyId: testCompany.id,
          key: 'PROJ1-1' 
        },
        include: { statusChanges: true },
      });

      expect(issue?.statusChanges).toHaveLength(2);
      expect(issue?.statusChanges[0].fromValue).toBe('To Do');
      expect(issue?.statusChanges[0].toValue).toBe('In Progress');
      expect(issue?.statusChanges[1].fromValue).toBe('In Progress');
      expect(issue?.statusChanges[1].toValue).toBe('Done');
    });

    it('should handle empty or invalid data gracefully', async () => {
      // Test with empty array
      const emptyResponse = await testServer.executeOperation({
        query: UPLOAD_JIRA_DATA_MUTATION,
        variables: {
          companyId: testCompany.id,
          data: [],
          workflowMappings: defaultWorkflowMappings,
        },
      }, {
        contextValue: {
          req: { headers: {}, ip: 'test' }
        }
      });

      const emptyResult = (emptyResponse.body as any).singleResult;
      expect(emptyResult.data.uploadJiraData.success).toBe(true);
      expect(emptyResult.data.uploadJiraData.projectsCreated).toBe(0);
      expect(emptyResult.data.uploadJiraData.issuesCreated).toBe(0);
    });

    it('should handle transaction timeout for large uploads', async () => {
      // Create a large number of issues to test timeout handling
      const largeDataSet = Array.from({ length: 1000 }, (_, i) => 
        createMockIssue(`PROJ${Math.floor(i / 100)}`, `${i}`)
      );

      const response = await testServer.executeOperation({
        query: UPLOAD_JIRA_DATA_MUTATION,
        variables: {
          companyId: testCompany.id,
          data: largeDataSet,
          workflowMappings: defaultWorkflowMappings,
        },
      }, {
        contextValue: {
          req: { headers: {}, ip: 'test' }
        }
      });

      const result = (response.body as any).singleResult;
      
      // With 60 second timeout, this should succeed
      expect(result.errors).toBeUndefined();
      expect(result.data.uploadJiraData.success).toBe(true);
      expect(result.data.uploadJiraData.projectsCreated).toBe(10); // PROJ0 through PROJ9
      expect(result.data.uploadJiraData.issuesCreated).toBe(1000);
    });

    it('should handle duplicate issue keys within same upload', async () => {
      const issues = [
        createMockIssue('PROJ1', '1'),
        createMockIssue('PROJ1', '1'), // Duplicate
        createMockIssue('PROJ1', '2'),
      ];

      const response = await testServer.executeOperation({
        query: UPLOAD_JIRA_DATA_MUTATION,
        variables: {
          companyId: testCompany.id,
          data: issues,
          workflowMappings: defaultWorkflowMappings,
        },
      }, {
        contextValue: {
          req: { headers: {}, ip: 'test' }
        }
      });

      const result = (response.body as any).singleResult;
      expect(result.data.uploadJiraData.success).toBe(true);
      expect(result.data.uploadJiraData.issuesCreated).toBe(2); // Should upsert, not duplicate

      const dbIssues = await prisma.issue.findMany({
        where: { companyId: testCompany.id }
      });
      expect(dbIssues).toHaveLength(2);
    });

    it('should correctly import issue types from various data formats', async () => {
      // Test different issue type data structures that might come from different JIRA exports
      const issuesWithDifferentFormats = [
        // Standard JIRA API format
        {
          jiraId: 'API-1-id',
          key: 'API-1',
          summary: 'Standard API format issue',
          issueType: 'Story', // Direct issueType field (camelCase)
          priority: 'High',
          projectKey: 'API',
          created: '2024-01-01T00:00:00Z',
          rawData: { 
            fields: { 
              issuetype: { name: 'Story' } // Standard JIRA fields structure
            } 
          },
          changelogs: [],
          sprintInfo: []
        },
        // Snake case format (like user's actual data)
        {
          jiraId: 'SNAKE-1-id',
          key: 'SNAKE-1',
          summary: 'Snake case format issue',
          issueType: 'Task', // This should come from rawData processing, not direct field
          priority: 'Medium',
          projectKey: 'SNAKE',
          created: '2024-01-01T00:00:00Z',
          rawData: {
            issue_type: 'Task', // Snake case format
            summary: 'Snake case format issue',
            key: 'SNAKE-1'
          },
          changelogs: [],
          sprintInfo: []
        },
        // Alternative format
        {
          jiraId: 'ALT-1-id',
          key: 'ALT-1',
          summary: 'Alternative format issue',
          issueType: 'Bug',
          priority: 'Critical',
          projectKey: 'ALT',
          created: '2024-01-01T00:00:00Z',
          rawData: {
            type: 'Bug' // Alternative type field
          },
          changelogs: [],
          sprintInfo: []
        },
        // Missing issue type (should default to Unknown)
        {
          jiraId: 'MISSING-1-id',
          key: 'MISSING-1',
          summary: 'Missing issue type',
          issueType: 'Unknown', // Should default to Unknown
          priority: 'Low',
          projectKey: 'MISSING',
          created: '2024-01-01T00:00:00Z',
          rawData: {},
          changelogs: [],
          sprintInfo: []
        }
      ];

      const response = await testServer.executeOperation({
        query: UPLOAD_JIRA_DATA_MUTATION,
        variables: {
          companyId: testCompany.id,
          data: issuesWithDifferentFormats,
          workflowMappings: defaultWorkflowMappings,
        },
      }, {
        contextValue: {
          req: { headers: {}, ip: 'test' }
        }
      });

      const result = (response.body as any).singleResult;
      expect(result.errors).toBeUndefined();
      expect(result.data.uploadJiraData.success).toBe(true);
      expect(result.data.uploadJiraData.issuesCreated).toBe(4);

      // Verify the issue types were stored correctly
      const issues = await prisma.issue.findMany({
        where: { companyId: testCompany.id },
        orderBy: { key: 'asc' }
      });

      expect(issues).toHaveLength(4);
      
      const apiIssue = issues.find(i => i.key === 'API-1');
      expect(apiIssue?.issueType).toBe('Story');
      
      const snakeIssue = issues.find(i => i.key === 'SNAKE-1');
      expect(snakeIssue?.issueType).toBe('Task'); // Should correctly read from snake_case
      
      const altIssue = issues.find(i => i.key === 'ALT-1');
      expect(altIssue?.issueType).toBe('Bug');
      
      const missingIssue = issues.find(i => i.key === 'MISSING-1');
      expect(missingIssue?.issueType).toBe('Unknown'); // Should default to Unknown
    });
  });
});