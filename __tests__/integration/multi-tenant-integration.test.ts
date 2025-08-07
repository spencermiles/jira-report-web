import { prisma } from '@/lib/db';
import { Company, Project, Issue, StatusChange, Sprint } from '@prisma/client';

describe('Multi-Tenant Integration Tests', () => {
  let company1: Company;
  let company2: Company;
  let defaultCompany: Company;

  beforeAll(async () => {
    // Clean up test data
    await prisma.statusChange.deleteMany({});
    await prisma.issue.deleteMany({});
    await prisma.sprint.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.company.deleteMany({});

    // Create default company
    defaultCompany = await prisma.company.create({
      data: {
        name: 'Default Organization',
        slug: 'default-organization',
        description: 'Default organization for system data'
      }
    });

    // Create test companies
    company1 = await prisma.company.create({
      data: {
        name: 'Acme Corp',
        slug: 'acme-corp',
        description: 'A technology company'
      }
    });

    company2 = await prisma.company.create({
      data: {
        name: 'Beta Industries',
        slug: 'beta-industries',
        description: 'An industrial company'
      }
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.statusChange.deleteMany({});
    await prisma.issue.deleteMany({});
    await prisma.sprint.deleteMany({});
    await prisma.project.deleteMany({});
    if (company1?.id && company2?.id) {
      await prisma.company.deleteMany({
        where: { id: { in: [company1.id, company2.id] } }
      });
    }
    await prisma.$disconnect();
  });

  describe('Complete Multi-Tenant Data Flow', () => {
    let acmeProject: Project;
    let betaProject: Project;
    let acmeSprint: Sprint;
    let betaSprint: Sprint;
    let acmeIssue: Issue;
    let betaIssue: Issue;

    beforeAll(async () => {
      // Create projects for each company
      acmeProject = await prisma.project.create({
        data: {
          key: 'ACME',
          name: 'Acme Project',
          companyId: company1.id
        }
      });

      betaProject = await prisma.project.create({
        data: {
          key: 'BETA',
          name: 'Beta Project',
          companyId: company2.id
        }
      });

      // Create sprints for each company
      acmeSprint = await prisma.sprint.create({
        data: {
          name: 'Sprint 1',
          projectId: acmeProject.id,
          companyId: company1.id,
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-15')
        }
      });

      betaSprint = await prisma.sprint.create({
        data: {
          name: 'Sprint 1', // Same name, different company
          projectId: betaProject.id,
          companyId: company2.id,
          startDate: new Date('2024-01-08'),
          endDate: new Date('2024-01-22')
        }
      });

      // Create issues for each company
      acmeIssue = await prisma.issue.create({
        data: {
          jiraId: 'ACME-100',
          key: 'ACME-100',
          summary: 'Implement user authentication',
          issueType: 'Story',
          priority: 'High',
          projectId: acmeProject.id,
          companyId: company1.id,
          storyPoints: 8,
          created: new Date('2024-01-02'),
          rawData: { originalEstimate: '8h', environment: 'production' }
        }
      });

      betaIssue = await prisma.issue.create({
        data: {
          jiraId: 'BETA-200',
          key: 'BETA-200',
          summary: 'Fix production bug',
          issueType: 'Bug',
          priority: 'Critical',
          projectId: betaProject.id,
          companyId: company2.id,
          storyPoints: 3,
          created: new Date('2024-01-03'),
          resolved: new Date('2024-01-05'),
          rawData: { severity: 'critical', affectedUsers: 1500 }
        }
      });

      // Create status changes
      await prisma.statusChange.create({
        data: {
          issueId: acmeIssue.id,
          companyId: company1.id,
          fieldName: 'status',
          fromValue: 'To Do',
          toValue: 'In Progress',
          changed: new Date('2024-01-03')
        }
      });

      await prisma.statusChange.create({
        data: {
          issueId: betaIssue.id,
          companyId: company2.id,
          fieldName: 'status',
          fromValue: 'In Progress',
          toValue: 'Done',
          changed: new Date('2024-01-05')
        }
      });

      // Link issues to sprints
      await prisma.issuesSprints.create({
        data: {
          issueId: acmeIssue.id,
          sprintId: acmeSprint.id
        }
      });

      await prisma.issuesSprints.create({
        data: {
          issueId: betaIssue.id,
          sprintId: betaSprint.id
        }
      });
    });

    it('should maintain complete data isolation across all related tables', async () => {
      // Test company 1 data
      const acmeData = await prisma.company.findUnique({
        where: { id: company1.id },
        include: {
          projects: {
            include: {
              issues: {
                include: {
                  statusChanges: true,
                  issuesSprints: {
                    include: { sprint: true }
                  }
                }
              },
              sprints: true
            }
          }
        }
      });

      expect(acmeData).toBeDefined();
      expect(acmeData?.projects).toHaveLength(1);
      expect(acmeData?.projects[0].key).toBe('ACME');
      expect(acmeData?.projects[0].issues).toHaveLength(1);
      expect(acmeData?.projects[0].issues[0].key).toBe('ACME-100');
      expect(acmeData?.projects[0].issues[0].statusChanges).toHaveLength(1);
      expect(acmeData?.projects[0].sprints).toHaveLength(1);
      expect(acmeData?.projects[0].sprints[0].name).toBe('Sprint 1');

      // Test company 2 data
      const betaData = await prisma.company.findUnique({
        where: { id: company2.id },
        include: {
          projects: {
            include: {
              issues: {
                include: {
                  statusChanges: true,
                  issuesSprints: {
                    include: { sprint: true }
                  }
                }
              },
              sprints: true
            }
          }
        }
      });

      expect(betaData).toBeDefined();
      expect(betaData?.projects).toHaveLength(1);
      expect(betaData?.projects[0].key).toBe('BETA');
      expect(betaData?.projects[0].issues).toHaveLength(1);
      expect(betaData?.projects[0].issues[0].key).toBe('BETA-200');
      expect(betaData?.projects[0].issues[0].statusChanges).toHaveLength(1);
      expect(betaData?.projects[0].sprints).toHaveLength(1);
      expect(betaData?.projects[0].sprints[0].name).toBe('Sprint 1');

      // Verify no cross-contamination
      const acmeIssueKeys = acmeData?.projects[0].issues.map(i => i.key) || [];
      const betaIssueKeys = betaData?.projects[0].issues.map(i => i.key) || [];
      expect(acmeIssueKeys).not.toContain('BETA-200');
      expect(betaIssueKeys).not.toContain('ACME-100');
    });

    it('should support same keys across companies (project, issue, sprint)', async () => {
      // Both companies have "Sprint 1" - this should be allowed
      const acmeSprintCount = await prisma.sprint.count({
        where: { companyId: company1.id, name: 'Sprint 1' }
      });
      const betaSprintCount = await prisma.sprint.count({
        where: { companyId: company2.id, name: 'Sprint 1' }
      });

      expect(acmeSprintCount).toBe(1);
      expect(betaSprintCount).toBe(1);

      // Total sprints named "Sprint 1" across all companies
      const totalSprintCount = await prisma.sprint.count({
        where: { name: 'Sprint 1' }
      });
      expect(totalSprintCount).toBeGreaterThanOrEqual(2);
    });

    it('should enforce company-scoped uniqueness constraints', async () => {
      // Should not be able to create duplicate project key within same company
      await expect(
        prisma.project.create({
          data: {
            key: 'ACME', // Same as acmeProject
            name: 'Duplicate Acme Project',
            companyId: company1.id
          }
        })
      ).rejects.toThrow();

      // Should not be able to create duplicate issue key within same company
      await expect(
        prisma.issue.create({
          data: {
            jiraId: 'ACME-101',
            key: 'ACME-100', // Same as acmeIssue
            summary: 'Duplicate Issue',
            issueType: 'Task',
            projectId: acmeProject.id,
            companyId: company1.id,
            created: new Date(),
            rawData: {}
          }
        })
      ).rejects.toThrow();

      // Should not be able to create duplicate sprint name within same company
      await expect(
        prisma.sprint.create({
          data: {
            name: 'Sprint 1', // Same as acmeSprint
            projectId: acmeProject.id,
            companyId: company1.id
          }
        })
      ).rejects.toThrow();
    });

    it('should cascade delete properly within company bounds', async () => {
      // Create temporary company with data
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

      const tempIssue = await prisma.issue.create({
        data: {
          jiraId: 'TEMP-1',
          key: 'TEMP-1',
          summary: 'Temp Issue',
          issueType: 'Task',
          projectId: tempProject.id,
          companyId: tempCompany.id,
          created: new Date(),
          rawData: {}
        }
      });

      const tempStatusChange = await prisma.statusChange.create({
        data: {
          issueId: tempIssue.id,
          companyId: tempCompany.id,
          fieldName: 'status',
          fromValue: 'To Do',
          toValue: 'Done',
          changed: new Date()
        }
      });

      // Delete the company - should cascade delete all related data
      await prisma.company.delete({ where: { id: tempCompany.id } });

      // Verify all related data is deleted
      const deletedProject = await prisma.project.findUnique({ where: { id: tempProject.id } });
      const deletedIssue = await prisma.issue.findUnique({ where: { id: tempIssue.id } });
      const deletedStatusChange = await prisma.statusChange.findUnique({ where: { id: tempStatusChange.id } });

      expect(deletedProject).toBeNull();
      expect(deletedIssue).toBeNull();
      expect(deletedStatusChange).toBeNull();

      // Verify other companies' data is unaffected
      const acmeStillExists = await prisma.project.findUnique({ where: { id: acmeProject.id } });
      const betaStillExists = await prisma.project.findUnique({ where: { id: betaProject.id } });

      expect(acmeStillExists).toBeDefined();
      expect(betaStillExists).toBeDefined();
    });

    it('should support complex queries with company filtering', async () => {
      // Query for issues with specific criteria in company 1
      const acmeHighPriorityStories = await prisma.issue.findMany({
        where: {
          companyId: company1.id,
          issueType: 'Story',
          priority: 'High',
          storyPoints: { gte: 5 }
        },
        include: {
          project: true,
          statusChanges: true
        }
      });

      expect(acmeHighPriorityStories).toHaveLength(1);
      expect(acmeHighPriorityStories[0].key).toBe('ACME-100');
      expect(acmeHighPriorityStories[0].project.key).toBe('ACME');

      // Query for resolved bugs in company 2
      const betaResolvedBugs = await prisma.issue.findMany({
        where: {
          companyId: company2.id,
          issueType: 'Bug',
          resolved: { not: null }
        },
        include: {
          project: true,
          statusChanges: true
        }
      });

      expect(betaResolvedBugs).toHaveLength(1);
      expect(betaResolvedBugs[0].key).toBe('BETA-200');
      expect(betaResolvedBugs[0].project.key).toBe('BETA');

      // Cross-company query should show isolation
      const allHighPriorityStories = await prisma.issue.findMany({
        where: {
          issueType: 'Story',
          priority: 'High'
        }
      });

      // Should only find the one from company 1
      expect(allHighPriorityStories).toHaveLength(1);
      expect(allHighPriorityStories[0].companyId).toBe(company1.id);
    });

    it('should maintain referential integrity across company boundaries', async () => {
      // Verify issues belong to correct company's projects
      const allIssues = await prisma.issue.findMany({
        include: { project: true }
      });

      for (const issue of allIssues) {
        expect(issue.companyId).toBe(issue.project.companyId);
      }

      // Verify status changes belong to correct company's issues
      const allStatusChanges = await prisma.statusChange.findMany({
        include: { issue: true }
      });

      for (const statusChange of allStatusChanges) {
        expect(statusChange.companyId).toBe(statusChange.issue.companyId);
      }

      // Verify sprints belong to correct company's projects
      const allSprints = await prisma.sprint.findMany({
        include: { project: true }
      });

      for (const sprint of allSprints) {
        expect(sprint.companyId).toBe(sprint.project.companyId);
      }
    });
  });

  describe('Performance and Indexing Verification', () => {
    it('should use company_id indexes efficiently', async () => {
      // Create multiple companies with data to test index usage
      const testCompanies = await Promise.all([
        prisma.company.create({
          data: { name: 'Perf Test 1', slug: 'perf-test-1' }
        }),
        prisma.company.create({
          data: { name: 'Perf Test 2', slug: 'perf-test-2' }
        }),
        prisma.company.create({
          data: { name: 'Perf Test 3', slug: 'perf-test-3' }
        })
      ]);

      // Create projects for each test company
      for (let i = 0; i < testCompanies.length; i++) {
        const company = testCompanies[i];
        await prisma.project.create({
          data: {
            key: `PERF${i + 1}`,
            name: `Perf Project ${i + 1}`,
            companyId: company.id
          }
        });
      }

      // Test that company-scoped queries are efficient
      const startTime = Date.now();
      
      const company1Projects = await prisma.project.findMany({
        where: { companyId: testCompanies[0].id }
      });
      
      const company2Projects = await prisma.project.findMany({
        where: { companyId: testCompanies[1].id }
      });
      
      const company3Projects = await prisma.project.findMany({
        where: { companyId: testCompanies[2].id }
      });
      
      const endTime = Date.now();

      // Queries should complete quickly (< 100ms for simple data)
      expect(endTime - startTime).toBeLessThan(100);
      
      // Verify correct isolation
      expect(company1Projects).toHaveLength(1);
      expect(company2Projects).toHaveLength(1);
      expect(company3Projects).toHaveLength(1);

      expect(company1Projects[0].key).toBe('PERF1');
      expect(company2Projects[0].key).toBe('PERF2');
      expect(company3Projects[0].key).toBe('PERF3');

      // Clean up
      for (const company of testCompanies) {
        await prisma.project.deleteMany({ where: { companyId: company.id } });
        await prisma.company.delete({ where: { id: company.id } });
      }
    });

    it('should handle concurrent multi-tenant operations safely', async () => {
      const testCompany1 = await prisma.company.create({
        data: { name: 'Concurrent Test 1', slug: 'concurrent-test-1' }
      });

      const testCompany2 = await prisma.company.create({
        data: { name: 'Concurrent Test 2', slug: 'concurrent-test-2' }
      });

      // Run concurrent operations on different companies
      const concurrentOps = await Promise.allSettled([
        // Company 1 operations
        prisma.project.create({
          data: {
            key: 'CONC1',
            name: 'Concurrent Project 1',
            companyId: testCompany1.id
          }
        }),
        // Company 2 operations
        prisma.project.create({
          data: {
            key: 'CONC2',
            name: 'Concurrent Project 2',
            companyId: testCompany2.id
          }
        }),
        // Same key in different companies should work
        prisma.project.create({
          data: {
            key: 'SHARED', // Same key
            name: 'Shared Project Name 1',
            companyId: testCompany1.id
          }
        }),
        prisma.project.create({
          data: {
            key: 'SHARED', // Same key, different company
            name: 'Shared Project Name 2',
            companyId: testCompany2.id
          }
        })
      ]);

      // All operations should succeed
      expect(concurrentOps.every(op => op.status === 'fulfilled')).toBe(true);

      // Verify data integrity
      const company1Projects = await prisma.project.findMany({
        where: { companyId: testCompany1.id }
      });
      
      const company2Projects = await prisma.project.findMany({
        where: { companyId: testCompany2.id }
      });

      expect(company1Projects).toHaveLength(2);
      expect(company2Projects).toHaveLength(2);

      // Clean up
      await prisma.project.deleteMany({ 
        where: { companyId: { in: [testCompany1.id, testCompany2.id] } }
      });
      await prisma.company.deleteMany({ 
        where: { id: { in: [testCompany1.id, testCompany2.id] } }
      });
    });
  });
});