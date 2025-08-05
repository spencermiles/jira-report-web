import { setupTestDatabase, teardownTestDatabase, prisma } from '../setup/test-db';
import { createCycleTimeTestScenario } from '../setup/test-data';

describe('GraphQL Advanced Features Integration', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await setupTestDatabase();
  });

  describe('Database Views Integration', () => {
    it('should successfully query issue_metrics view for advanced filtering', async () => {
      const { project } = await createCycleTimeTestScenario();
      
      const metrics = await prisma.$queryRaw<Array<{
        id: number;
        key: string;
        cycle_time: number | null;
        lead_time: number | null;
        blockers: bigint;
        review_churn: bigint;
      }>>`
        SELECT id, key, cycle_time, lead_time, blockers, review_churn
        FROM issue_metrics
        WHERE project_id = ${project.id}
        AND cycle_time IS NOT NULL
      `;
      
      expect(metrics).toBeInstanceOf(Array);
      expect(metrics.length).toBeGreaterThan(0);
      
      // Validate that we get the expected resolved issues with cycle times
      const resolvedIssues = metrics.filter(m => m.cycle_time !== null);
      expect(resolvedIssues.length).toBe(3); // 3 resolved issues in test scenario
      
      resolvedIssues.forEach(issue => {
        expect(parseFloat(issue.cycle_time as any)).toBeGreaterThan(0);
        expect(parseFloat(issue.lead_time as any)).toBeGreaterThan(0);
        expect(Number(issue.blockers)).toBeGreaterThanOrEqual(0);
        expect(Number(issue.review_churn)).toBeGreaterThanOrEqual(0);
      });
    });

    it('should successfully query project_summary view for aggregated metrics', async () => {
      const { project } = await createCycleTimeTestScenario();
      
      const summaries = await prisma.$queryRaw<Array<{
        id: number;
        key: string;
        total_issues: bigint;
        resolved_issues: bigint;
        avg_cycle_time: number | null;
        avg_lead_time: number | null;
        flow_efficiency: number | null;
        first_time_through: number | null;
      }>>`
        SELECT id, key, total_issues, resolved_issues, 
               avg_cycle_time, avg_lead_time, flow_efficiency, first_time_through
        FROM project_summary
        WHERE id = ${project.id}
      `;
      
      expect(summaries).toBeInstanceOf(Array);
      expect(summaries.length).toBe(1);
      
      const summary = summaries[0];
      expect(summary.key).toBe(project.key);
      expect(Number(summary.total_issues)).toBe(4);
      expect(Number(summary.resolved_issues)).toBe(3);
      expect(parseFloat(summary.avg_cycle_time as any)).toBeGreaterThan(0);
      expect(parseFloat(summary.avg_lead_time as any)).toBeGreaterThan(0);
      expect(parseFloat(summary.flow_efficiency as any)).toBeGreaterThan(0);
      expect(parseFloat(summary.first_time_through as any)).toBeGreaterThan(0);
    });
  });

  describe('Advanced Filtering Capabilities', () => {
    it('should filter issues by cycle time range', async () => {
      const { project } = await createCycleTimeTestScenario();
      
      // Find issues with cycle time > 10 days
      const slowIssues = await prisma.$queryRaw<Array<{
        key: string;
        cycle_time: number;
      }>>`
        SELECT key, cycle_time
        FROM issue_metrics
        WHERE project_id = ${project.id}
        AND cycle_time > 10.0
        ORDER BY cycle_time DESC
      `;
      
      expect(slowIssues).toBeInstanceOf(Array);
      slowIssues.forEach(issue => {
        expect(parseFloat(issue.cycle_time as any)).toBeGreaterThan(10.0);
      });
    });

    it('should filter issues by churn indicators', async () => {
      const { project } = await createCycleTimeTestScenario();
      
      // Find issues with churn (review or QA churn)
      const churnedIssues = await prisma.$queryRaw<Array<{
        key: string;
        review_churn: bigint;
        qa_churn: bigint;
      }>>`
        SELECT key, review_churn, qa_churn
        FROM issue_metrics
        WHERE project_id = ${project.id}
        AND (review_churn > 0 OR qa_churn > 0)
      `;
      
      expect(churnedIssues).toBeInstanceOf(Array);
      churnedIssues.forEach(issue => {
        const hasChurn = Number(issue.review_churn) > 0 || Number(issue.qa_churn) > 0;
        expect(hasChurn).toBe(true);
      });
    });

    it('should filter issues by blocker status', async () => {
      const { project } = await createCycleTimeTestScenario();
      
      // Find issues that had blockers
      const blockedIssues = await prisma.$queryRaw<Array<{
        key: string;
        blockers: bigint;
      }>>`
        SELECT key, blockers
        FROM issue_metrics
        WHERE project_id = ${project.id}
        AND blockers > 0
      `;
      
      expect(blockedIssues).toBeInstanceOf(Array);
      blockedIssues.forEach(issue => {
        expect(Number(issue.blockers)).toBeGreaterThan(0);
      });
      
      // Should have at least one blocked issue from our test scenario
      expect(blockedIssues.length).toBeGreaterThan(0);
    });
  });

  describe('Analytics Queries', () => {
    it('should calculate cycle time distribution', async () => {
      const { project } = await createCycleTimeTestScenario();
      
      const distribution = await prisma.$queryRaw<Array<{
        range: string;
        count: bigint;
      }>>`
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
        WHERE project_id = ${project.id}
        GROUP BY 1
        ORDER BY 
          CASE 
            WHEN (CASE 
              WHEN cycle_time IS NULL THEN 'No Data'
              WHEN cycle_time <= 1 THEN '0-1 days'
              WHEN cycle_time <= 3 THEN '1-3 days'
              WHEN cycle_time <= 7 THEN '3-7 days'
              WHEN cycle_time <= 14 THEN '7-14 days'
              WHEN cycle_time <= 30 THEN '14-30 days'
              ELSE '30+ days'
            END) = '0-1 days' THEN 1
            WHEN (CASE 
              WHEN cycle_time IS NULL THEN 'No Data'
              WHEN cycle_time <= 1 THEN '0-1 days'
              WHEN cycle_time <= 3 THEN '1-3 days'
              WHEN cycle_time <= 7 THEN '3-7 days'
              WHEN cycle_time <= 14 THEN '7-14 days'
              WHEN cycle_time <= 30 THEN '14-30 days'
              ELSE '30+ days'
            END) = '1-3 days' THEN 2
            WHEN (CASE 
              WHEN cycle_time IS NULL THEN 'No Data'
              WHEN cycle_time <= 1 THEN '0-1 days'
              WHEN cycle_time <= 3 THEN '1-3 days'
              WHEN cycle_time <= 7 THEN '3-7 days'
              WHEN cycle_time <= 14 THEN '7-14 days'
              WHEN cycle_time <= 30 THEN '14-30 days'
              ELSE '30+ days'
            END) = '3-7 days' THEN 3
            WHEN (CASE 
              WHEN cycle_time IS NULL THEN 'No Data'
              WHEN cycle_time <= 1 THEN '0-1 days'
              WHEN cycle_time <= 3 THEN '1-3 days'
              WHEN cycle_time <= 7 THEN '3-7 days'
              WHEN cycle_time <= 14 THEN '7-14 days'
              WHEN cycle_time <= 30 THEN '14-30 days'
              ELSE '30+ days'
            END) = '7-14 days' THEN 4
            WHEN (CASE 
              WHEN cycle_time IS NULL THEN 'No Data'
              WHEN cycle_time <= 1 THEN '0-1 days'
              WHEN cycle_time <= 3 THEN '1-3 days'
              WHEN cycle_time <= 7 THEN '3-7 days'
              WHEN cycle_time <= 14 THEN '7-14 days'
              WHEN cycle_time <= 30 THEN '14-30 days'
              ELSE '30+ days'
            END) = '14-30 days' THEN 5
            WHEN (CASE 
              WHEN cycle_time IS NULL THEN 'No Data'
              WHEN cycle_time <= 1 THEN '0-1 days'
              WHEN cycle_time <= 3 THEN '1-3 days'
              WHEN cycle_time <= 7 THEN '3-7 days'
              WHEN cycle_time <= 14 THEN '7-14 days'
              WHEN cycle_time <= 30 THEN '14-30 days'
              ELSE '30+ days'
            END) = '30+ days' THEN 6
            ELSE 7
          END
      `;
      
      expect(distribution).toBeInstanceOf(Array);
      expect(distribution.length).toBeGreaterThan(0);
      
      let totalCount = 0;
      distribution.forEach(bucket => {
        expect(['No Data', '0-1 days', '1-3 days', '3-7 days', '7-14 days', '14-30 days', '30+ days']).toContain(bucket.range);
        expect(Number(bucket.count)).toBeGreaterThan(0);
        totalCount += Number(bucket.count);
      });
      
      // Should account for all 4 test issues
      expect(totalCount).toBe(4);
    });

    it('should calculate flow metrics trend by month', async () => {
      const { project } = await createCycleTimeTestScenario();
      
      const trend = await prisma.$queryRaw<Array<{
        period: string;
        avg_cycle_time: number | null;
        avg_lead_time: number | null;
        throughput: bigint;
      }>>`
        SELECT 
          TO_CHAR(resolved, 'YYYY-MM') as period,
          ROUND(AVG(cycle_time), 1) as avg_cycle_time,
          ROUND(AVG(lead_time), 1) as avg_lead_time,
          COUNT(*) as throughput
        FROM issue_metrics
        WHERE project_id = ${project.id}
        AND resolved IS NOT NULL
        GROUP BY TO_CHAR(resolved, 'YYYY-MM')
        ORDER BY period DESC
      `;
      
      expect(trend).toBeInstanceOf(Array);
      if (trend.length > 0) {
        const firstPeriod = trend[0];
        expect(firstPeriod.period).toBe('2024-01'); // From our test data
        expect(parseFloat(firstPeriod.avg_cycle_time as any)).toBeGreaterThan(0);
        expect(parseFloat(firstPeriod.avg_lead_time as any)).toBeGreaterThan(0);
        expect(Number(firstPeriod.throughput)).toBe(3); // 3 resolved issues in January 2024
      }
    });
  });

  describe('Performance Optimization', () => {
    it('should execute complex queries efficiently', async () => {
      const { project } = await createCycleTimeTestScenario();
      
      const startTime = Date.now();
      
      // Complex query that joins multiple concepts
      const complexMetrics = await prisma.$queryRaw<Array<{
        project_key: string;
        total_issues: bigint;
        avg_cycle_time: number;
        max_cycle_time: number;
        min_cycle_time: number;
        blocked_issues: bigint;
        churned_issues: bigint;
      }>>`
        SELECT 
          p.key as project_key,
          COUNT(*) as total_issues,
          ROUND(AVG(im.cycle_time), 2) as avg_cycle_time,
          ROUND(MAX(im.cycle_time), 2) as max_cycle_time,
          ROUND(MIN(im.cycle_time), 2) as min_cycle_time,
          COUNT(CASE WHEN im.blockers > 0 THEN 1 END) as blocked_issues,
          COUNT(CASE WHEN im.review_churn > 0 OR im.qa_churn > 0 THEN 1 END) as churned_issues
        FROM projects p
        JOIN issue_metrics im ON p.id = im.project_id
        WHERE p.id = ${project.id}
        AND im.resolved IS NOT NULL
        GROUP BY p.id, p.key
      `;
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(complexMetrics).toBeInstanceOf(Array);
      expect(complexMetrics.length).toBe(1);
      
      const metrics = complexMetrics[0];
      expect(metrics.project_key).toBe(project.key);
      expect(Number(metrics.total_issues)).toBe(3); // 3 resolved issues
      expect(parseFloat(metrics.avg_cycle_time as any)).toBeGreaterThan(0);
      expect(parseFloat(metrics.max_cycle_time as any)).toBeGreaterThan(0);
      expect(parseFloat(metrics.min_cycle_time as any)).toBeGreaterThan(0);
      
      // Should complete quickly (under 100ms for test data with indexes)
      expect(duration).toBeLessThan(100);
      
      console.log(`Complex query executed in ${duration}ms`);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain consistency between views and base tables', async () => {
      const { project } = await createCycleTimeTestScenario();
      
      // Count from base table
      const baseCount = await prisma.issue.count({
        where: { projectId: project.id }
      });
      
      // Count from view
      const viewCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM issue_metrics
        WHERE project_id = ${project.id}
      `;
      
      expect(Number(viewCount[0].count)).toBe(baseCount);
      expect(baseCount).toBe(4); // 4 test issues
      
      // Validate resolved count consistency
      const baseResolvedCount = await prisma.issue.count({
        where: { 
          projectId: project.id,
          resolved: { not: null }
        }
      });
      
      const viewResolvedCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count
        FROM issue_metrics
        WHERE project_id = ${project.id}
        AND resolved IS NOT NULL
      `;
      
      expect(Number(viewResolvedCount[0].count)).toBe(baseResolvedCount);
      expect(baseResolvedCount).toBe(3); // 3 resolved test issues
    });
  });
});