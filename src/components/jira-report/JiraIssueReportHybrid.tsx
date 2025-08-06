'use client';

import React from 'react';
import JiraIssueReportGraphQL from './JiraIssueReportGraphQL';

interface JiraIssueReportHybridProps {
  preselectedProjectKey?: string;
}

/**
 * JiraIssueReport component that uses GraphQL API exclusively
 */
const JiraIssueReportHybrid: React.FC<JiraIssueReportHybridProps> = ({ 
  preselectedProjectKey 
}) => {
  return (
    <JiraIssueReportGraphQL 
      preselectedProjectKey={preselectedProjectKey}
    />
  );
};

export default JiraIssueReportHybrid;