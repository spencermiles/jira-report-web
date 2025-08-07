import { ApolloServer } from '@apollo/server';
import { typeDefs } from '@/lib/graphql/schema';
import { resolvers } from '@/lib/graphql/resolvers';
import { prisma } from '@/lib/db';
import { Company, Project, Issue } from '@prisma/client';

// Helper function to create test context
const createTestContext = () => ({
  req: {
    headers: {
      'x-forwarded-for': '127.0.0.1'
    },
    ip: '127.0.0.1'
  }
});

describe('Multi-Tenant GraphQL Resolvers', () => {
  let server: ApolloServer;
  let company1: Company;
  let company2: Company;
  let project1: Project;
  let project2: Project;
  let issue1: Issue;
  let issue2: Issue;

  beforeAll(async () => {
    server = new ApolloServer({
      typeDefs,
      resolvers,
    });

    // Clean up test data
    await prisma.issue.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.company.deleteMany({
      where: { slug: { notIn: ['default-organization'] } }
    });

    // Create test companies
    company1 = await prisma.company.create({
      data: {
        name: 'Company One',
        slug: 'company-one',
        description: 'First test company'
      }
    });

    company2 = await prisma.company.create({
      data: {
        name: 'Company Two',
        slug: 'company-two',
        description: 'Second test company'
      }
    });

    // Create test projects
    project1 = await prisma.project.create({
      data: {
        key: 'PROJ1',
        name: 'Project One',
        companyId: company1.id
      }
    });

    project2 = await prisma.project.create({
      data: {
        key: 'PROJ2',
        name: 'Project Two',
        companyId: company2.id
      }
    });

    // Create test issues
    issue1 = await prisma.issue.create({
      data: {
        jiraId: 'PROJ1-1',
        key: 'PROJ1-1',
        summary: 'Issue in Company One',
        issueType: 'Story',
        projectId: project1.id,
        companyId: company1.id,
        created: new Date(),
        rawData: { company: 'one' }
      }
    });

    issue2 = await prisma.issue.create({
      data: {
        jiraId: 'PROJ2-1',
        key: 'PROJ2-1',
        summary: 'Issue in Company Two',
        issueType: 'Bug',
        projectId: project2.id,
        companyId: company2.id,
        created: new Date(),
        rawData: { company: 'two' }
      }
    });
  });

  afterAll(async () => {
    await prisma.issue.deleteMany({ where: { companyId: { in: [company1.id, company2.id] } } });
    await prisma.project.deleteMany({ where: { companyId: { in: [company1.id, company2.id] } } });
    await prisma.company.deleteMany({ where: { id: { in: [company1.id, company2.id] } } });
    await prisma.$disconnect();
  });

  describe('Company Queries', () => {
    it('should list all active companies', async () => {
      const response = await server.executeOperation({
        query: `
          query GetCompanies($pagination: PaginationInput) {
            companies(pagination: $pagination) {
              companies {
                id
                name
                slug
                description
                isActive
              }
              totalCount
              hasNextPage
              hasPreviousPage
            }
          }
        `,
        variables: { pagination: { limit: 10, offset: 0 } }
      }, { contextValue: createTestContext() });

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        const companies = response.body.singleResult.data?.companies.companies;
        expect(companies).toBeDefined();
        expect(companies.length).toBeGreaterThanOrEqual(2);
        
        const companyNames = companies.map((c: any) => c.name);
        expect(companyNames).toContain('Company One');
        expect(companyNames).toContain('Company Two');
      }
    });

    it('should get company by ID', async () => {
      const response = await server.executeOperation({
        query: `
          query GetCompany($id: ID) {
            company(id: $id) {
              id
              name
              slug
              description
              isActive
            }
          }
        `,
        variables: { id: company1.id }
      }, { contextValue: createTestContext() });

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        const company = response.body.singleResult.data?.company;
        expect(company).toBeDefined();
        expect(company.id).toBe(company1.id);
        expect(company.name).toBe('Company One');
        expect(company.slug).toBe('company-one');
      }
    });

    it('should get company by slug', async () => {
      const response = await server.executeOperation({
        query: `
          query GetCompany($slug: String) {
            company(slug: $slug) {
              id
              name
              slug
              description
              isActive
            }
          }
        `,
        variables: { slug: company2.slug }
}, { contextValue: createTestContext() });

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        const company = response.body.singleResult.data?.company;
        expect(company).toBeDefined();
        expect(company.id).toBe(company2.id);
        expect(company.name).toBe('Company Two');
        expect(company.slug).toBe('company-two');
      }
    });

    it('should return error for non-existent company', async () => {
      const response = await server.executeOperation({
        query: `
          query GetCompany($id: ID) {
            company(id: $id) {
              id
              name
            }
          }
        `,
        variables: { id: 'non-existent-id' }
}, { contextValue: createTestContext() });

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeDefined();
        expect(response.body.singleResult.errors?.[0].message).toContain('not found');
      }
    });

    it('should require either ID or slug for company query', async () => {
      const response = await server.executeOperation({
        query: `
          query GetCompany {
            company {
              id
              name
            }
          }
        `
}, { contextValue: createTestContext() });

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeDefined();
        expect(response.body.singleResult.errors?.[0].message).toContain('Either company ID or slug is required');
      }
    });
  });

  describe('Company-Scoped Project Queries', () => {
    it('should get projects for specific company only', async () => {
      const response = await server.executeOperation({
        query: `
          query GetProjects($companyId: ID!) {
            projects(companyId: $companyId) {
              id
              key
              name
              companyId
            }
          }
        `,
        variables: { companyId: company1.id }
}, { contextValue: createTestContext() });

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        const projects = response.body.singleResult.data?.projects;
        expect(projects).toBeDefined();
        expect(projects.length).toBe(1);
        expect(projects[0].key).toBe('PROJ1');
        expect(projects[0].companyId).toBe(company1.id);
      }
    });

    it('should get specific project by company and key', async () => {
      const response = await server.executeOperation({
        query: `
          query GetProject($companyId: ID!, $key: String!) {
            project(companyId: $companyId, key: $key) {
              id
              key
              name
              companyId
            }
          }
        `,
        variables: { 
          companyId: company2.id, 
          key: 'PROJ2' 
        }
}, { contextValue: createTestContext() });

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        const project = response.body.singleResult.data?.project;
        expect(project).toBeDefined();
        expect(project.key).toBe('PROJ2');
        expect(project.companyId).toBe(company2.id);
      }
    });

    it('should not find project from different company', async () => {
      const response = await server.executeOperation({
        query: `
          query GetProject($companyId: ID!, $key: String!) {
            project(companyId: $companyId, key: $key) {
              id
              key
              name
            }
          }
        `,
        variables: { 
          companyId: company1.id, 
          key: 'PROJ2' // PROJ2 belongs to company2
        }
}, { contextValue: createTestContext() });

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeDefined();
        expect(response.body.singleResult.errors?.[0].message).toContain('not found');
      }
    });

    it('should require companyId for project queries', async () => {
      const response = await server.executeOperation({
        query: `
          query GetProjects {
            projects {
              id
              key
              name
            }
          }
        `
}, { contextValue: createTestContext() });

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeDefined();
        // Should have validation error about missing companyId
      }
    });
  });

  describe('Company-Scoped Issue Queries', () => {
    it('should get issues for specific company only', async () => {
      const response = await server.executeOperation({
        query: `
          query GetIssues($companyId: ID!, $pagination: PaginationInput) {
            issues(companyId: $companyId, pagination: $pagination) {
              issues {
                id
                key
                summary
                companyId
              }
              totalCount
            }
          }
        `,
        variables: { 
          companyId: company1.id,
          pagination: { limit: 10, offset: 0 }
        }
}, { contextValue: createTestContext() });

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        const result = response.body.singleResult.data?.issues;
        expect(result).toBeDefined();
        expect(result.issues.length).toBe(1);
        expect(result.issues[0].key).toBe('PROJ1-1');
        expect(result.issues[0].companyId).toBe(company1.id);
        expect(result.totalCount).toBe(1);
      }
    });

    it('should get specific issue by company and key', async () => {
      const response = await server.executeOperation({
        query: `
          query GetIssue($companyId: ID!, $key: String!) {
            issue(companyId: $companyId, key: $key) {
              id
              key
              summary
              companyId
            }
          }
        `,
        variables: { 
          companyId: company2.id, 
          key: 'PROJ2-1' 
        }
}, { contextValue: createTestContext() });

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        const issue = response.body.singleResult.data?.issue;
        expect(issue).toBeDefined();
        expect(issue.key).toBe('PROJ2-1');
        expect(issue.companyId).toBe(company2.id);
        expect(issue.summary).toBe('Issue in Company Two');
      }
    });

    it('should not find issue from different company', async () => {
      const response = await server.executeOperation({
        query: `
          query GetIssue($companyId: ID!, $key: String!) {
            issue(companyId: $companyId, key: $key) {
              id
              key
              summary
            }
          }
        `,
        variables: { 
          companyId: company1.id, 
          key: 'PROJ2-1' // PROJ2-1 belongs to company2
        }
}, { contextValue: createTestContext() });

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeDefined();
        expect(response.body.singleResult.errors?.[0].message).toContain('not found');
      }
    });

    it('should filter issues by company in advanced filters', async () => {
      const response = await server.executeOperation({
        query: `
          query GetIssues($companyId: ID!, $filters: IssueFilters) {
            issues(companyId: $companyId, filters: $filters) {
              issues {
                id
                key
                issueType
                companyId
              }
              totalCount
            }
          }
        `,
        variables: { 
          companyId: company2.id,
          filters: {
            issueTypes: ['Bug']
          }
        }
}, { contextValue: createTestContext() });

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeUndefined();
        const result = response.body.singleResult.data?.issues;
        expect(result).toBeDefined();
        expect(result.issues.length).toBe(1);
        expect(result.issues[0].key).toBe('PROJ2-1');
        expect(result.issues[0].issueType).toBe('Bug');
        expect(result.issues[0].companyId).toBe(company2.id);
      }
    });
  });

  describe('Data Isolation Verification', () => {
    it('should ensure complete data isolation between companies', async () => {
      // Get all data for company1
      const company1Response = await server.executeOperation({
        query: `
          query GetCompanyData($companyId: ID!) {
            projects(companyId: $companyId) {
              id
              key
              companyId
            }
            issues(companyId: $companyId) {
              issues {
                id
                key
                companyId
              }
            }
          }
        `,
        variables: { companyId: company1.id }
}, { contextValue: createTestContext() });

      // Get all data for company2
      const company2Response = await server.executeOperation({
        query: `
          query GetCompanyData($companyId: ID!) {
            projects(companyId: $companyId) {
              id
              key
              companyId
            }
            issues(companyId: $companyId) {
              issues {
                id
                key
                companyId
              }
            }
          }
        `,
        variables: { companyId: company2.id }
}, { contextValue: createTestContext() });

      expect(company1Response.body.kind).toBe('single');
      expect(company2Response.body.kind).toBe('single');

      if (company1Response.body.kind === 'single' && company2Response.body.kind === 'single') {
        const company1Data = company1Response.body.singleResult.data;
        const company2Data = company2Response.body.singleResult.data;

        // Verify no cross-contamination
        expect(company1Data?.projects.every((p: any) => p.companyId === company1.id)).toBe(true);
        expect(company1Data?.issues.issues.every((i: any) => i.companyId === company1.id)).toBe(true);
        
        expect(company2Data?.projects.every((p: any) => p.companyId === company2.id)).toBe(true);
        expect(company2Data?.issues.issues.every((i: any) => i.companyId === company2.id)).toBe(true);

        // Verify separate data
        const company1ProjectKeys = company1Data?.projects.map((p: any) => p.key) || [];
        const company2ProjectKeys = company2Data?.projects.map((p: any) => p.key) || [];
        expect(company1ProjectKeys).not.toEqual(company2ProjectKeys);

        const company1IssueKeys = company1Data?.issues.issues.map((i: any) => i.key) || [];
        const company2IssueKeys = company2Data?.issues.issues.map((i: any) => i.key) || [];
        expect(company1IssueKeys).not.toEqual(company2IssueKeys);
      }
    });
  });

  describe('Company Access Validation', () => {
    it('should validate company exists and is active', async () => {
      // Test with non-existent company ID
      const response = await server.executeOperation({
        query: `
          query GetProjects($companyId: ID!) {
            projects(companyId: $companyId) {
              id
              key
            }
          }
        `,
        variables: { companyId: 'non-existent-company' }
}, { contextValue: createTestContext() });

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeDefined();
        expect(response.body.singleResult.errors?.[0].message).toContain('not found');
      }
    });

    it('should validate company is active', async () => {
      // Deactivate company
      await prisma.company.update({
        where: { id: company1.id },
        data: { isActive: false }
});

      const response = await server.executeOperation({
        query: `
          query GetProjects($companyId: ID!) {
            projects(companyId: $companyId) {
              id
              key
            }
          }
        `,
        variables: { companyId: company1.id }
}, { contextValue: createTestContext() });

      expect(response.body.kind).toBe('single');
      if (response.body.kind === 'single') {
        expect(response.body.singleResult.errors).toBeDefined();
        expect(response.body.singleResult.errors?.[0].message).toContain('not found');
      }

      // Reactivate for cleanup
      await prisma.company.update({
        where: { id: company1.id },
        data: { isActive: true }
});
    });
  });
});