import { gql } from '@apollo/client';

// Upload JIRA data mutation
export const UPLOAD_JIRA_DATA = gql`
  mutation UploadJiraData(
    $data: [JiraIssueInput!]!
    $workflowMappings: [WorkflowMappingInput!]!
  ) {
    uploadJiraData(
      data: $data
      workflowMappings: $workflowMappings
    ) {
      success
      message
      projectsCreated
      issuesCreated
      sprintsCreated
    }
  }
`;

// Delete project mutation
export const DELETE_PROJECT = gql`
  mutation DeleteProject($id: ID!) {
    deleteProject(id: $id)
  }
`;