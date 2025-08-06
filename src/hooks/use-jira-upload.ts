import { useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { useUploadJiraData } from './use-graphql';
import { useToastContext } from '@/contexts/toast-context';

interface UploadProgress {
  stage: 'parsing' | 'processing' | 'uploading' | 'complete';
  progress: number;
  message: string;
}

interface UseJiraUploadResult {
  uploading: boolean;
  progress: UploadProgress | null;
  error: string | null;
  uploadJiraFile: (file: File, companyId: string) => Promise<void>;
  clearError: () => void;
}


export function useJiraUpload(): UseJiraUploadResult {
  const client = useApolloClient();
  const toast = useToastContext();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [uploadJiraDataMutation] = useUploadJiraData({
    onError: (error) => {
      console.error('GraphQL upload error:', error);
      const errorMessage = error.message || 'Upload failed';
      setError(errorMessage);
      setUploading(false);
      setProgress(null);
      
      toast.error('Upload Failed', errorMessage);
    },
    onCompleted: (data) => {
      console.log('Upload completed:', data.uploadJiraData);
      setProgress({
        stage: 'complete',
        progress: 100,
        message: `Successfully uploaded ${data.uploadJiraData.issuesCreated} issues across ${data.uploadJiraData.projectsCreated} projects`
      });
      setUploading(false);
      
      // Optimistically update cache with new project count
      client.cache.modify({
        fields: {
          projectSummaries(existing) {
            if (!existing) return existing;
            
            return {
              ...existing,
              aggregatedMetrics: existing.aggregatedMetrics ? {
                ...existing.aggregatedMetrics,
                totalProjects: (existing.aggregatedMetrics.totalProjects || 0) + data.uploadJiraData.projectsCreated,
                totalIssues: (existing.aggregatedMetrics.totalIssues || 0) + data.uploadJiraData.issuesCreated,
              } : {
                totalProjects: data.uploadJiraData.projectsCreated,
                totalIssues: data.uploadJiraData.issuesCreated,
                totalResolvedIssues: 0,
              },
            };
          },
        },
      });
      
      // Show success toast
      toast.success(
        'Upload Successful',
        `Successfully uploaded ${data.uploadJiraData.issuesCreated} issues across ${data.uploadJiraData.projectsCreated} projects`
      );
      
      // Clear progress after a delay
      setTimeout(() => {
        setProgress(null);
      }, 3000);
    }
  });

  const uploadJiraFile = async (file: File, companyId: string) => {
    if (!file || !companyId) return;
    
    setUploading(true);
    setError(null);
    setProgress({
      stage: 'parsing',
      progress: 0,
      message: 'Reading file...'
    });

    try {
      // Parse the file
      const text = await file.text();
      setProgress({
        stage: 'parsing',
        progress: 25,
        message: 'Parsing JSON data...'
      });

      let data = JSON.parse(text);
      
      // Handle different JIRA export formats
      if (!Array.isArray(data)) {
        // Check if it's wrapped in an object (some JIRA exports do this)
        if (data.issues && Array.isArray(data.issues)) {
          data = data.issues;
        } else if (data.data && Array.isArray(data.data)) {
          data = data.data;
        } else {
          throw new Error('Invalid file format. Expected an array of issues or an object containing an "issues" array.');
        }
      }

      if (data.length === 0) {
        throw new Error('No issues found in the uploaded file.');
      }

      console.log(`Found ${data.length} issues to process`);
      console.log('Sample issue structure:', JSON.stringify(data[0], null, 2));

      setProgress({
        stage: 'processing',
        progress: 50,
        message: `Processing ${data.length} issues...`
      });

      // Extract project information from the parsed data
      const projectKeys = new Set<string>();
      const projectNames = new Map<string, string>();
      
      data.forEach((issue: any, index: number) => {
        console.log(`Processing issue ${index}:`, {
          key: issue.key,
          hasFields: !!issue.fields,
          hasProject: !!issue.fields?.project,
          projectKey: issue.fields?.project?.key,
          projectName: issue.fields?.project?.name,
        });

        // Try different possible structures for project information
        let projectKey: string | undefined;
        let projectName: string | undefined;

        if (issue.fields?.project?.key) {
          // Standard JIRA export format
          projectKey = issue.fields.project.key;
          projectName = issue.fields.project.name;
        } else if (issue.project?.key) {
          // Alternative format where project is at root level
          projectKey = issue.project.key;
          projectName = issue.project.name;
        } else if (issue.key && issue.key.includes('-')) {
          // Extract project key from issue key (e.g., "PROJ-123" -> "PROJ")
          projectKey = issue.key.split('-')[0];
          projectName = projectKey; // Use key as name if no name available
        }

        if (projectKey) {
          projectKeys.add(projectKey);
          if (projectName) {
            projectNames.set(projectKey, projectName);
          }
        }
      });

      console.log('Found project keys:', Array.from(projectKeys));
      console.log('Project names map:', Object.fromEntries(projectNames));

      if (projectKeys.size === 0) {
        // Show more detailed error information
        const sampleIssue = data[0];
        console.error('Sample issue structure:', JSON.stringify(sampleIssue, null, 2));
        throw new Error(`No valid projects found in the data. Expected issue.fields.project.key or issue.project.key or extractable from issue.key. Sample issue keys: ${data.slice(0, 3).map((i: any) => i.key || 'no-key').join(', ')}`);
      }

      console.log(`Found ${projectKeys.size} projects: ${Array.from(projectKeys).join(', ')}`);

      setProgress({
        stage: 'processing',
        progress: 75,
        message: 'Preparing data for upload...'
      });

      // Transform JIRA data to GraphQL input format
      const transformedData = data.map((issue: any, index: number) => {
        // Extract project information with fallbacks
        let projectKey: string;
        let projectName: string;

        if (issue.fields?.project?.key) {
          projectKey = issue.fields.project.key;
          projectName = issue.fields.project.name || projectKey;
        } else if (issue.project?.key) {
          projectKey = issue.project.key;
          projectName = issue.project.name || projectKey;
        } else if (issue.key && issue.key.includes('-')) {
          projectKey = issue.key.split('-')[0];
          projectName = projectNames.get(projectKey) || projectKey;
        } else {
          // Fallback to first available project if no project info found
          projectKey = Array.from(projectKeys)[0];
          projectName = projectNames.get(projectKey) || projectKey;
        }

        // Handle different story points field names (JIRA customizes these)
        const getStoryPoints = () => {
          if (issue.fields?.customfield_10016) return issue.fields.customfield_10016;
          if (issue.fields?.customfield_10002) return issue.fields.customfield_10002;
          if (issue.fields?.customfield_10004) return issue.fields.customfield_10004;
          if (issue.fields?.storyPoints) return issue.fields.storyPoints;
          if (issue.storyPoints) return issue.storyPoints;
          return null;
        };

        // Handle sprint information
        const getSprint = () => {
          if (issue.fields?.sprint?.name) return issue.fields.sprint.name;
          if (issue.fields?.customfield_10020?.name) return issue.fields.customfield_10020.name;
          if (issue.sprint?.name) return issue.sprint.name;
          return null;
        };

        // Transform changelog entries to match GraphQL schema
        const changelogs: any[] = [];
        
        // Handle standard JIRA API format (issue.changelog.histories)
        if (issue.changelog?.histories) {
          issue.changelog.histories.forEach((history: any) => {
            if (history.items) {
              history.items.forEach((item: any) => {
                changelogs.push({
                  fieldName: item.field || 'unknown',
                  fromString: item.fromString,
                  toString: item.toString,
                  created: history.created,
                });
              });
            }
          });
        }
        // Handle user's data format (issue.changelogs as direct array)
        else if (issue.changelogs && Array.isArray(issue.changelogs)) {
          issue.changelogs.forEach((changelog: any) => {
            changelogs.push({
              fieldName: changelog.field_name || 'unknown',
              fromString: changelog.from_string,
              toString: changelog.to_string,
              created: changelog.created,
            });
          });
        }

        // Transform sprint information
        const sprintInfo: any[] = [];
        const sprintName = getSprint();
        if (sprintName) {
          sprintInfo.push({
            name: sprintName,
            startDate: null, // Would need to be extracted from JIRA data if available
            endDate: null,   // Would need to be extracted from JIRA data if available
          });
        }

        // Debug priority extraction
        const priorityValue = issue.fields?.priority?.name || issue.fields?.priority || issue.priority || null;
        if (index === 0) { // Log first issue for debugging
          console.log('Priority debug for first issue:');
          console.log('  issue.fields?.priority:', JSON.stringify(issue.fields?.priority));
          console.log('  issue.priority:', issue.priority);
          console.log('  Extracted priority:', priorityValue);
        }

        return {
          jiraId: issue.id || issue.key || `UNKNOWN-${Math.random().toString(36).substr(2, 9)}`,
          key: issue.key || `UNKNOWN-${Math.random().toString(36).substr(2, 9)}`,
          summary: issue.fields?.summary || issue.summary || '',
          issueType: issue.fields?.issuetype?.name || issue.issue_type || issue.issueType || issue.type || 'Unknown',
          priority: priorityValue,
          projectKey,
          storyPoints: getStoryPoints(),
          parentKey: issue.fields?.parent?.key || issue.parent?.key || null,
          webUrl: issue.self || null,
          created: issue.fields?.created || issue.created || new Date().toISOString(),
          resolved: issue.fields?.resolved || issue.resolved || null,
          rawData: issue, // Store the entire original issue for reference
          changelogs,
          sprintInfo,
        };
      });

      setProgress({
        stage: 'uploading',
        progress: 90,
        message: 'Uploading to server...'
      });

      // Upload via GraphQL (workflow mappings will be auto-generated on backend)
      await uploadJiraDataMutation({
        variables: {
          companyId,
          data: transformedData,
          // workflowMappings is now optional and will be auto-generated
        }
      });

    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setUploading(false);
      setProgress(null);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    uploading,
    progress,
    error,
    uploadJiraFile,
    clearError,
  };
}