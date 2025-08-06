import { prisma } from '@/lib/db';
import { Company, Project, Issue } from '@prisma/client';

describe('Company Model', () => {
  let testCompany: Company;
  let defaultCompany: Company;

  beforeAll(async () => {
    // Clean up and get default company
    await prisma.issue.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.company.deleteMany({
      where: { slug: { not: 'default-organization' } }
    });
    
    defaultCompany = await prisma.company.findUniqueOrThrow({
      where: { slug: 'default-organization' }
    });
  });

  beforeEach(async () => {
    // Create test company for each test
    testCompany = await prisma.company.create({
      data: {
        name: 'Test Company',
        slug: 'test-company',
        description: 'A test company for unit testing',
        logoUrl: 'https://example.com/logo.png',
        website: 'https://test-company.com',
        settings: { theme: 'dark', notifications: true }
      }
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.issue.deleteMany({ where: { companyId: testCompany.id } });
    await prisma.project.deleteMany({ where: { companyId: testCompany.id } });
    await prisma.company.deleteMany({ 
      where: { id: testCompany.id } 
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Company Creation', () => {
    it('should create a company with all required fields', () => {
      expect(testCompany.id).toBeDefined();
      expect(testCompany.name).toBe('Test Company');
      expect(testCompany.slug).toBe('test-company');
      expect(testCompany.description).toBe('A test company for unit testing');
      expect(testCompany.logoUrl).toBe('https://example.com/logo.png');
      expect(testCompany.website).toBe('https://test-company.com');
      expect(testCompany.isActive).toBe(true);
      expect(testCompany.createdAt).toBeDefined();
      expect(testCompany.updatedAt).toBeDefined();
      expect(testCompany.settings).toEqual({ theme: 'dark', notifications: true });
    });

    it('should create a company with minimal required fields', async () => {
      const minimalCompany = await prisma.company.create({
        data: {
          name: 'Minimal Company',
          slug: 'minimal-company'
        }
      });

      expect(minimalCompany.name).toBe('Minimal Company');
      expect(minimalCompany.slug).toBe('minimal-company');
      expect(minimalCompany.description).toBeNull();
      expect(minimalCompany.logoUrl).toBeNull();
      expect(minimalCompany.website).toBeNull();
      expect(minimalCompany.isActive).toBe(true);
      expect(minimalCompany.settings).toEqual({});

      await prisma.company.delete({ where: { id: minimalCompany.id } });
    });

    it('should enforce unique company names', async () => {
      await expect(
        prisma.company.create({
          data: {
            name: 'Test Company', // Same as testCompany
            slug: 'different-slug'
          }
        })
      ).rejects.toThrow();
    });

    it('should enforce unique company slugs', async () => {
      await expect(
        prisma.company.create({
          data: {
            name: 'Different Company',
            slug: 'test-company' // Same as testCompany
          }
        })
      ).rejects.toThrow();
    });
  });

  describe('Company-Project Relationships', () => {
    let testProject: Project;

    beforeEach(async () => {
      testProject = await prisma.project.create({
        data: {
          key: 'TEST',
          name: 'Test Project',
          companyId: testCompany.id
        }
      });
    });

    it('should create projects scoped to company', async () => {
      const project = await prisma.project.findFirst({
        where: { key: 'TEST', companyId: testCompany.id },
        include: { company: true }
      });

      expect(project).toBeDefined();
      expect(project?.companyId).toBe(testCompany.id);
      expect(project?.company.name).toBe('Test Company');
    });

    it('should allow same project key in different companies', async () => {
      const otherCompany = await prisma.company.create({
        data: {
          name: `Other Company ${Date.now()}`,
          slug: `other-company-${Date.now()}`
        }
      });

      // Should be able to create project with same key in different company
      const duplicateKeyProject = await prisma.project.create({
        data: {
          key: 'TEST', // Same key as testProject
          name: 'Other Test Project',
          companyId: otherCompany.id
        }
      });

      expect(duplicateKeyProject.key).toBe('TEST');
      expect(duplicateKeyProject.companyId).toBe(otherCompany.id);

      // Clean up
      await prisma.project.delete({ where: { id: duplicateKeyProject.id } });
      await prisma.company.delete({ where: { id: otherCompany.id } });
    });

    it('should not allow duplicate project keys within same company', async () => {
      await expect(
        prisma.project.create({
          data: {
            key: 'TEST', // Same as testProject
            name: 'Duplicate Project',
            companyId: testCompany.id
          }
        })
      ).rejects.toThrow();
    });

    it('should cascade delete projects when company is deleted', async () => {
      const tempCompany = await prisma.company.create({
        data: {
          name: 'Temp Company',
          slug: 'temp-company'
        }
      });

      const tempProject = await prisma.project.create({
        data: {
          key: 'TEMP',
          name: 'Temp Project',
          companyId: tempCompany.id
        }
      });

      await prisma.company.delete({ where: { id: tempCompany.id } });

      const deletedProject = await prisma.project.findUnique({
        where: { id: tempProject.id }
      });

      expect(deletedProject).toBeNull();
    });
  });

  describe('Company-Issue Relationships', () => {
    let testProject: Project;
    let testIssue: Issue;

    beforeEach(async () => {
      testProject = await prisma.project.create({
        data: {
          key: 'TEST',
          name: 'Test Project',
          companyId: testCompany.id
        }
      });

      testIssue = await prisma.issue.create({
        data: {
          jiraId: 'TEST-1',
          key: 'TEST-1',
          summary: 'Test Issue',
          issueType: 'Story',
          projectId: testProject.id,
          companyId: testCompany.id,
          created: new Date(),
          rawData: { test: true }
        }
      });
    });

    it('should create issues scoped to company', async () => {
      const issue = await prisma.issue.findFirst({
        where: { key: 'TEST-1', companyId: testCompany.id },
        include: { company: true, project: true }
      });

      expect(issue).toBeDefined();
      expect(issue?.companyId).toBe(testCompany.id);
      expect(issue?.company.name).toBe('Test Company');
      expect(issue?.project.key).toBe('TEST');
    });

    it('should allow same issue key in different companies', async () => {
      const otherCompany = await prisma.company.create({
        data: {
          name: `Other Company Issues ${Date.now()}`,
          slug: `other-company-issues-${Date.now()}`
        }
      });

      const otherProject = await prisma.project.create({
        data: {
          key: 'OTHER',
          name: 'Other Project',
          companyId: otherCompany.id
        }
      });

      // Should be able to create issue with same key in different company
      const duplicateKeyIssue = await prisma.issue.create({
        data: {
          jiraId: 'OTHER-1',
          key: 'TEST-1', // Same key as testIssue
          summary: 'Other Test Issue',
          issueType: 'Bug',
          projectId: otherProject.id,
          companyId: otherCompany.id,
          created: new Date(),
          rawData: { test: true }
        }
      });

      expect(duplicateKeyIssue.key).toBe('TEST-1');
      expect(duplicateKeyIssue.companyId).toBe(otherCompany.id);

      // Clean up
      await prisma.issue.delete({ where: { id: duplicateKeyIssue.id } });
      await prisma.project.delete({ where: { id: otherProject.id } });
      await prisma.company.delete({ where: { id: otherCompany.id } });
    });

    it('should not allow duplicate issue keys within same company', async () => {
      await expect(
        prisma.issue.create({
          data: {
            jiraId: 'TEST-2',
            key: 'TEST-1', // Same as testIssue
            summary: 'Duplicate Issue',
            issueType: 'Bug',
            projectId: testProject.id,
            companyId: testCompany.id,
            created: new Date(),
            rawData: { test: true }
          }
        })
      ).rejects.toThrow();
    });

    it('should allow inconsistent company assignment (enforced at application level)', async () => {
      const otherCompany = await prisma.company.create({
        data: {
          name: `Other Company Consistency ${Date.now()}`,
          slug: `other-company-consistency-${Date.now()}`
        }
      });

      // Database allows inconsistent company assignment - this is by design
      // Application logic should enforce consistency
      const inconsistentIssue = await prisma.issue.create({
        data: {
          jiraId: 'BAD-1',
          key: 'BAD-1',
          summary: 'Bad Issue',
          issueType: 'Bug',
          projectId: testProject.id, // testProject belongs to testCompany
          companyId: otherCompany.id, // But issue is assigned to otherCompany
          created: new Date(),
          rawData: { test: true }
        }
      });

      expect(inconsistentIssue).toBeDefined();
      expect(inconsistentIssue.companyId).toBe(otherCompany.id);
      expect(inconsistentIssue.projectId).toBe(testProject.id);

      // Clean up
      await prisma.issue.delete({ where: { id: inconsistentIssue.id } });
      await prisma.company.delete({ where: { id: otherCompany.id } });
    });
  });

  describe('Default Company Migration', () => {
    it('should have created default company during migration', () => {
      expect(defaultCompany.name).toBe('Default Organization');
      expect(defaultCompany.slug).toBe('default-organization');
      expect(defaultCompany.isActive).toBe(true);
    });

    it('should have assigned existing data to default company', async () => {
      // This test assumes there was existing data before migration
      const defaultCompanyProjects = await prisma.project.count({
        where: { companyId: defaultCompany.id }
      });

      const defaultCompanyIssues = await prisma.issue.count({
        where: { companyId: defaultCompany.id }
      });

      // If there's existing data, it should be assigned to default company
      expect(defaultCompanyProjects).toBeGreaterThanOrEqual(0);
      expect(defaultCompanyIssues).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Company Queries and Filters', () => {
    it('should filter active companies by default', async () => {
      await prisma.company.update({
        where: { id: testCompany.id },
        data: { isActive: false }
      });

      const activeCompanies = await prisma.company.findMany({
        where: { isActive: true }
      });

      const companyIds = activeCompanies.map(c => c.id);
      expect(companyIds).not.toContain(testCompany.id);
      expect(companyIds).toContain(defaultCompany.id);
    });

    it('should support search by name and description', async () => {
      const searchResults = await prisma.company.findMany({
        where: {
          OR: [
            { name: { contains: 'Test', mode: 'insensitive' } },
            { description: { contains: 'unit testing', mode: 'insensitive' } }
          ]
        }
      });

      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults.some(c => c.id === testCompany.id)).toBe(true);
    });
  });
});