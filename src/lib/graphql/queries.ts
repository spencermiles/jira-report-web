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

// Company fragments
export const COMPANY_BASIC_FIELDS = gql`
  fragment CompanyBasicFields on Company {
    id
    name
    slug
    description
    logoUrl
    website
    isActive
    createdAt
    updatedAt
  }
`;

export const COMPANY_WITH_METRICS = gql`
  fragment CompanyWithMetrics on Company {
    ...CompanyBasicFields
    metrics {
      totalProjects
      totalIssues
      resolvedIssues
      averageLeadTime
      averageCycleTime
      flowEfficiency
      firstTimeThrough
    }
  }
  ${COMPANY_BASIC_FIELDS}
`;

// Projects queries
export const GET_PROJECTS = gql`
  ${PROJECT_WITH_METRICS}
  query GetProjects($companyId: ID!) {
    projects(companyId: $companyId) {
      ...ProjectWithMetrics
    }
  }
`;

export const GET_PROJECT_SUMMARIES = gql`
  ${PROJECT_SUMMARY_FIELDS}
  ${AGGREGATED_METRICS_FIELDS}
  query GetProjectSummaries(
    $companyId: ID!
    $filters: IssueFilters
    $pagination: PaginationInput
    $sort: SortInput
  ) {
    projectSummaries(companyId: $companyId, filters: $filters, pagination: $pagination, sort: $sort) {
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
  query GetProject($companyId: ID!, $key: String!) {
    project(companyId: $companyId, key: $key) {
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
  query GetProjectWithIssues($companyId: ID!, $key: String!, $issueFilters: IssueFilters) {
    project(companyId: $companyId, key: $key) {
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
    $companyId: ID!
    $filters: IssueFilters
    $pagination: PaginationInput
    $sort: SortInput
  ) {
    issues(companyId: $companyId, filters: $filters, pagination: $pagination, sort: $sort) {
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
  query GetIssue($companyId: ID!, $key: String!) {
    issue(companyId: $companyId, key: $key) {
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
// Company queries
export const GET_COMPANIES = gql`
  ${COMPANY_WITH_METRICS}
  query GetCompanies(
    $pagination: PaginationInput
    $search: String
    $sortBy: String
  ) {
    companies(pagination: $pagination, search: $search, sortBy: $sortBy) {
      companies {
        ...CompanyWithMetrics
      }
      totalCount
      hasNextPage
      hasPreviousPage
    }
  }
`;

export const GET_COMPANY = gql`
  ${COMPANY_WITH_METRICS}
  query GetCompany($slug: String!) {
    company(slug: $slug) {
      ...CompanyWithMetrics
    }
  }
`;

export const GET_DASHBOARD_DATA = gql`
  ${PROJECT_SUMMARY_FIELDS}
  ${AGGREGATED_METRICS_FIELDS}
  ${CYCLE_TIME_DISTRIBUTION_FIELDS}
  ${FLOW_METRICS_TREND_FIELDS}
  query GetDashboardData(
    $companyId: ID!
    $projectFilters: IssueFilters
    $pagination: PaginationInput
    $trendPeriod: String!
  ) {
    projectSummaries(companyId: $companyId, filters: $projectFilters, pagination: $pagination) {
      projects {
        ...ProjectSummaryFields
      }
      totalCount
      aggregatedMetrics {
        ...AggregatedMetricsFields
      }
    }
    cycleTimeDistribution(companyId: $companyId, filters: $projectFilters) {
      ...CycleTimeDistributionFields
    }
    flowMetricsTrend(companyId: $companyId, period: $trendPeriod, filters: $projectFilters) {
      ...FlowMetricsTrendFields
    }
  }
`;