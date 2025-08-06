// GraphQL Response Types
export interface GraphQLIssue {
  id: string;
  key: string;
  summary: string;
  description?: string;
  issueType: string;
  status: string;
  priority?: string;
  assignee?: string;
  reporter?: string;
  created: string;
  updated: string;
  resolved?: string;
  storyPoints?: number;
  sprint?: string;
  projectKey: string;
  parentKey?: string;
  metrics?: {
    leadTime?: number;
    cycleTime?: number;
    groomingCycleTime?: number;
    devCycleTime?: number;
    qaCycleTime?: number;
    blockers?: number;
    reviewChurn?: number;
    qaChurn?: number;
    stageTimestamps?: Record<string, string>;
  };
}

export interface GraphQLProject {
  id: string;
  key: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  metrics?: {
    totalIssues: number;
    resolvedIssues: number;
    averageLeadTime?: number;
    averageCycleTime?: number;
    flowEfficiency?: number;
    firstTimeThrough?: number;
  };
  issues?: GraphQLIssue[];
}

export interface GraphQLProjectSummary {
  key: string;
  name: string;
  issueCount: number;
  lastActivity?: string;
  metrics: {
    resolvedIssues: number;
    averageCycleTime?: number;
    averageLeadTime?: number;
    flowEfficiency?: number;
    firstTimeThrough?: number;
  };
}

export interface GraphQLAggregatedMetrics {
  totalProjects: number;
  totalIssues: number;
  totalResolvedIssues: number;
  overallAverageCycleTime?: number;
  overallAverageLeadTime?: number;
  overallFlowEfficiency?: number;
}

export interface GraphQLProjectSummariesResponse {
  projects: GraphQLProjectSummary[];
  totalCount: number;
  aggregatedMetrics?: GraphQLAggregatedMetrics;
}