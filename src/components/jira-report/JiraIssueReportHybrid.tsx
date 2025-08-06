'use client';

import React from 'react';
import JiraIssueReportGraphQL from './JiraIssueReportGraphQL';

interface JiraIssueReportHybridProps {
  preselectedProjectKey?: string;
  companyId?: string;
}

/**
 * JiraIssueReport component that uses GraphQL API exclusively
 */
const JiraIssueReportHybrid: React.FC<JiraIssueReportHybridProps> = ({ 
  preselectedProjectKey,
  companyId
}) => {
  return (
    <JiraIssueReportGraphQL 
      preselectedProjectKey={preselectedProjectKey}
      companyId={companyId}
    />
  );
};

export default JiraIssueReportHybrid;