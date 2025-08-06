'use client';

/**
 * @deprecated This localStorage-based context has been replaced with GraphQL.
 * This file is kept for backward compatibility but should not be used in new code.
 * All data now flows through the GraphQL API.
 */

import React, { ReactNode } from 'react';

// Interface removed - no longer needed

// Removed JiraDataContext - use GraphQL instead

export const useJiraDataContext = () => {
  console.warn('useJiraDataContext is deprecated. Use GraphQL hooks instead.');
  
  return {
    processedStories: [],
    loading: false,
    error: null,
    isHydrated: true,
    handleFileUpload: () => {
      console.warn('localStorage upload is deprecated. Use GraphQL upload instead.');
    },
    clearData: () => {
      console.warn('localStorage clearData is deprecated.');
    },
  };
};

interface JiraDataProviderProps {
  children: ReactNode;
}

export const JiraDataProvider: React.FC<JiraDataProviderProps> = ({ children }) => {
  console.warn('JiraDataProvider is deprecated. Remove from your component tree.');
  return <>{children}</>;
};