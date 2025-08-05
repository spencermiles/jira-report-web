import { gql } from 'graphql-tag';

export const typeDefs = gql`
  scalar DateTime
  scalar JSON

  type Project {
    id: ID!
    key: String!
    name: String!
    issues(filters: IssueFilters): [Issue!]!
    metrics: ProjectMetrics!
    sprints: [Sprint!]!
    workflowMappings: [WorkflowMapping!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type WorkflowMapping {
    id: ID!
    projectId: Int!
    jiraStatusName: String!
    canonicalStage: String!
  }

  type Sprint {
    id: ID!
    name: String!
    startDate: DateTime
    endDate: DateTime
    projectId: Int!
    project: Project!
    issues: [Issue!]!
    createdAt: DateTime!
  }

  type Issue {
    id: ID!
    jiraId: String!
    key: String!
    summary: String!
    issueType: String!
    priority: String
    project: Project!
    storyPoints: Int
    parentKey: String
    webUrl: String
    created: DateTime!
    resolved: DateTime
    sprints: [Sprint!]!
    metrics: IssueMetrics!
    statusChanges: [StatusChange!]!
    rawData: JSON!
    parent: Issue
    children: [Issue!]!
  }

  type IssueMetrics {
    leadTime: Float
    cycleTime: Float
    groomingCycleTime: Float
    devCycleTime: Float
    qaCycleTime: Float
    blockers: Int!
    reviewChurn: Int!
    qaChurn: Int!
    stageTimestamps: JSON!
  }

  type StatusChange {
    id: ID!
    issueId: Int!
    fieldName: String!
    fromValue: String
    toValue: String
    changed: DateTime!
    createdAt: DateTime!
  }

  type ProjectMetrics {
    totalIssues: Int!
    resolvedIssues: Int!
    averageLeadTime: Float
    averageCycleTime: Float
    flowEfficiency: Float
    firstTimeThrough: Float
  }

  input IssueFilters {
    projectKeys: [String!]
    issueTypes: [String!]
    priorities: [String!]
    sprints: [String!]
    storyPoints: [Int!]
    statuses: [String!]
    createdAfter: DateTime
    createdBefore: DateTime
    resolvedAfter: DateTime
    resolvedBefore: DateTime
    # Enhanced filtering options
    cycleTimeMin: Float
    cycleTimeMax: Float
    leadTimeMin: Float
    leadTimeMax: Float
    hasBlockers: Boolean
    hasChurn: Boolean
    parentKey: String
    search: String
    tags: [String!]
  }

  input PaginationInput {
    limit: Int = 50
    offset: Int = 0
  }

  input SortInput {
    field: String! # "created", "resolved", "cycleTime", "leadTime", "priority", "storyPoints"
    direction: SortDirection! = ASC
  }

  enum SortDirection {
    ASC
    DESC
  }

  type IssuesResponse {
    issues: [Issue!]!
    totalCount: Int!
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
  }

  type ProjectSummaryResponse {
    projects: [ProjectWithSummary!]!
    totalCount: Int!
    aggregatedMetrics: AggregatedMetrics!
  }

  type ProjectWithSummary {
    id: ID!
    key: String!
    name: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    metrics: ProjectMetrics!
    issueCount: Int!
    lastActivity: DateTime
  }

  type AggregatedMetrics {
    totalProjects: Int!
    totalIssues: Int!
    totalResolvedIssues: Int!
    overallAverageLeadTime: Float
    overallAverageCycleTime: Float
    overallFlowEfficiency: Float
  }

  input JiraIssueInput {
    jiraId: String!
    key: String!
    summary: String!
    issueType: String!
    priority: String
    projectKey: String!
    storyPoints: Int
    parentKey: String
    webUrl: String
    created: DateTime!
    resolved: DateTime
    rawData: JSON!
    changelogs: [ChangelogInput!]!
    sprintInfo: [SprintInfoInput!]!
  }

  input ChangelogInput {
    fieldName: String!
    fromString: String
    toString: String
    created: DateTime!
  }

  input SprintInfoInput {
    name: String!
    startDate: DateTime
    endDate: DateTime
  }

  input WorkflowMappingInput {
    jiraStatusName: String!
    canonicalStage: String!
  }

  type UploadResult {
    success: Boolean!
    message: String!
    projectsCreated: Int!
    issuesCreated: Int!
    sprintsCreated: Int!
  }

  type Query {
    projects: [Project!]!
    project(key: String!): Project
    projectSummaries(
      filters: IssueFilters
      pagination: PaginationInput
      sort: SortInput
    ): ProjectSummaryResponse!
    issues(
      filters: IssueFilters
      pagination: PaginationInput
      sort: SortInput
    ): IssuesResponse!
    issue(key: String!): Issue
    # Advanced analytics queries
    cycleTimeDistribution(
      projectKeys: [String!]
      filters: IssueFilters
    ): [CycleTimeDistributionBucket!]!
    flowMetricsTrend(
      projectKeys: [String!]
      period: String! # "week", "month", "quarter"
      filters: IssueFilters
    ): [FlowMetricsTrendPoint!]!
  }

  type CycleTimeDistributionBucket {
    range: String! # "0-1", "1-3", "3-7", etc.
    count: Int!
    percentage: Float!
  }

  type FlowMetricsTrendPoint {
    period: String! # "2024-01", "2024-W01", etc.
    averageCycleTime: Float
    averageLeadTime: Float
    flowEfficiency: Float
    throughput: Int!
    firstTimeThrough: Float
  }

  type Mutation {
    uploadJiraData(
      data: [JiraIssueInput!]!
      workflowMappings: [WorkflowMappingInput!]!
      projectKey: String!
      projectName: String!
    ): UploadResult!
    deleteProject(id: ID!): Boolean!
  }
`;