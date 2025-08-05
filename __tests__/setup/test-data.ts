import { prisma } from './test-db';

export interface TestProject {
  id: number;
  key: string;
  name: string;
}

export interface TestIssue {
  id: number;
  jiraId: string;
  key: string;
  summary: string;
  issueType: string;
  priority: string;
  projectId: number;
  storyPoints: number;
  created: Date;
  resolved?: Date;
}

export async function createTestProject(key: string, name: string): Promise<TestProject> {
  return await prisma.project.create({
    data: {
      key,
      name,
    },
  });
}

export async function createWorkflowMappings(projectId: number) {
  const mappings = [
    { jiraStatusName: 'To Do', canonicalStage: 'BACKLOG' },
    { jiraStatusName: 'Backlog', canonicalStage: 'BACKLOG' },
    { jiraStatusName: 'Ready for Grooming', canonicalStage: 'READY_FOR_GROOMING' },
    { jiraStatusName: 'Ready for Dev', canonicalStage: 'READY_FOR_DEV' },
    { jiraStatusName: 'In Progress', canonicalStage: 'IN_PROGRESS' },
    { jiraStatusName: 'In Review', canonicalStage: 'IN_REVIEW' },
    { jiraStatusName: 'In QA', canonicalStage: 'IN_QA' },
    { jiraStatusName: 'Ready for Release', canonicalStage: 'READY_FOR_RELEASE' },
    { jiraStatusName: 'Done', canonicalStage: 'DONE' },
    { jiraStatusName: 'Blocked', canonicalStage: 'BLOCKED' },
  ];

  await prisma.workflowMapping.createMany({
    data: mappings.map(mapping => ({
      projectId,
      jiraStatusName: mapping.jiraStatusName,
      canonicalStage: mapping.canonicalStage,
    })),
  });
}

export async function createTestIssue(issueData: Partial<TestIssue> & { projectId: number }): Promise<TestIssue> {
  const issue = await prisma.issue.create({
    data: {
      jiraId: issueData.jiraId || `jira-${Date.now()}`,
      key: issueData.key || `TEST-${Date.now()}`,
      summary: issueData.summary || 'Test issue',
      issueType: issueData.issueType || 'Story',
      priority: issueData.priority || 'P2',
      projectId: issueData.projectId,
      storyPoints: issueData.storyPoints || 5,
      created: issueData.created || new Date(),
      resolved: issueData.resolved,
      rawData: {},
    },
  });

  return issue;
}

export async function createStatusChange(
  issueId: number,
  fromValue: string | null,
  toValue: string,
  changed: Date
) {
  return await prisma.statusChange.create({
    data: {
      issueId,
      fieldName: 'status',
      fromValue,
      toValue,
      changed,
    },
  });
}

// Create a complete test scenario with known cycle times
export async function createCycleTimeTestScenario() {
  // Create test project
  const project = await createTestProject('TEST', 'Test Project');
  await createWorkflowMappings(project.id);

  // Base date for predictable calculations
  const baseDate = new Date('2024-01-01T09:00:00Z');
  
  // Issue that goes through complete workflow - should have 14 day cycle time
  const issue1 = await createTestIssue({
    jiraId: 'test-001',
    key: 'TEST-001',
    summary: 'Complete workflow issue',
    projectId: project.id,
    storyPoints: 8,
    created: baseDate,
    resolved: new Date('2024-01-20T17:00:00Z'), // 19.33 days lead time
  });

  // Status changes for TEST-001 (14 days from In Progress to Done)
  await createStatusChange(issue1.id, null, 'To Do', baseDate);
  await createStatusChange(issue1.id, 'To Do', 'Ready for Grooming', new Date('2024-01-02T10:00:00Z'));
  await createStatusChange(issue1.id, 'Ready for Grooming', 'Ready for Dev', new Date('2024-01-03T11:00:00Z'));
  await createStatusChange(issue1.id, 'Ready for Dev', 'In Progress', new Date('2024-01-05T09:00:00Z')); // Start cycle time
  await createStatusChange(issue1.id, 'In Progress', 'In Review', new Date('2024-01-12T17:00:00Z')); // 7.33 days dev
  await createStatusChange(issue1.id, 'In Review', 'In QA', new Date('2024-01-15T14:00:00Z')); // 2.88 days review
  await createStatusChange(issue1.id, 'In QA', 'Done', new Date('2024-01-19T09:00:00Z')); // 3.79 days QA, 14 days total cycle

  // Issue with churn - goes back from review to dev
  const issue2 = await createTestIssue({
    jiraId: 'test-002',
    key: 'TEST-002',
    summary: 'Issue with review churn',
    projectId: project.id,
    storyPoints: 5,
    created: new Date('2024-01-10T09:00:00Z'),
    resolved: new Date('2024-01-25T17:00:00Z'),
  });

  // Status changes for TEST-002 with churn
  await createStatusChange(issue2.id, null, 'In Progress', new Date('2024-01-12T09:00:00Z'));
  await createStatusChange(issue2.id, 'In Progress', 'In Review', new Date('2024-01-15T17:00:00Z'));
  await createStatusChange(issue2.id, 'In Review', 'In Progress', new Date('2024-01-17T10:00:00Z')); // Churn back
  await createStatusChange(issue2.id, 'In Progress', 'In Review', new Date('2024-01-20T14:00:00Z'));
  await createStatusChange(issue2.id, 'In Review', 'Done', new Date('2024-01-25T17:00:00Z'));

  // Issue with blockers
  const issue3 = await createTestIssue({
    jiraId: 'test-003',
    key: 'TEST-003',
    summary: 'Issue with blockers',
    projectId: project.id,
    storyPoints: 3,
    created: new Date('2024-01-15T09:00:00Z'),
    resolved: new Date('2024-01-30T17:00:00Z'),
  });

  // Status changes for TEST-003 with blockers
  await createStatusChange(issue3.id, null, 'In Progress', new Date('2024-01-16T09:00:00Z'));
  await createStatusChange(issue3.id, 'In Progress', 'Blocked', new Date('2024-01-18T15:00:00Z'));
  await createStatusChange(issue3.id, 'Blocked', 'In Progress', new Date('2024-01-22T10:00:00Z'));
  await createStatusChange(issue3.id, 'In Progress', 'Done', new Date('2024-01-30T17:00:00Z'));

  // Unresolved issue
  const issue4 = await createTestIssue({
    jiraId: 'test-004',
    key: 'TEST-004',
    summary: 'In progress issue',
    projectId: project.id,
    storyPoints: 13,
    created: new Date('2024-01-20T09:00:00Z'),
  });

  await createStatusChange(issue4.id, null, 'In Progress', new Date('2024-01-22T09:00:00Z'));

  return {
    project,
    issues: [issue1, issue2, issue3, issue4],
  };
}