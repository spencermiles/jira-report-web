import DataLoader from 'dataloader';
import { prisma } from '../db';

// DataLoader for projects by ID
export const projectLoader = new DataLoader<number, any>(async (projectIds: readonly number[]) => {
  const projects = await prisma.project.findMany({
    where: { id: { in: [...projectIds] } }
  });
  
  const projectMap = new Map(projects.map(project => [project.id, project]));
  return projectIds.map(id => projectMap.get(id) || null);
});

// DataLoader for project metrics using database view
export const projectMetricsLoader = new DataLoader<number, any>(async (projectIds: readonly number[]) => {
  const metrics = await prisma.$queryRaw<Array<{
    id: number;
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
      id,
      total_issues,
      resolved_issues,
      avg_lead_time,
      avg_cycle_time,
      median_lead_time,
      median_cycle_time,
      flow_efficiency,
      first_time_through
    FROM project_summary 
    WHERE id = ANY(${[...projectIds]}::int[])
  `;
  
  const metricsMap = new Map(
    metrics.map(metric => [
      metric.id,
      {
        totalIssues: Number(metric.total_issues),
        resolvedIssues: Number(metric.resolved_issues),
        // Use median for consistency with individual project screen
        averageLeadTime: metric.median_lead_time ? parseFloat(metric.median_lead_time.toString()) : null,
        averageCycleTime: metric.median_cycle_time ? parseFloat(metric.median_cycle_time.toString()) : null,
        flowEfficiency: metric.flow_efficiency ? parseFloat(metric.flow_efficiency.toString()) : null,
        firstTimeThrough: metric.first_time_through ? parseFloat(metric.first_time_through.toString()) : null
      }
    ])
  );
  
  return projectIds.map(id => metricsMap.get(id) || {
    totalIssues: 0,
    resolvedIssues: 0,
    averageLeadTime: null,
    averageCycleTime: null,
    flowEfficiency: null,
    firstTimeThrough: null
  });
});

// DataLoader for issue metrics using database view
export const issueMetricsLoader = new DataLoader<number, any>(async (issueIds: readonly number[]) => {
  const metrics = await prisma.$queryRaw<Array<{
    id: number;
    lead_time: number | null;
    cycle_time: number | null;
    grooming_cycle_time: number | null;
    dev_cycle_time: number | null;
    qa_cycle_time: number | null;
    blockers: bigint;
    review_churn: bigint;
    qa_churn: bigint;
    stage_timestamps: any;
  }>>`
    SELECT 
      id,
      lead_time,
      cycle_time,
      grooming_cycle_time,
      dev_cycle_time,
      qa_cycle_time,
      blockers,
      review_churn,
      qa_churn,
      stage_timestamps
    FROM issue_metrics 
    WHERE id = ANY(${[...issueIds]}::int[])
  `;
  
  const metricsMap = new Map(
    metrics.map(metric => [
      metric.id,
      {
        leadTime: metric.lead_time ? parseFloat(metric.lead_time.toString()) : null,
        cycleTime: metric.cycle_time ? parseFloat(metric.cycle_time.toString()) : null,
        groomingCycleTime: metric.grooming_cycle_time ? parseFloat(metric.grooming_cycle_time.toString()) : null,
        devCycleTime: metric.dev_cycle_time ? parseFloat(metric.dev_cycle_time.toString()) : null,
        qaCycleTime: metric.qa_cycle_time ? parseFloat(metric.qa_cycle_time.toString()) : null,
        blockers: Number(metric.blockers),
        reviewChurn: Number(metric.review_churn),
        qaChurn: Number(metric.qa_churn),
        stageTimestamps: metric.stage_timestamps || {}
      }
    ])
  );
  
  return issueIds.map(id => metricsMap.get(id) || {
    leadTime: null,
    cycleTime: null,
    groomingCycleTime: null,
    devCycleTime: null,
    qaCycleTime: null,
    blockers: 0,
    reviewChurn: 0,
    qaChurn: 0,
    stageTimestamps: {}
  });
});

// DataLoader for sprints by project ID
export const sprintsByProjectLoader = new DataLoader<number, any[]>(async (projectIds: readonly number[]) => {
  const sprints = await prisma.sprint.findMany({
    where: { projectId: { in: [...projectIds] } },
    orderBy: { startDate: 'desc' }
  });
  
  const sprintsByProject = new Map<number, any[]>();
  
  // Initialize empty arrays for all project IDs
  projectIds.forEach(id => sprintsByProject.set(id, []));
  
  // Group sprints by project ID
  sprints.forEach(sprint => {
    const existing = sprintsByProject.get(sprint.projectId) || [];
    existing.push(sprint);
    sprintsByProject.set(sprint.projectId, existing);
  });
  
  return projectIds.map(id => sprintsByProject.get(id) || []);
});

// DataLoader for workflow mappings by project ID
export const workflowMappingsByProjectLoader = new DataLoader<number, any[]>(async (projectIds: readonly number[]) => {
  const mappings = await prisma.workflowMapping.findMany({
    where: { projectId: { in: [...projectIds] } }
  });
  
  const mappingsByProject = new Map<number, any[]>();
  
  // Initialize empty arrays for all project IDs
  projectIds.forEach(id => mappingsByProject.set(id, []));
  
  // Group mappings by project ID
  mappings.forEach(mapping => {
    const existing = mappingsByProject.get(mapping.projectId) || [];
    existing.push(mapping);
    mappingsByProject.set(mapping.projectId, existing);
  });
  
  return projectIds.map(id => mappingsByProject.get(id) || []);
});

// DataLoader for sprints by issue ID
export const sprintsByIssueLoader = new DataLoader<number, any[]>(async (issueIds: readonly number[]) => {
  const issuesSprints = await prisma.issuesSprints.findMany({
    where: { issueId: { in: [...issueIds] } },
    include: { sprint: true }
  });
  
  const sprintsByIssue = new Map<number, any[]>();
  
  // Initialize empty arrays for all issue IDs
  issueIds.forEach(id => sprintsByIssue.set(id, []));
  
  // Group sprints by issue ID
  issuesSprints.forEach(is => {
    const existing = sprintsByIssue.get(is.issueId) || [];
    existing.push(is.sprint);
    sprintsByIssue.set(is.issueId, existing);
  });
  
  return issueIds.map(id => sprintsByIssue.get(id) || []);
});

// DataLoader for status changes by issue ID
export const statusChangesByIssueLoader = new DataLoader<number, any[]>(async (issueIds: readonly number[]) => {
  const statusChanges = await prisma.statusChange.findMany({
    where: { issueId: { in: [...issueIds] } },
    orderBy: { changed: 'asc' }
  });
  
  const changesByIssue = new Map<number, any[]>();
  
  // Initialize empty arrays for all issue IDs
  issueIds.forEach(id => changesByIssue.set(id, []));
  
  // Group status changes by issue ID
  statusChanges.forEach(change => {
    const existing = changesByIssue.get(change.issueId) || [];
    existing.push(change);
    changesByIssue.set(change.issueId, existing);
  });
  
  return issueIds.map(id => changesByIssue.get(id) || []);
});

// DataLoader for parent issues by key
export const issueByKeyLoader = new DataLoader<string, any>(async (keys: readonly string[]) => {
  const issues = await prisma.issue.findMany({
    where: { key: { in: [...keys] } }
  });
  
  const issueMap = new Map(issues.map(issue => [issue.key, issue]));
  return keys.map(key => issueMap.get(key) || null);
});

// DataLoader for children issues by parent key
export const childrenByParentKeyLoader = new DataLoader<string, any[]>(async (parentKeys: readonly string[]) => {
  const children = await prisma.issue.findMany({
    where: { parentKey: { in: [...parentKeys] } }
  });
  
  const childrenByParent = new Map<string, any[]>();
  
  // Initialize empty arrays for all parent keys
  parentKeys.forEach(key => childrenByParent.set(key, []));
  
  // Group children by parent key
  children.forEach(child => {
    if (child.parentKey) {
      const existing = childrenByParent.get(child.parentKey) || [];
      existing.push(child);
      childrenByParent.set(child.parentKey, existing);
    }
  });
  
  return parentKeys.map(key => childrenByParent.get(key) || []);
});

// Function to create fresh DataLoader instances for each request
export function createDataLoaders() {
  return {
    projectLoader: new DataLoader<number, any>(async (projectIds: readonly number[]) => {
      const projects = await prisma.project.findMany({
        where: { id: { in: [...projectIds] } }
      });
      
      const projectMap = new Map(projects.map(project => [project.id, project]));
      return projectIds.map(id => projectMap.get(id) || null);
    }),
    
    projectMetricsLoader,
    issueMetricsLoader,
    sprintsByProjectLoader,
    workflowMappingsByProjectLoader,
    sprintsByIssueLoader,
    statusChangesByIssueLoader,
    issueByKeyLoader,
    childrenByParentKeyLoader
  };
}

export type DataLoaders = ReturnType<typeof createDataLoaders>;