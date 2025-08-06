import { gql } from '@apollo/client';
import {
  PROJECT_WITH_METRICS,
  PROJECT_SUMMARY_FIELDS,
  ISSUE_WITH_METRICS,
  ISSUE_FULL,
  SPRINT_FIELDS,
  WORKFLOW_MAPPING_FIELDS,
  AGGREGATED_METRICS_FIELDS,
  CYCLE_TIME_DISTRIBUTION_FIELDS,
  FLOW_METRICS_TREND_FIELDS,
} from './fragments';

// Projects queries
export const GET_PROJECTS = gql`
  ${PROJECT_WITH_METRICS}
  query GetProjects {
    projects {
      ...ProjectWithMetrics
    }
  }
`;

export const GET_PROJECT_SUMMARIES = gql`
  ${PROJECT_SUMMARY_FIELDS}
  ${AGGREGATED_METRICS_FIELDS}
  query GetProjectSummaries(
    $filters: IssueFilters
    $pagination: PaginationInput
    $sort: SortInput
  ) {
    projectSummaries(filters: $filters, pagination: $pagination, sort: $sort) {
      projects {
        ...ProjectSummaryFields
      }
      totalCount
      aggregatedMetrics {
        ...AggregatedMetricsFields
      }
    }
  }
`;

export const GET_PROJECT = gql`
  ${PROJECT_WITH_METRICS}
  ${SPRINT_FIELDS}
  ${WORKFLOW_MAPPING_FIELDS}
  query GetProject($key: String!) {
    project(key: $key) {
      ...ProjectWithMetrics
      sprints {
        ...SprintFields
      }
      workflowMappings {
        ...WorkflowMappingFields
      }
    }
  }
`;

export const GET_PROJECT_WITH_ISSUES = gql`
  ${PROJECT_WITH_METRICS}
  ${ISSUE_WITH_METRICS}
  ${SPRINT_FIELDS}
  ${WORKFLOW_MAPPING_FIELDS}
  query GetProjectWithIssues($key: String!, $issueFilters: IssueFilters) {
    project(key: $key) {
      ...ProjectWithMetrics
      issues(filters: $issueFilters) {
        ...IssueWithMetrics
      }
      sprints {
        ...SprintFields
      }
      workflowMappings {
        ...WorkflowMappingFields
      }
    }
  }
`;

// Issues queries
export const GET_ISSUES = gql`
  ${ISSUE_WITH_METRICS}
  query GetIssues(
    $filters: IssueFilters
    $pagination: PaginationInput
    $sort: SortInput
  ) {
    issues(filters: $filters, pagination: $pagination, sort: $sort) {
      issues {
        ...IssueWithMetrics
      }
      totalCount
      hasNextPage
      hasPreviousPage
    }
  }
`;

export const GET_ISSUE = gql`
  ${ISSUE_FULL}
  query GetIssue($key: String!) {
    issue(key: $key) {
      ...IssueFull
    }
  }
`;

// Analytics queries
export const GET_CYCLE_TIME_DISTRIBUTION = gql`
  ${CYCLE_TIME_DISTRIBUTION_FIELDS}
  query GetCycleTimeDistribution(
    $projectKeys: [String!]
    $filters: IssueFilters
  ) {
    cycleTimeDistribution(projectKeys: $projectKeys, filters: $filters) {
      ...CycleTimeDistributionFields
    }
  }
`;

export const GET_FLOW_METRICS_TREND = gql`
  ${FLOW_METRICS_TREND_FIELDS}
  query GetFlowMetricsTrend(
    $projectKeys: [String!]!
    $period: String!
    $filters: IssueFilters
  ) {
    flowMetricsTrend(
      projectKeys: $projectKeys
      period: $period
      filters: $filters
    ) {
      ...FlowMetricsTrendFields
    }
  }
`;

// Combined queries for dashboard views
export const GET_DASHBOARD_DATA = gql`
  ${PROJECT_SUMMARY_FIELDS}
  ${AGGREGATED_METRICS_FIELDS}
  ${CYCLE_TIME_DISTRIBUTION_FIELDS}
  ${FLOW_METRICS_TREND_FIELDS}
  query GetDashboardData(
    $projectFilters: IssueFilters
    $pagination: PaginationInput
    $trendPeriod: String!
  ) {
    projectSummaries(filters: $projectFilters, pagination: $pagination) {
      projects {
        ...ProjectSummaryFields
      }
      totalCount
      aggregatedMetrics {
        ...AggregatedMetricsFields
      }
    }
    cycleTimeDistribution(filters: $projectFilters) {
      ...CycleTimeDistributionFields
    }
    flowMetricsTrend(period: $trendPeriod, filters: $projectFilters) {
      ...FlowMetricsTrendFields
    }
  }
`;