import { useState } from 'react';
import { JiraIssue, ProcessedStory, StoryMetrics } from '@/types/jira';

export const useJiraData = () => {
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
      }> = [];
      
      // Safely process changelogs
      for (const change of story.changelogs) {
        if (change && 
            change.field_name === 'status' && 
            change.created && 
            change.to_string) {
          statusChanges.push({
            timestamp: new Date(change.created),
            from_status: change.from_string || '',
            to_status: change.to_string || ''
          });
        }
      }

      // Sort by timestamp
      statusChanges.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      const metrics = { ...defaultMetrics };

      // Track timestamps for cycle time calculations
      let doneTime: Date | null = null;
      let readyForGroomingTime: Date | null = null;
      let inProgressTime: Date | null = null;
      let inQATime: Date | null = null;
      let inReviewTime: Date | null = null;
      
      // Use the issue creation date as the opened time (simpler and more accurate)
      const openTime = story.created ? new Date(story.created) : null;
      if (openTime) {
        metrics.timestamps.opened = openTime;
      }

      // Process each status change
      for (const change of statusChanges) {
        const status = change.to_status?.toLowerCase() || '';

        // Track key status transitions
        if (READY_FOR_DEV_STATUSES.includes(status)) {
          metrics.timestamps.readyForDev = change.timestamp;
        } else if (DONE_STATUSES.includes(status)) {
          doneTime = change.timestamp; // Always update to get the LAST time
          metrics.timestamps.done = change.timestamp;
        } else if (READY_FOR_GROOMING_STATUSES.includes(status)) {
          // Only capture the FIRST time entering Ready for Grooming
          if (!readyForGroomingTime) {
            readyForGroomingTime = change.timestamp;
            metrics.timestamps.readyForGrooming = change.timestamp;
          }
        } else if (IN_PROGRESS_STATUSES.includes(status)) {
          // Only capture the FIRST time entering In Progress
          if (!inProgressTime) {
            inProgressTime = change.timestamp;
            metrics.timestamps.inProgress = change.timestamp;
          }
        } else if (IN_QA_STATUSES.includes(status)) {
          // Capture LAST time entering In QA for dev cycle time calculation
          inQATime = change.timestamp; // Always update to get the LAST time
          metrics.timestamps.inQA = change.timestamp;
          metrics.qaChurn++;
        } else if (READY_FOR_RELEASE_STATUSES.includes(status)) {
          metrics.timestamps.readyForRelease = change.timestamp;
        } else if (IN_REVIEW_STATUSES.includes(status)) {
          // Only capture the FIRST time entering In Review for the timestamp display
          if (!inReviewTime) {
            inReviewTime = change.timestamp;
            metrics.timestamps.inReview = change.timestamp;
          }
          metrics.reviewChurn++;
        } else if (BLOCKED_STATUSES.includes(status)) {
          metrics.blockers++;
        }
      }

      // Calculate cycle times (in days)
      if (openTime && doneTime && doneTime > openTime) {
        metrics.leadTime = Math.round((doneTime.getTime() - openTime.getTime()) / (1000 * 60 * 60 * 24));
      }

      if (readyForGroomingTime && inProgressTime && inProgressTime > readyForGroomingTime) {
        metrics.groomingCycleTime = Math.round((inProgressTime.getTime() - readyForGroomingTime.getTime()) / (1000 * 60 * 60 * 24));
      }

      if (inProgressTime && inQATime && inQATime > inProgressTime) {
        metrics.devCycleTime = Math.round((inQATime.getTime() - inProgressTime.getTime()) / (1000 * 60 * 60 * 24));
      }

      if (inQATime && doneTime && doneTime > inQATime) {
        metrics.qaCycleTime = Math.round((doneTime.getTime() - inQATime.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Calculate total cycle time: In Progress → Done
      if (inProgressTime && doneTime && doneTime > inProgressTime) {
        metrics.cycleTime = Math.round((doneTime.getTime() - inProgressTime.getTime()) / (1000 * 60 * 60 * 24));
      }

      return metrics;
    } catch (err) {
      console.warn('Error calculating cycle times for story:', story?.key, err);
      return defaultMetrics;
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event || !event.target || !event.target.files) return;
    
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError('');
    setProcessedStories([]);

    try {
      const text = await file.text();
      let data: unknown;
      
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Invalid JSON format');
      }
      
      // Validate data structure
      if (!Array.isArray(data)) {
        throw new Error('JSON file must contain an array of issues');
      }
      
      // Filter and process stories
      const stories: ProcessedStory[] = [];
      
      for (let i = 0; i < data.length; i++) {
        const issue = data[i] as JiraIssue;
        
        // Safety checks
        if (!issue || typeof issue !== 'object') {
          continue;
        }
        
        try {
          const metrics = calculateCycleTimes(issue);
          
          // Count sub-issues (child issues where parent_key matches this story's key)
          const subIssueCount = data.filter((childIssue: unknown) => 
            childIssue && 
            typeof childIssue === 'object' &&
            childIssue !== null &&
            'parent_key' in childIssue &&
            (childIssue as { parent_key: string }).parent_key === issue.key
          ).length;
          
          // Get sprint information - use the most recent sprint
          let sprintName = 'No Sprint';
          if (issue.sprint_info && Array.isArray(issue.sprint_info) && issue.sprint_info.length > 0) {
            // Sort by start_date to get the most recent sprint
            const sortedSprints = issue.sprint_info
              .filter(sprint => sprint && sprint.name)
              .sort((a, b) => {
                if (!a.start_date && !b.start_date) return 0;
                if (!a.start_date) return -1;
                if (!b.start_date) return 1;
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

  return {
    processedStories,
    loading,
    error,
    handleFileUpload
  };
};