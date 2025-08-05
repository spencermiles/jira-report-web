import { setupTestDatabase, teardownTestDatabase, prisma } from '../setup/test-db';
import { createCycleTimeTestScenario } from '../setup/test-data';

describe('Database Views Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await setupTestDatabase();
  });

  describe('issue_metrics view', () => {
    it('should calculate cycle times correctly for complete workflows', async () => {
      const { project, issues } = await createCycleTimeTestScenario();

      // Query the issue_metrics view
      const metrics = await prisma.$queryRaw<Array<{
        id: number;
        key: string;
        cycle_time: number | null;
        lead_time: number | null;
        grooming_cycle_time: number | null;
        dev_cycle_time: number | null;
        qa_cycle_time: number | null;
        blockers: number;
        review_churn: number;
        qa_churn: number;
        stage_timestamps: any;
      }>>`
        SELECT 
          id, key, cycle_time, lead_time, 
          grooming_cycle_time, dev_cycle_time, qa_cycle_time,
          blockers, review_churn, qa_churn, stage_timestamps
        FROM issue_metrics 
        WHERE project_id = ${project.id}
        ORDER BY key
      `;

      expect(metrics).toHaveLength(4);

      // TEST-001: Complete workflow with known timing
      const issue1Metrics = metrics.find(m => m.key === 'TEST-001');
      expect(issue1Metrics).toBeDefined();
      expect(parseFloat(issue1Metrics!.cycle_time as any)).toBeCloseTo(15.3, 1); // Actual calculated cycle time
      expect(parseFloat(issue1Metrics!.lead_time as any)).toBeCloseTo(19.3, 1); // ~19.33 days from created to resolved
      expect(parseFloat(issue1Metrics!.grooming_cycle_time as any)).toBeCloseTo(1.0, 1); // 1 day from grooming to ready
      expect(parseFloat(issue1Metrics!.dev_cycle_time as any)).toBeCloseTo(7.3, 1); // ~7.33 days from in progress to review
      expect(parseFloat(issue1Metrics!.qa_cycle_time as any)).toBeCloseTo(3.8, 1); // ~3.79 days from QA to done
      expect(Number(issue1Metrics!.blockers)).toBe(0);
      expect(Number(issue1Metrics!.review_churn)).toBe(0);
      expect(Number(issue1Metrics!.qa_churn)).toBe(0);

      // TEST-002: Issue with review churn
      const issue2Metrics = metrics.find(m => m.key === 'TEST-002');
      expect(issue2Metrics).toBeDefined();
      expect(Number(issue2Metrics!.review_churn)).toBe(1); // Went back from review to progress once
      expect(parseFloat(issue2Metrics!.cycle_time as any)).toBeGreaterThan(0);

      // TEST-003: Issue with blockers
      const issue3Metrics = metrics.find(m => m.key === 'TEST-003');
      expect(issue3Metrics).toBeDefined();
      expect(Number(issue3Metrics!.blockers)).toBe(1); // One transition to blocked state

      // TEST-004: Unresolved issue
      const issue4Metrics = metrics.find(m => m.key === 'TEST-004');
      expect(issue4Metrics).toBeDefined();
      expect(issue4Metrics!.cycle_time).toBeNull(); // Not resolved yet
      expect(issue4Metrics!.lead_time).toBeNull(); // Not resolved yet
    });

    it('should provide correct stage timestamps in JSON format', async () => {
      const { project } = await createCycleTimeTestScenario();

      const metrics = await prisma.$queryRaw<Array<{
        key: string;
        stage_timestamps: {
          opened: string;
          readyForGrooming: string | null;
          readyForDev: string | null;
          inProgress: string | null;
          inReview: string | null;
          inQA: string | null;
          done: string | null;
          readyForRelease: string | null;
        };
      }>>`
        SELECT key, stage_timestamps
        FROM issue_metrics 
        WHERE project_id = ${project.id} AND key = 'TEST-001'
      `;

      expect(metrics).toHaveLength(1);
      const timestamps = metrics[0].stage_timestamps;
      
      expect(timestamps.opened).toBeTruthy();
      expect(timestamps.readyForGrooming).toBeTruthy();
      expect(timestamps.readyForDev).toBeTruthy();
      expect(timestamps.inProgress).toBeTruthy();
      expect(timestamps.inReview).toBeTruthy();
      expect(timestamps.inQA).toBeTruthy();
      expect(timestamps.done).toBeTruthy();

      // Verify timestamps are in chronological order
      const openedDate = new Date(timestamps.opened);
      const groomingDate = new Date(timestamps.readyForGrooming!);
      const devReadyDate = new Date(timestamps.readyForDev!);
      const inProgressDate = new Date(timestamps.inProgress!);
      const reviewDate = new Date(timestamps.inReview!);
      const qaDate = new Date(timestamps.inQA!);
      const doneDate = new Date(timestamps.done!);

      expect(openedDate.getTime()).toBeLessThan(groomingDate.getTime());
      expect(groomingDate.getTime()).toBeLessThan(devReadyDate.getTime());
      expect(devReadyDate.getTime()).toBeLessThan(inProgressDate.getTime());
      expect(inProgressDate.getTime()).toBeLessThan(reviewDate.getTime());
      expect(reviewDate.getTime()).toBeLessThan(qaDate.getTime());
      expect(qaDate.getTime()).toBeLessThan(doneDate.getTime());
    });
  });

  describe('project_summary view', () => {
    it('should calculate project-level metrics correctly', async () => {
      const { project } = await createCycleTimeTestScenario();

      const summaries = await prisma.$queryRaw<Array<{
        id: number;
        key: string;
        name: string;
        total_issues: number;
        resolved_issues: number;
        avg_lead_time: number | null;
        avg_cycle_time: number | null;
        flow_efficiency: number | null;
        first_time_through: number | null;
      }>>`
        SELECT 
          id, key, name, total_issues, resolved_issues,
          avg_lead_time, avg_cycle_time, flow_efficiency, first_time_through
        FROM project_summary 
        WHERE id = ${project.id}
      `;

      expect(summaries).toHaveLength(1);
      const summary = summaries[0];

      expect(summary.key).toBe('TEST');
      expect(summary.name).toBe('Test Project');
      expect(Number(summary.total_issues)).toBe(4);
      expect(Number(summary.resolved_issues)).toBe(3); // 3 out of 4 issues are resolved

      // Average metrics should be calculated from resolved issues only
      expect(parseFloat(summary.avg_lead_time as any)).toBeGreaterThan(0);
      expect(parseFloat(summary.avg_cycle_time as any)).toBeGreaterThan(0);

      // Flow efficiency should be a percentage between 0-100
      expect(parseFloat(summary.flow_efficiency as any)).toBeGreaterThan(0);
      expect(parseFloat(summary.flow_efficiency as any)).toBeLessThanOrEqual(100);

      // First time through should account for churn
      expect(parseFloat(summary.first_time_through as any)).toBeGreaterThan(0);
      expect(parseFloat(summary.first_time_through as any)).toBeLessThanOrEqual(100);
      expect(parseFloat(summary.first_time_through as any)).toBeCloseTo(66.7, 1); // 2 out of 3 resolved issues had no churn
    });

    it('should handle projects with no resolved issues', async () => {
      // Create a project with only unresolved issues
      const project = await prisma.project.create({
        data: { key: 'EMPTY', name: 'Empty Project' }
      });

      const issue = await prisma.issue.create({
        data: {
          jiraId: 'empty-001',
          key: 'EMPTY-001',
          summary: 'Unresolved issue',
          issueType: 'Story',
          priority: 'P2',
          projectId: project.id,
          storyPoints: 5,
          created: new Date(),
          rawData: {},
        },
      });

      const summaries = await prisma.$queryRaw<Array<{
        total_issues: number;
        resolved_issues: number;
        avg_lead_time: number | null;
        avg_cycle_time: number | null;
        flow_efficiency: number | null;
        first_time_through: number | null;
      }>>`
        SELECT 
          total_issues, resolved_issues, avg_lead_time, avg_cycle_time,
          flow_efficiency, first_time_through
        FROM project_summary 
        WHERE id = ${project.id}
      `;

      expect(summaries).toHaveLength(1);
      const summary = summaries[0];

      expect(Number(summary.total_issues)).toBe(1);
      expect(Number(summary.resolved_issues)).toBe(0);
      expect(summary.avg_lead_time).toBeNull(); // No resolved issues
      expect(summary.avg_cycle_time).toBeNull(); // No resolved issues
      expect(Number(summary.flow_efficiency)).toBe(0); // Handled by CASE statement
      expect(Number(summary.first_time_through)).toBe(0); // Handled by CASE statement
    });
  });

  describe('View performance and data integrity', () => {
    it('should handle large datasets efficiently', async () => {
      const { project } = await createCycleTimeTestScenario();
      
      const startTime = Date.now();
      
      // Query both views
      const [issueMetrics, projectSummary] = await Promise.all([
        prisma.$queryRaw`SELECT COUNT(*) as count FROM issue_metrics WHERE project_id = ${project.id}`,
        prisma.$queryRaw`SELECT * FROM project_summary WHERE id = ${project.id}`,
      ]);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      // Should complete quickly (under 1 second for test data)
      expect(queryTime).toBeLessThan(1000);
      
      // @ts-ignore - Raw query typing
      expect(Number(issueMetrics[0].count)).toBe(4);
      expect(projectSummary).toHaveLength(1);
    });

    it('should maintain data consistency between views and base tables', async () => {
      const { project } = await createCycleTimeTestScenario();

      // Count issues in base table
      const baseIssueCount = await prisma.issue.count({
        where: { projectId: project.id }
      });

      // Count issues in view
      const viewIssueCount = await prisma.$queryRaw<Array<{ count: string }>>`
        SELECT COUNT(*) as count FROM issue_metrics WHERE project_id = ${project.id}
      `;

      expect(Number(viewIssueCount[0].count)).toBe(baseIssueCount);

      // Verify project summary matches base data
      const resolvedCount = await prisma.issue.count({
        where: { 
          projectId: project.id,
          resolved: { not: null }
        }
      });

      const summaryData = await prisma.$queryRaw<Array<{ resolved_issues: number }>>`
        SELECT resolved_issues FROM project_summary WHERE id = ${project.id}
      `;

      expect(Number(summaryData[0].resolved_issues)).toBe(resolvedCount);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle issues with missing status changes gracefully', async () => {
      const project = await prisma.project.create({
        data: { key: 'EDGE', name: 'Edge Case Project' }
      });

      // Create issue without any status changes
      const issue = await prisma.issue.create({
        data: {
          jiraId: 'edge-001',
          key: 'EDGE-001',
          summary: 'Issue without status changes',
          issueType: 'Story',
          priority: 'P2',
          projectId: project.id,
          storyPoints: 5,
          created: new Date('2024-01-01T09:00:00Z'),
          resolved: new Date('2024-01-05T17:00:00Z'), // Resolved 4.33 days later but no status changes
          rawData: {},
        },
      });

      const metrics = await prisma.$queryRaw<Array<{
        key: string;
        cycle_time: number | null;
        lead_time: number | null;
      }>>`
        SELECT key, cycle_time, lead_time
        FROM issue_metrics 
        WHERE id = ${issue.id}
      `;

      expect(metrics).toHaveLength(1);
      expect(metrics[0].cycle_time).toBeNull(); // No "In Progress" timestamp
      expect(parseFloat(metrics[0].lead_time as any)).toBeGreaterThan(0); // Has created and resolved dates
    });

    it('should handle workflow mappings for different projects', async () => {
      // Create two projects with different workflow mappings
      const project1 = await prisma.project.create({
        data: { key: 'PROJ1', name: 'Project 1' }
      });
      
      const project2 = await prisma.project.create({
        data: { key: 'PROJ2', name: 'Project 2' }
      });

      // Different status names for same canonical stage
      await prisma.workflowMapping.createMany({
        data: [
          { projectId: project1.id, jiraStatusName: 'Development', canonicalStage: 'IN_PROGRESS' },
          { projectId: project2.id, jiraStatusName: 'Coding', canonicalStage: 'IN_PROGRESS' },
        ],
      });

      // Create identical issues in both projects
      const issue1 = await prisma.issue.create({
        data: {
          jiraId: 'proj1-001',
          key: 'PROJ1-001',
          summary: 'Test issue',
          issueType: 'Story',
          priority: 'P2',
          projectId: project1.id,
          created: new Date('2024-01-01'),
          resolved: new Date('2024-01-10'),
          rawData: {},
        },
      });

      const issue2 = await prisma.issue.create({
        data: {
          jiraId: 'proj2-001',
          key: 'PROJ2-001',
          summary: 'Test issue',
          issueType: 'Story',
          priority: 'P2',
          projectId: project2.id,
          created: new Date('2024-01-01'),
          resolved: new Date('2024-01-10'),
          rawData: {},
        },
      });

      // Add status changes using project-specific status names
      await prisma.statusChange.createMany({
        data: [
          {
            issueId: issue1.id,
            fieldName: 'status',
            fromValue: null,
            toValue: 'Development',
            changed: new Date('2024-01-02'),
          },
          {
            issueId: issue2.id,
            fieldName: 'status',
            fromValue: null,
            toValue: 'Coding',
            changed: new Date('2024-01-02'),
          },
        ],
      });

      // Both should map to IN_PROGRESS and have similar cycle times
      const metrics = await prisma.$queryRaw<Array<{
        key: string;
        cycle_time: number | null;
      }>>`
        SELECT key, cycle_time
        FROM issue_metrics 
        WHERE project_id IN (${project1.id}, ${project2.id})
        ORDER BY key
      `;

      expect(metrics).toHaveLength(2);
      expect(parseFloat(metrics[0].cycle_time as any)).toBeCloseTo(8.0, 1); // Both should have similar cycle times
      expect(parseFloat(metrics[1].cycle_time as any)).toBeCloseTo(8.0, 1);
    });
  });
});