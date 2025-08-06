import { gql } from '@apollo/client';

// Core fragments for reusable field sets
export const PROJECT_CORE_FIELDS = gql`
  fragment ProjectCoreFields on Project {
    id
    key
    name
    createdAt
    updatedAt
  }
`;

export const PROJECT_METRICS_FIELDS = gql`
  fragment ProjectMetricsFields on ProjectMetrics {
    totalIssues
    resolvedIssues
    averageLeadTime
    averageCycleTime
    flowEfficiency
    firstTimeThrough
  }
`;

export const ISSUE_CORE_FIELDS = gql`
  fragment IssueCoreFields on Issue {
    id
    jiraId
    key
    summary
    issueType
    priority
    storyPoints
    parentKey
    webUrl
    created
    resolved
  }
`;

export const ISSUE_METRICS_FIELDS = gql`
  fragment IssueMetricsFields on IssueMetrics {
    leadTime
    cycleTime
    groomingCycleTime
    devCycleTime
    qaCycleTime
    blockers
    reviewChurn
    qaChurn
    stageTimestamps
  }
`;

export const SPRINT_FIELDS = gql`
  fragment SprintFields on Sprint {
    id
    name
    startDate
    endDate
  }
`;

export const WORKFLOW_MAPPING_FIELDS = gql`
  fragment WorkflowMappingFields on WorkflowMapping {
    id
    jiraStatusName
    canonicalStage
  }
`;

// Composite fragments for common query patterns
export const PROJECT_WITH_METRICS = gql`
  ${PROJECT_CORE_FIELDS}
  ${PROJECT_METRICS_FIELDS}
  fragment ProjectWithMetrics on Project {
    ...ProjectCoreFields
    metrics {
      ...ProjectMetricsFields
    }
  }
`;

export const ISSUE_WITH_METRICS = gql`
  ${ISSUE_CORE_FIELDS}
  ${ISSUE_METRICS_FIELDS}
  fragment IssueWithMetrics on Issue {
    ...IssueCoreFields
    metrics {
      ...IssueMetricsFields
    }
  }
`;

export const ISSUE_FULL = gql`
  ${ISSUE_WITH_METRICS}
  ${SPRINT_FIELDS}
  ${PROJECT_CORE_FIELDS}
  fragment IssueFull on Issue {
    ...IssueWithMetrics
    project {
      ...ProjectCoreFields
    }
    sprints {
      ...SprintFields
    }
    parent {
      id
      key
      summary
    }
    children {
      id
      key
      summary
      issueType
      priority
      resolved
    }
  }
`;

// Core fields for ProjectWithSummary type
export const PROJECT_WITH_SUMMARY_CORE_FIELDS = gql`
  fragment ProjectWithSummaryCoreFields on ProjectWithSummary {
    id
    key
    name
    createdAt
    updatedAt
  }
`;

export const PROJECT_SUMMARY_FIELDS = gql`
  ${PROJECT_WITH_SUMMARY_CORE_FIELDS}
  ${PROJECT_METRICS_FIELDS}
  fragment ProjectSummaryFields on ProjectWithSummary {
    ...ProjectWithSummaryCoreFields
    metrics {
      ...ProjectMetricsFields
    }
    issueCount
    lastActivity
  }
`;

export const CYCLE_TIME_DISTRIBUTION_FIELDS = gql`
  fragment CycleTimeDistributionFields on CycleTimeDistributionBucket {
    range
    count
    percentage
  }
`;

export const FLOW_METRICS_TREND_FIELDS = gql`
  fragment FlowMetricsTrendFields on FlowMetricsTrendPoint {
    period
    averageCycleTime
    averageLeadTime
    flowEfficiency
    throughput
    firstTimeThrough
  }
`;

// Aggregated metrics fields
export const AGGREGATED_METRICS_FIELDS = gql`
  fragment AggregatedMetricsFields on AggregatedMetrics {
    totalProjects
    totalIssues
    totalResolvedIssues
    overallAverageLeadTime
    overallAverageCycleTime
    overallFlowEfficiency
  }
`;