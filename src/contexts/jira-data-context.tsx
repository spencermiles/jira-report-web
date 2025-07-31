'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { JiraIssue, ProcessedStory, StoryMetrics } from '@/types/jira';

interface JiraDataContextType {
  processedStories: ProcessedStory[];
  loading: boolean;
  error: string | null;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  clearData: () => void;
}

const JiraDataContext = createContext<JiraDataContextType | undefined>(undefined);

export const useJiraDataContext = () => {
  const context = useContext(JiraDataContext);
  if (context === undefined) {
    throw new Error('useJiraDataContext must be used within a JiraDataProvider');
  }
  return context;
};

interface JiraDataProviderProps {
  children: ReactNode;
}

export const JiraDataProvider: React.FC<JiraDataProviderProps> = ({ children }) => {
  const [processedStories, setProcessedStories] = useState<ProcessedStory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateCycleTimes = (story: JiraIssue): StoryMetrics => {
    // Status constants - each status can have multiple possible values (lowercase for case insensitive matching)
    const READY_FOR_GROOMING_STATUSES = ['ready for grooming'];
    const READY_FOR_DEV_STATUSES = ['ready for dev'];
    const IN_PROGRESS_STATUSES = ['in progress', 'dev in progress', 'in development'];
    const IN_REVIEW_STATUSES = ['in review', 'in code review (pr submitted)', 'in review'];
    const IN_QA_STATUSES = ['in qa', 'dev test', 'in testing'];
    const READY_FOR_RELEASE_STATUSES = ['ready for release', 'ready for tranche 0'];
    const BLOCKED_STATUSES = ['blocked', 'blocked / on hold'];
    const DONE_STATUSES = ['done', 'ready for release'];

    const defaultMetrics: StoryMetrics = {
      leadTime: null,
      cycleTime: null,
      groomingCycleTime: null,
      devCycleTime: null,
      qaCycleTime: null,
      blockers: 0,
      reviewChurn: 0,
      qaChurn: 0,
      timestamps: {
        opened: null,
        readyForDev: null,
        readyForGrooming: null,
        inProgress: null,
        inReview: null,
        inQA: null,
        done: null,
        readyForRelease: null
      }
    };

    try {
      // Safety check for changelogs
      if (!story || !story.changelogs || !Array.isArray(story.changelogs) || story.changelogs.length === 0) {
        return defaultMetrics;
      }

      const statusChanges: Array<{
        timestamp: Date;
        from_status: string;
        to_status: string;
      }> = story.changelogs
        .filter(cl => cl.field_name === 'status' && cl.created)
        .map(cl => ({
          timestamp: new Date(cl.created),
          from_status: (cl.from_string || '').toLowerCase(),
          to_status: (cl.to_string || '').toLowerCase()
        }))
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // Calculate metrics
      const metrics = { ...defaultMetrics };
      
      // Set opened timestamp
      if (story.created) {
        metrics.timestamps.opened = new Date(story.created);
      }

      // Track status transitions
      for (const change of statusChanges) {
        const { timestamp, to_status } = change;

        if (READY_FOR_GROOMING_STATUSES.includes(to_status) && !metrics.timestamps.readyForGrooming) {
          metrics.timestamps.readyForGrooming = timestamp;
        }
        
        if (READY_FOR_DEV_STATUSES.includes(to_status) && !metrics.timestamps.readyForDev) {
          metrics.timestamps.readyForDev = timestamp;
        }
        
        if (IN_PROGRESS_STATUSES.includes(to_status) && !metrics.timestamps.inProgress) {
          metrics.timestamps.inProgress = timestamp;
        }
        
        if (IN_REVIEW_STATUSES.includes(to_status) && !metrics.timestamps.inReview) {
          metrics.timestamps.inReview = timestamp;
        }
        
        if (IN_QA_STATUSES.includes(to_status) && !metrics.timestamps.inQA) {
          metrics.timestamps.inQA = timestamp;
        }
        
        if (READY_FOR_RELEASE_STATUSES.includes(to_status) && !metrics.timestamps.readyForRelease) {
          metrics.timestamps.readyForRelease = timestamp;
        }
        
        if (DONE_STATUSES.includes(to_status) && !metrics.timestamps.done) {
          metrics.timestamps.done = timestamp;
        }

        // Count blockers
        if (BLOCKED_STATUSES.includes(to_status)) {
          metrics.blockers++;
        }

        // Count review churn (going back to in progress from review)
        if (IN_PROGRESS_STATUSES.includes(to_status) && change.from_status && IN_REVIEW_STATUSES.includes(change.from_status)) {
          metrics.reviewChurn++;
        }

        // Count QA churn (going back to in progress from QA)
        if (IN_PROGRESS_STATUSES.includes(to_status) && change.from_status && IN_QA_STATUSES.includes(change.from_status)) {
          metrics.qaChurn++;
        }
      }

      // Set done timestamp from story.resolved if available
      if (story.resolved && !metrics.timestamps.done) {
        metrics.timestamps.done = new Date(story.resolved);
      }

      // Calculate cycle times
      if (metrics.timestamps.inProgress && metrics.timestamps.done) {
        metrics.cycleTime = (metrics.timestamps.done.getTime() - metrics.timestamps.inProgress.getTime()) / (1000 * 60 * 60 * 24);
      }

      if (metrics.timestamps.opened && metrics.timestamps.done) {
        metrics.leadTime = (metrics.timestamps.done.getTime() - metrics.timestamps.opened.getTime()) / (1000 * 60 * 60 * 24);
      }

      if (metrics.timestamps.readyForGrooming && metrics.timestamps.readyForDev) {
        metrics.groomingCycleTime = (metrics.timestamps.readyForDev.getTime() - metrics.timestamps.readyForGrooming.getTime()) / (1000 * 60 * 60 * 24);
      }

      if (metrics.timestamps.inProgress && metrics.timestamps.inReview) {
        metrics.devCycleTime = (metrics.timestamps.inReview.getTime() - metrics.timestamps.inProgress.getTime()) / (1000 * 60 * 60 * 24);
      }

      if (metrics.timestamps.inQA && metrics.timestamps.done) {
        metrics.qaCycleTime = (metrics.timestamps.done.getTime() - metrics.timestamps.inQA.getTime()) / (1000 * 60 * 60 * 24);
      }

      return metrics;
    } catch (err) {
      console.warn('Error calculating cycle times for story:', story.key || 'unknown', err);
      return defaultMetrics;
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid file format. Expected an array of issues.');
      }

      const stories: ProcessedStory[] = [];
      
      for (let i = 0; i < data.length; i++) {
        const issue = data[i] as JiraIssue;
        
        try {
          // Calculate sub-issue count
          let subIssueCount = 0;
          if (issue.key) {
            subIssueCount = data.filter((otherIssue: JiraIssue) => 
              otherIssue.parent_key === issue.key
            ).length;
          }

          // Calculate metrics
          const metrics = calculateCycleTimes(issue);

          // Determine sprint name
          let sprintName = 'No Sprint';
          if (issue.sprint_info && Array.isArray(issue.sprint_info) && issue.sprint_info.length > 0) {
            // Sort sprints by start date to get the most recent one
            const sortedSprints = [...issue.sprint_info]
              .filter(sprint => sprint.name)
              .sort((a, b) => {
                if (!a.start_date && !b.start_date) return 0;
                if (!a.start_date) return 1;
                if (!b.start_date) return -1;
                return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
              });
            
            if (sortedSprints.length > 0) {
              sprintName = sortedSprints[0].name;
            }
          }
          
          stories.push({
            id: issue.id || `story-${i}`,
            key: issue.key || 'Unknown',
            summary: issue.summary || 'No summary',
            issue_type: issue.issue_type || 'Unknown',
            project_key: issue.project_key || 'Unknown',
            sprint: sprintName,
            created: issue.created || '',
            resolved: issue.resolved || undefined,
            story_points: issue.story_points || undefined,
            subIssueCount: subIssueCount,
            web_url: issue.web_url || undefined,
            metrics: metrics
          });
        } catch (storyErr) {
          console.warn(`Error processing issue ${issue.key || i}:`, storyErr);
          // Skip this issue but continue processing others
          continue;
        }
      }
      
      setProcessedStories(stories);
      
    } catch (err) {
      console.error('File processing error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Error processing file: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const clearData = () => {
    setProcessedStories([]);
    setError(null);
  };

  const value: JiraDataContextType = {
    processedStories,
    loading,
    error,
    handleFileUpload,
    clearData
  };

  return (
    <JiraDataContext.Provider value={value}>
      {children}
    </JiraDataContext.Provider>
  );
};