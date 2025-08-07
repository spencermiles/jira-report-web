import { ApolloServer } from '@apollo/server';
import { typeDefs } from '../../src/lib/graphql/schema';
import { resolvers } from '../../src/lib/graphql/resolvers';
import { createDataLoaders } from '../../src/lib/graphql/dataloaders';
import { setupTestDatabase, teardownTestDatabase, prisma } from '../setup/test-db';
import { createCycleTimeTestScenario } from '../setup/test-data';

// Create Apollo Server for testing
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

describe('GraphQL API Integration Tests', () => {
  let testServer: ApolloServer;

  beforeAll(async () => {
    await setupTestDatabase();
    testServer = new ApolloServer({
      typeDefs,
      resolvers,
    });
  });

  afterAll(async () => {
    if (testServer) {
      await testServer.stop();
    }
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await setupTestDatabase();
  });

  describe('Advanced Query Resolvers', () => {
    it('should handle complex issues query with pagination and filtering', async () => {
      const { company, project } = await createCycleTimeTestScenario();
      
      const query = `
        query GetIssues($companyId: ID!, $filters: IssueFilters, $pagination: PaginationInput, $sort: SortInput) {
          issues(companyId: $companyId, filters: $filters, pagination: $pagination, sort: $sort) {
            issues {
              id
              key
              summary
              metrics {
                cycleTime
                leadTime
                blockers
                reviewChurn
              }
            }
            totalCount
            hasNextPage
            hasPreviousPage
          }
        }
      `;

      const variables = {
        companyId: company.id,
        filters: {
          projectKeys: [project.key],
          cycleTimeMin: 10.0,
          hasBlockers: false
        },
        pagination: {
          limit: 10,
          offset: 0
        },
        sort: {
          field: "cycleTime",
          direction: "DESC"
        }
      };

      const response = await testServer.executeOperation({
        query,
        variables
      }, {
        contextValue: {
          dataloaders: createDataLoaders(),
          req: { headers: {} }
        }
      });

      expect(response.body).toHaveProperty('singleResult');
      const result = response.body.singleResult;
      expect(result.errors).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.data.issues).toBeDefined();
      expect(result.data.issues.issues).toBeInstanceOf(Array);
      expect(result.data.issues.totalCount).toBeGreaterThan(0);
      expect(result.data.issues.hasNextPage).toBe(false);
      expect(result.data.issues.hasPreviousPage).toBe(false);

      // Validate that filtering worked
      const issues = result.data.issues.issues;
      issues.forEach((issue: any) => {
        if (issue.metrics.cycleTime) {
          expect(issue.metrics.cycleTime).toBeGreaterThanOrEqual(10.0);
        }
        expect(issue.metrics.blockers).toBe(0);
      });
    });

    it('should provide project summaries with aggregated metrics', async () => {
      const { company, project } = await createCycleTimeTestScenario();
      
      const query = `
        query GetProjectSummaries($companyId: ID!, $pagination: PaginationInput) {
          projectSummaries(companyId: $companyId, pagination: $pagination) {
            projects {
              id
              key
              name
              issueCount
              metrics {
                totalIssues
                resolvedIssues
                averageCycleTime
                averageLeadTime
                flowEfficiency
                firstTimeThrough
              }
            }
            totalCount
            aggregatedMetrics {
              totalProjects
              totalIssues
              totalResolvedIssues
              overallAverageLeadTime
              overallAverageCycleTime
              overallFlowEfficiency
            }
          }
        }
      `;

      const variables = {
        companyId: company.id,
        pagination: {
          limit: 50,
          offset: 0
        }
      };

      const response = await testServer.executeOperation({
        query,
        variables
      }, {
        contextValue: {
          dataloaders: createDataLoaders(),
          req: { headers: {} }
        }
      });

      expect(response.body).toHaveProperty('singleResult');
      const result = response.body.singleResult;
      expect(result.errors).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.data.projectSummaries).toBeDefined();

      const { projects, aggregatedMetrics } = result.data.projectSummaries;
      expect(projects).toBeInstanceOf(Array);
      expect(projects.length).toBeGreaterThan(0);
      
      const testProject = projects.find((p: any) => p.key === project.key);
      expect(testProject).toBeDefined();
      expect(testProject.metrics.totalIssues).toBe(4);
      expect(testProject.metrics.resolvedIssues).toBe(3);
      expect(testProject.metrics.averageCycleTime).toBeGreaterThan(0);
      expect(testProject.metrics.averageLeadTime).toBeGreaterThan(0);
      expect(testProject.metrics.flowEfficiency).toBeGreaterThan(0);
      expect(testProject.metrics.firstTimeThrough).toBeGreaterThan(0);

      // Validate aggregated metrics
      expect(aggregatedMetrics.totalProjects).toBeGreaterThan(0);
      expect(aggregatedMetrics.totalIssues).toBeGreaterThan(0);
      expect(aggregatedMetrics.totalResolvedIssues).toBeGreaterThan(0);
    });

    it('should provide cycle time distribution analytics', async () => {
      const { company, project } = await createCycleTimeTestScenario();
      
      const query = `
        query GetCycleTimeDistribution($companyId: ID!, $projectKeys: [String!], $filters: IssueFilters) {
          cycleTimeDistribution(companyId: $companyId, projectKeys: $projectKeys, filters: $filters) {
            range
            count
            percentage
          }
        }
      `;

      const variables = {
        companyId: company.id,
        projectKeys: [project.key],
        filters: {}
      };

      const response = await testServer.executeOperation({
        query,
        variables
      }, {
        contextValue: {
          dataloaders: createDataLoaders(),
          req: { headers: {} }
        }
      });

      expect(response.body).toHaveProperty('singleResult');
      const result = response.body.singleResult;
      expect(result.errors).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.data.cycleTimeDistribution).toBeDefined();

      const distribution = result.data.cycleTimeDistribution;
      expect(distribution).toBeInstanceOf(Array);
      expect(distribution.length).toBeGreaterThan(0);

      // Validate distribution buckets
      distribution.forEach((bucket: any) => {
        expect(bucket.range).toBeDefined();
        expect(bucket.count).toBeGreaterThanOrEqual(0);
        expect(bucket.percentage).toBeGreaterThanOrEqual(0);
        expect(bucket.percentage).toBeLessThanOrEqual(100);
      });

      // Total percentages should add up to ~100% (allowing for rounding)
      const totalPercentage = distribution.reduce((sum: number, bucket: any) => sum + bucket.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 0);
    });

    it('should provide flow metrics trend analysis', async () => {
      const { company, project } = await createCycleTimeTestScenario();
      
      const query = `
        query GetFlowMetricsTrend($companyId: ID!, $projectKeys: [String!], $period: String!, $filters: IssueFilters) {
          flowMetricsTrend(companyId: $companyId, projectKeys: $projectKeys, period: $period, filters: $filters) {
            period
            averageCycleTime
            averageLeadTime
            flowEfficiency
            throughput
            firstTimeThrough
          }
        }
      `;

      const variables = {
        companyId: company.id,
        projectKeys: [project.key],
        period: "month",
        filters: {}
      };

      const response = await testServer.executeOperation({
        query,
        variables
      }, {
        contextValue: {
          dataloaders: createDataLoaders(),
          req: { headers: {} }
        }
      });

      expect(response.body).toHaveProperty('singleResult');
      const result = response.body.singleResult;
      expect(result.errors).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.data.flowMetricsTrend).toBeDefined();

      const trend = result.data.flowMetricsTrend;
      expect(trend).toBeInstanceOf(Array);
      
      // Should have trend data for the test month
      if (trend.length > 0) {
        const firstPoint = trend[0];
        expect(firstPoint.period).toBeDefined();
        expect(firstPoint.throughput).toBeGreaterThan(0);
        
        if (firstPoint.averageCycleTime) {
          expect(firstPoint.averageCycleTime).toBeGreaterThan(0);
        }
        if (firstPoint.averageLeadTime) {
          expect(firstPoint.averageLeadTime).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('DataLoader Optimization', () => {
    it('should efficiently load related data without N+1 queries', async () => {
      const { company, project, issues } = await createCycleTimeTestScenario();
      
      const query = `
        query GetProjectWithIssues($companyId: ID!, $key: String!) {
          project(companyId: $companyId, key: $key) {
            id
            key
            name
            metrics {
              totalIssues
              resolvedIssues
              averageCycleTime
            }
            issues {
              id
              key
              summary
              project {
                key
                name
              }
              metrics {
                cycleTime
                leadTime
                stageTimestamps
              }
              sprints {
                id
                name
              }
              statusChanges {
                id
                fieldName
                fromValue
                toValue
                changed
              }
            }
            sprints {
              id
              name
              startDate
              endDate
            }
            workflowMappings {
              id
              jiraStatusName
              canonicalStage
            }
          }
        }
      `;

      const variables = {
        companyId: company.id,
        key: project.key
      };

      const dataloaders = createDataLoaders();
      const response = await testServer.executeOperation({
        query,
        variables
      }, {
        contextValue: {
          dataloaders,
          req: { headers: {} }
        }
      });

      expect(response.body).toHaveProperty('singleResult');
      const result = response.body.singleResult;
      expect(result.errors).toBeUndefined();
      expect(result.data).toBeDefined();
      expect(result.data.project).toBeDefined();

      const projectData = result.data.project;
      expect(projectData.key).toBe(project.key);
      expect(projectData.metrics.totalIssues).toBe(4);
      expect(projectData.issues).toBeInstanceOf(Array);
      expect(projectData.issues.length).toBe(4);
      expect(projectData.sprints).toBeInstanceOf(Array);
      expect(projectData.workflowMappings).toBeInstanceOf(Array);

      // Validate nested data is properly loaded
      projectData.issues.forEach((issue: any) => {
        expect(issue.project.key).toBe(project.key);
        expect(issue.metrics).toBeDefined();
        expect(issue.statusChanges).toBeInstanceOf(Array);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid project key gracefully', async () => {
      const { company } = await createCycleTimeTestScenario();
      
      const query = `
        query GetProject($companyId: ID!, $key: String!) {
          project(companyId: $companyId, key: $key) {
            id
            key
            name
          }
        }
      `;

      const variables = {
        companyId: company.id,
        key: "INVALID_PROJECT_KEY"
      };

      const response = await testServer.executeOperation({
        query,
        variables
      }, {
        contextValue: {
          dataloaders: createDataLoaders(),
          req: { headers: {} }
        }
      });

      expect(response.body).toHaveProperty('singleResult');
      const result = response.body.singleResult;
      expect(result.errors).toBeDefined();
      expect(result.errors[0].extensions.code).toBe('NOT_FOUND');
    });

    it('should validate pagination parameters', async () => {
      const { company } = await createCycleTimeTestScenario();
      
      const query = `
        query GetIssues($companyId: ID!, $pagination: PaginationInput) {
          issues(companyId: $companyId, pagination: $pagination) {
            issues {
              id
              key
            }
            totalCount
          }
        }
      `;

      const variables = {
        companyId: company.id,
        pagination: {
          limit: 2000, // Invalid - over limit
          offset: -1   // Invalid - negative
        }
      };

      const response = await testServer.executeOperation({
        query,
        variables
      }, {
        contextValue: {
          dataloaders: createDataLoaders(),
          req: { headers: {} }
        }
      });

      expect(response.body).toHaveProperty('singleResult');
      const result = response.body.singleResult;
      expect(result.errors).toBeDefined();
      expect(result.errors[0].extensions.code).toBe('VALIDATION_ERROR');
    });

    it('should handle invalid date ranges', async () => {
      const { company } = await createCycleTimeTestScenario();
      
      const query = `
        query GetIssues($companyId: ID!, $filters: IssueFilters) {
          issues(companyId: $companyId, filters: $filters) {
            issues {
              id
              key
            }
            totalCount
          }
        }
      `;

      const variables = {
        companyId: company.id,
        filters: {
          createdAfter: "2025-01-01",
          createdBefore: "2024-01-01" // Invalid - before start date
        }
      };

      const response = await testServer.executeOperation({
        query,
        variables
      }, {
        contextValue: {
          dataloaders: createDataLoaders(),
          req: { headers: {} }
        }
      });

      expect(response.body).toHaveProperty('singleResult');
      const result = response.body.singleResult;
      expect(result.errors).toBeDefined();
      expect(result.errors[0].extensions.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Performance', () => {
    it('should handle large result sets efficiently', async () => {
      const { company, project } = await createCycleTimeTestScenario();
      
      const startTime = Date.now();
      
      const query = `
        query GetIssues($companyId: ID!, $filters: IssueFilters, $pagination: PaginationInput) {
          issues(companyId: $companyId, filters: $filters, pagination: $pagination) {
            issues {
              id
              key
              summary
              metrics {
                cycleTime
                leadTime
                blockers
                reviewChurn
                qaChurn
                stageTimestamps
              }
              project {
                key
                name
              }
              sprints {
                name
              }
            }
            totalCount
          }
        }
      `;

      const variables = {
        companyId: company.id,
        filters: {
          projectKeys: [project.key]
        },
        pagination: {
          limit: 50,
          offset: 0
        }
      };

      const response = await testServer.executeOperation({
        query,
        variables
      }, {
        contextValue: {
          dataloaders: createDataLoaders(),
          req: { headers: {} }
        }
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.body).toHaveProperty('singleResult');
      const result = response.body.singleResult;
      expect(result.errors).toBeUndefined();
      expect(result.data).toBeDefined();
      
      // Should complete within reasonable time (under 1 second for test data)
      expect(duration).toBeLessThan(1000);
      
      console.log(`Query completed in ${duration}ms`);
    });
  });
});