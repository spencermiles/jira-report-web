'use client';

import React, { useState } from 'react';
import { Upload, FileText, Calendar, AlertCircle, HelpCircle, CalendarDays } from 'lucide-react';
import { 
  JiraIssue, 
  ProcessedStory, 
  StoryMetrics, 
  StatsResult, 
  TooltipType
} from '@/types/jira';

const JiraStoryReport = () => {
  const [processedStories, setProcessedStories] = useState<ProcessedStory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [hoveredTooltip, setHoveredTooltip] = useState<TooltipType>(null);

  // Filter states
  const [filters, setFilters] = useState({
    issueTypes: [] as string[],
    sprints: [] as string[],
    storyPoints: [] as (number | 'none')[],
    startDate: '' as string,
    endDate: '' as string
  });

  // Get unique values for filters
  const getFilterOptions = () => {
    const issueTypes = [...new Set(processedStories.map(story => story.issue_type))].sort();
    const sprints = [...new Set(processedStories.map(story => story.sprint))].filter(Boolean).sort();
    const storyPointsSet = new Set<number | 'none'>();
    
    processedStories.forEach(story => {
      if (story.story_points && story.story_points > 0) {
        storyPointsSet.add(story.story_points);
      } else {
        storyPointsSet.add('none');
      }
    });
    
    const storyPoints = Array.from(storyPointsSet).sort((a, b) => {
      if (a === 'none') return 1;
      if (b === 'none') return -1;
      return a - b;
    });

    return { issueTypes, sprints, storyPoints };
  };

  // Apply filters to stories
  const filteredStories = processedStories.filter(story => {
    // Issue type filter
    if (filters.issueTypes.length > 0 && !filters.issueTypes.includes(story.issue_type)) {
      return false;
    }

    // Sprint filter
    if (filters.sprints.length > 0 && !filters.sprints.includes(story.sprint)) {
      return false;
    }

    // Story points filter
    if (filters.storyPoints.length > 0) {
      const storyPointValue = (story.story_points && story.story_points > 0) ? story.story_points : 'none';
      if (!filters.storyPoints.includes(storyPointValue)) {
        return false;
      }
    }

    // Date range filter
    if (filters.startDate || filters.endDate) {
      const createdDate = new Date(story.created);
      
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        if (createdDate < startDate) {
          return false;
        }
      }
      
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999); // Include the entire end date
        if (createdDate > endDate) {
          return false;
        }
      }
    }

    return true;
  });

  // Count stories for each filter option
  const getFilterCounts = () => {
    const { issueTypes, sprints, storyPoints } = getFilterOptions();
    
    const issueTypeCounts = issueTypes.map(type => ({
      value: type,
      count: processedStories.filter(story => {
        // Apply other active filters but not issue type filter
        if (filters.sprints.length > 0 && !filters.sprints.includes(story.sprint)) return false;
        if (filters.storyPoints.length > 0) {
          const storyPointValue = (story.story_points && story.story_points > 0) ? story.story_points : 'none';
          if (!filters.storyPoints.includes(storyPointValue)) return false;
        }
        // Apply date filter
        if (filters.startDate || filters.endDate) {
          const createdDate = new Date(story.created);
          if (filters.startDate && createdDate < new Date(filters.startDate)) return false;
          if (filters.endDate) {
            const endDate = new Date(filters.endDate);
            endDate.setHours(23, 59, 59, 999);
            if (createdDate > endDate) return false;
          }
        }
        return story.issue_type === type;
      }).length
    }));

    const sprintCounts = sprints.map(sprint => ({
      value: sprint,
      count: processedStories.filter(story => {
        // Apply other active filters but not sprint filter
        if (filters.issueTypes.length > 0 && !filters.issueTypes.includes(story.issue_type)) return false;
        if (filters.storyPoints.length > 0) {
          const storyPointValue = (story.story_points && story.story_points > 0) ? story.story_points : 'none';
          if (!filters.storyPoints.includes(storyPointValue)) return false;
        }
        // Apply date filter
        if (filters.startDate || filters.endDate) {
          const createdDate = new Date(story.created);
          if (filters.startDate && createdDate < new Date(filters.startDate)) return false;
          if (filters.endDate) {
            const endDate = new Date(filters.endDate);
            endDate.setHours(23, 59, 59, 999);
            if (createdDate > endDate) return false;
          }
        }
        return story.sprint === sprint;
      }).length
    }));

    const storyPointCounts = storyPoints.map(points => ({
      value: points,
      count: processedStories.filter(story => {
        // Apply other active filters but not story points filter
        if (filters.issueTypes.length > 0 && !filters.issueTypes.includes(story.issue_type)) return false;
        if (filters.sprints.length > 0 && !filters.sprints.includes(story.sprint)) return false;
        // Apply date filter
        if (filters.startDate || filters.endDate) {
          const createdDate = new Date(story.created);
          if (filters.startDate && createdDate < new Date(filters.startDate)) return false;
          if (filters.endDate) {
            const endDate = new Date(filters.endDate);
            endDate.setHours(23, 59, 59, 999);
            if (createdDate > endDate) return false;
          }
        }
        const storyPointValue = (story.story_points && story.story_points > 0) ? story.story_points : 'none';
        return storyPointValue === points;
      }).length
    }));

    return { issueTypeCounts, sprintCounts, storyPointCounts };
  };

  // Filter toggle functions
  const toggleIssueType = (issueType: string) => {
    setFilters(prev => ({
      ...prev,
      issueTypes: prev.issueTypes.includes(issueType)
        ? prev.issueTypes.filter(t => t !== issueType)
        : [...prev.issueTypes, issueType]
    }));
  };

  const toggleSprint = (sprint: string) => {
    setFilters(prev => ({
      ...prev,
      sprints: prev.sprints.includes(sprint)
        ? prev.sprints.filter(s => s !== sprint)
        : [...prev.sprints, sprint]
    }));
  };

  const toggleStoryPoint = (points: number | 'none') => {
    setFilters(prev => ({
      ...prev,
      storyPoints: prev.storyPoints.includes(points)
        ? prev.storyPoints.filter(p => p !== points)
        : [...prev.storyPoints, points]
    }));
  };

  const setStartDate = (date: string) => {
    setFilters(prev => ({
      ...prev,
      startDate: date
    }));
  };

  const setEndDate = (date: string) => {
    setFilters(prev => ({
      ...prev,
      endDate: date
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      issueTypes: [],
      sprints: [],
      storyPoints: [],
      startDate: '',
      endDate: ''
    });
  };

  const hasActiveFilters = filters.issueTypes.length > 0 || filters.sprints.length > 0 || filters.storyPoints.length > 0 || filters.startDate || filters.endDate;

  const calculateCycleTimes = (story: JiraIssue): StoryMetrics => {
    const defaultMetrics: StoryMetrics = {
      leadTime: null,
      groomingCycleTime: null,
      devCycleTime: null,
      qaCycleTime: null,
      blockers: 0,
      reviewChurn: 0,
      qaChurn: 0,
      timestamps: {
        draft: null,
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
      let draftTime: Date | null = null;

      // Process each status change
      for (const change of statusChanges) {
        const status = change.to_status;

        // Track key status transitions
        if (status === 'Draft') {
          // Only capture the FIRST time entering Draft
          if (!draftTime) {
            draftTime = change.timestamp;
            metrics.timestamps.draft = change.timestamp;
          }
        } else if (status === 'Ready for Dev') {
          metrics.timestamps.readyForDev = change.timestamp;
        } else if (status === 'Done') {
          doneTime = change.timestamp; // Always update to get the LAST time
          metrics.timestamps.done = change.timestamp;
        } else if (status === 'Ready for Grooming') {
          // Only capture the FIRST time entering Ready for Grooming
          if (!readyForGroomingTime) {
            readyForGroomingTime = change.timestamp;
            metrics.timestamps.readyForGrooming = change.timestamp;
          }
        } else if (status === 'In Progress') {
          // Only capture the FIRST time entering In Progress
          if (!inProgressTime) {
            inProgressTime = change.timestamp;
            metrics.timestamps.inProgress = change.timestamp;
          }
        } else if (status === 'In QA') {
          // Capture FIRST time entering In QA for QA cycle time calculation
          if (!inQATime) {
            inQATime = change.timestamp;
            metrics.timestamps.inQA = change.timestamp;
          }
          metrics.qaChurn++;
        } else if (status === 'Ready For Release') {
          metrics.timestamps.readyForRelease = change.timestamp;
        } else if (status === 'In Review') {
          // Only capture the FIRST time entering In Review for the timestamp display
          if (!inReviewTime) {
            inReviewTime = change.timestamp;
            metrics.timestamps.inReview = change.timestamp;
          }
          metrics.reviewChurn++;
        } else if (status === 'Blocked' || status === 'Blocked / On Hold') {
          metrics.blockers++;
        }
      }

      // Calculate cycle times (in days)
      if (draftTime && doneTime && doneTime > draftTime) {
        metrics.leadTime = Math.round((doneTime.getTime() - draftTime.getTime()) / (1000 * 60 * 60 * 24));
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
            sprint: sprintName,
            created: issue.created || '',
            resolved: issue.resolved || undefined,
            story_points: issue.story_points || undefined,
            subIssueCount: subIssueCount,
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

  const calculateStats = (values: (number | null)[]): StatsResult => {
    const validValues = values.filter((v): v is number => v !== null && typeof v === 'number' && !isNaN(v));
    
    if (validValues.length === 0) {
      return { median: 0, mean: 0, min: 0, max: 0, stdDev: 0, count: 0 };
    }
    
    const sorted = [...validValues].sort((a, b) => a - b);
    const sum = validValues.reduce((acc, val) => acc + val, 0);
    const mean = sum / validValues.length;
    
    // Calculate median
    let median: number;
    if (sorted.length % 2 === 0) {
      median = (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
    } else {
      median = sorted[Math.floor(sorted.length / 2)];
    }
    
    // Calculate standard deviation
    const variance = validValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / validValues.length;
    const stdDev = Math.sqrt(variance);
    
    return {
      median: Math.round(median * 10) / 10,
      mean: Math.round(mean * 10) / 10,
      min: Math.min(...validValues),
      max: Math.max(...validValues),
      stdDev: Math.round(stdDev * 10) / 10,
      count: validValues.length
    };
  };

  const calculateCorrelation = (xValues: number[], yValues: number[]): number => {
    if (xValues.length !== yValues.length || xValues.length < 2) {
      return 0;
    }

    const n = xValues.length;
    const xMean = xValues.reduce((sum, x) => sum + x, 0) / n;
    const yMean = yValues.reduce((sum, y) => sum + y, 0) / n;

    let numerator = 0;
    let xSumSquares = 0;
    let ySumSquares = 0;

    for (let i = 0; i < n; i++) {
      const xDiff = xValues[i] - xMean;
      const yDiff = yValues[i] - yMean;
      
      numerator += xDiff * yDiff;
      xSumSquares += xDiff * xDiff;
      ySumSquares += yDiff * yDiff;
    }

    const denominator = Math.sqrt(xSumSquares * ySumSquares);
    
    if (denominator === 0) {
      return 0;
    }

    return numerator / denominator;
  };

  const calculateStoryPointsCorrelation = () => {
    // Get stories that have both story points and dev cycle time
    const validPairs = filteredStories
      .filter(story => 
        story.story_points && 
        story.story_points > 0 && 
        story.metrics.devCycleTime !== null && 
        story.metrics.devCycleTime > 0
      )
      .map(story => ({
        storyPoints: story.story_points!,
        devDays: story.metrics.devCycleTime!
      }));

    if (validPairs.length < 2) {
      return { correlation: 0, count: 0 };
    }

    const storyPoints = validPairs.map(pair => pair.storyPoints);
    const devDays = validPairs.map(pair => pair.devDays);
    
    const correlation = calculateCorrelation(storyPoints, devDays);
    
    return {
      correlation: Math.round(correlation * 1000) / 1000, // Round to 3 decimal places
      count: validPairs.length
    };
  };

  const calculateQAChurnCorrelation = () => {
    // Get stories that have both QA churn and QA cycle time
    const validPairs = filteredStories
      .filter(story => 
        story.metrics.qaChurn >= 0 && 
        story.metrics.qaCycleTime !== null && 
        story.metrics.qaCycleTime > 0
      )
      .map(story => ({
        qaChurn: story.metrics.qaChurn,
        qaCycleDays: story.metrics.qaCycleTime!
      }));

    if (validPairs.length < 2) {
      return { correlation: 0, count: 0 };
    }

    const qaChurn = validPairs.map(pair => pair.qaChurn);
    const qaCycleDays = validPairs.map(pair => pair.qaCycleDays);
    
    const correlation = calculateCorrelation(qaChurn, qaCycleDays);
    
    return {
      correlation: Math.round(correlation * 1000) / 1000, // Round to 3 decimal places
      count: validPairs.length
    };
  };

  // Flow Efficiency: Active Time / Total Lead Time
  const calculateFlowEfficiency = () => {
    const validStories = filteredStories.filter(story => 
      story.metrics.leadTime && story.metrics.leadTime > 0
    );

    if (validStories.length === 0) {
      return { efficiency: 0, count: 0 };
    }

    const efficiencies = validStories.map(story => {
      const activeTime = (story.metrics.groomingCycleTime || 0) + 
                        (story.metrics.devCycleTime || 0) + 
                        (story.metrics.qaCycleTime || 0);
      const totalTime = story.metrics.leadTime!;
      return activeTime / totalTime;
    });

    const avgEfficiency = efficiencies.reduce((sum, eff) => sum + eff, 0) / efficiencies.length;
    
    return {
      efficiency: Math.round(avgEfficiency * 1000) / 10, // Convert to percentage
      count: validStories.length
    };
  };

  // Stage Variability (Coefficient of Variation)
  const calculateStageVariability = () => {
    const stages = ['groomingCycleTime', 'devCycleTime', 'qaCycleTime'] as const;
    const stageNames = ['Grooming', 'Development', 'QA'];
    
    return stages.map((stage, index) => {
      const values = filteredStories
        .map(story => story.metrics[stage])
        .filter((v): v is number => v !== null && v > 0);
      
      if (values.length < 2) {
        return { stage: stageNames[index], cv: 0, count: 0 };
      }

      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      const cv = mean > 0 ? stdDev / mean : 0;

      return {
        stage: stageNames[index],
        cv: Math.round(cv * 1000) / 1000,
        count: values.length
      };
    });
  };

  // First-Time-Through Rate
  const calculateFirstTimeThrough = () => {
    let firstTimeCount = 0;
    const totalStories = filteredStories.length;

    for (const story of filteredStories) {
      // True first-time-through means NO rework - zero bounces from review or QA
      const hasNoRework = story.metrics.reviewChurn === 0 && story.metrics.qaChurn === 0;
      if (hasNoRework) {
        firstTimeCount++;
      }
    }

    return {
      rate: totalStories > 0 ? Math.round((firstTimeCount / totalStories) * 1000) / 10 : 0,
      firstTimeCount,
      totalStories
    };
  };

  // Size Distribution Analysis
  const calculateSizeDistribution = () => {
    const sizeGroups: Record<string, { 
      count: number; 
      medianLeadTime: number; 
      medianGroomingTime: number;
      medianDevTime: number;
      medianQATime: number;
      completionRate: number; 
    }> = {
      'Small (1pt)': { count: 0, medianLeadTime: 0, medianGroomingTime: 0, medianDevTime: 0, medianQATime: 0, completionRate: 0 },
      'Medium (2-3pts)': { count: 0, medianLeadTime: 0, medianGroomingTime: 0, medianDevTime: 0, medianQATime: 0, completionRate: 0 },
      'Large (4+pts)': { count: 0, medianLeadTime: 0, medianGroomingTime: 0, medianDevTime: 0, medianQATime: 0, completionRate: 0 },
      'Unestimated': { count: 0, medianLeadTime: 0, medianGroomingTime: 0, medianDevTime: 0, medianQATime: 0, completionRate: 0 }
    };

    const groupData: Record<string, { 
      leadTimes: number[]; 
      groomingTimes: number[];
      devTimes: number[];
      qaTimes: number[];
      completed: number; 
    }> = {
      'Small (1pt)': { leadTimes: [], groomingTimes: [], devTimes: [], qaTimes: [], completed: 0 },
      'Medium (2-3pts)': { leadTimes: [], groomingTimes: [], devTimes: [], qaTimes: [], completed: 0 },
      'Large (4+pts)': { leadTimes: [], groomingTimes: [], devTimes: [], qaTimes: [], completed: 0 },
      'Unestimated': { leadTimes: [], groomingTimes: [], devTimes: [], qaTimes: [], completed: 0 }
    };

    filteredStories.forEach(story => {
      const points = story.story_points || 0;
      const isCompleted = !!story.resolved;
      const leadTime = story.metrics.leadTime;
      const groomingTime = story.metrics.groomingCycleTime;
      const devTime = story.metrics.devCycleTime;
      const qaTime = story.metrics.qaCycleTime;

      let group: string;
      if (points === 0) group = 'Unestimated';
      else if (points === 1) group = 'Small (1pt)';
      else if (points >= 2 && points <= 3) group = 'Medium (2-3pts)';
      else group = 'Large (4+pts)'; // 4+ points

      sizeGroups[group].count++;
      if (isCompleted) groupData[group].completed++;
      if (leadTime) groupData[group].leadTimes.push(leadTime);
      if (groomingTime) groupData[group].groomingTimes.push(groomingTime);
      if (devTime) groupData[group].devTimes.push(devTime);
      if (qaTime) groupData[group].qaTimes.push(qaTime);
    });

    // Helper function to calculate median
    const calculateMedian = (values: number[]): number => {
      if (values.length === 0) return 0;
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
      }
      return sorted[mid];
    };

    Object.keys(sizeGroups).forEach(group => {
      const data = groupData[group];
      sizeGroups[group].completionRate = sizeGroups[group].count > 0 
        ? Math.round((data.completed / sizeGroups[group].count) * 1000) / 10
        : 0;
      sizeGroups[group].medianLeadTime = Math.round(calculateMedian(data.leadTimes) * 10) / 10;
      sizeGroups[group].medianGroomingTime = Math.round(calculateMedian(data.groomingTimes) * 10) / 10;
      sizeGroups[group].medianDevTime = Math.round(calculateMedian(data.devTimes) * 10) / 10;
      sizeGroups[group].medianQATime = Math.round(calculateMedian(data.qaTimes) * 10) / 10;
    });

    return sizeGroups;
  };

  // Stage Skip Analysis
  const calculateStageSkips = () => {
    let skippedGrooming = 0;
    let skippedReview = 0;
    const totalStories = filteredStories.length;

    filteredStories.forEach(story => {
      // If story went directly from Draft/Created to In Progress without Ready for Grooming
      if (!story.metrics.timestamps.readyForGrooming && story.metrics.timestamps.inProgress) {
        skippedGrooming++;
      }
      
      // If story went directly from In Progress to QA without Review
      if (!story.metrics.timestamps.inReview && story.metrics.timestamps.inProgress && story.metrics.timestamps.inQA) {
        skippedReview++;
      }
    });

    return {
      groomingSkipRate: totalStories > 0 ? Math.round((skippedGrooming / totalStories) * 1000) / 10 : 0,
      reviewSkipRate: totalStories > 0 ? Math.round((skippedReview / totalStories) * 1000) / 10 : 0,
      skippedGrooming,
      skippedReview,
      totalStories
    };
  };

  // Blocked Time Analysis
  const calculateBlockedTimeAnalysis = () => {
    const storiesWithBlocks = filteredStories.filter(story => story.metrics.blockers > 0);
    
    if (storiesWithBlocks.length === 0) {
      return { blockedTimeRatio: 0, avgBlockedTime: 0, storiesBlocked: 0, totalStories: filteredStories.length };
    }

    // Estimate blocked time (rough approximation: 2 days per blocker incident)
    const estimatedBlockedTime = storiesWithBlocks.reduce((sum, story) => {
      return sum + (story.metrics.blockers * 2); // 2 days per block estimate
    }, 0);

    const totalLeadTime = storiesWithBlocks.reduce((sum, story) => {
      return sum + (story.metrics.leadTime || 0);
    }, 0);

    const blockedTimeRatio = totalLeadTime > 0 ? (estimatedBlockedTime / totalLeadTime) * 100 : 0;
    const avgBlockedTime = storiesWithBlocks.length > 0 ? estimatedBlockedTime / storiesWithBlocks.length : 0;

    return {
      blockedTimeRatio: Math.round(blockedTimeRatio * 10) / 10,
      avgBlockedTime: Math.round(avgBlockedTime * 10) / 10,
      storiesBlocked: storiesWithBlocks.length,
      totalStories: filteredStories.length
    };
  };

  const formatTimestamp = (timestamp: Date | null): string => {
    if (!timestamp) return '-';
    try {
      return timestamp.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const StatCard = ({ title, stats, unit = '' }: { title: string; stats: StatsResult; unit?: string }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">{title}</h3>
      <div className="text-2xl font-bold text-gray-900 mb-1">
        {stats.median}{unit}
        <span className="text-sm font-normal text-gray-500 ml-1">median</span>
      </div>
      <div className="text-xs text-gray-600 space-y-1">
        <div className="flex justify-between">
          <span>Mean:</span>
          <span>{stats.mean}{unit}</span>
        </div>
        <div className="flex justify-between">
          <span>Range:</span>
          <span>{stats.min}-{stats.max}{unit}</span>
        </div>
        <div className="flex justify-between">
          <span>Std Dev:</span>
          <span>{stats.stdDev}{unit}</span>
        </div>
        <div className="flex justify-between">
          <span>Count:</span>
          <span>{stats.count}</span>
        </div>
      </div>
    </div>
  );

  const MetricHelpPopover = ({ 
    title, 
    description, 
    calculation, 
    interpretation 
  }: { 
    title: string;
    description: string;
    calculation: string;
    interpretation: string;
  }) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
      <div className="relative inline-block">
        <button
          onMouseEnter={() => setIsVisible(true)}
          onMouseLeave={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
        
        {isVisible && (
          <div className="absolute z-50 w-80 p-4 bg-white border border-gray-200 rounded-lg shadow-lg -top-2 left-6">
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 text-sm">{title}</h4>
              
              <div>
                <h5 className="font-medium text-gray-700 text-xs mb-1">What it measures:</h5>
                <p className="text-xs text-gray-600 leading-relaxed">{description}</p>
              </div>
              
              <div>
                <h5 className="font-medium text-gray-700 text-xs mb-1">How it&apos;s calculated:</h5>
                <p className="text-xs text-gray-600 leading-relaxed">{calculation}</p>
              </div>
              
              <div>
                <h5 className="font-medium text-gray-700 text-xs mb-1">How to interpret:</h5>
                <p className="text-xs text-gray-600 leading-relaxed">{interpretation}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const CorrelationCard = ({ 
    title, 
    correlation, 
    count, 
    description,
    helpContent
  }: { 
    title: string; 
    correlation: number; 
    count: number;
    description: string;
    helpContent: {
      title: string;
      description: string;
      calculation: string;
      interpretation: string;
    };
  }) => {
    const getCorrelationColor = (r: number) => {
      const absR = Math.abs(r);
      if (absR >= 0.7) return 'text-green-600';
      if (absR >= 0.5) return 'text-yellow-600';
      if (absR >= 0.3) return 'text-orange-600';
      return 'text-red-600';
    };

    const getCorrelationStrength = (r: number) => {
      const absR = Math.abs(r);
      if (absR >= 0.7) return 'Strong';
      if (absR >= 0.5) return 'Moderate';
      if (absR >= 0.3) return 'Weak';
      return 'Very Weak';
    };

    const getSimpleExplanation = (r: number, description: string) => {
      const absR = Math.abs(r);
      const direction = r >= 0 ? 'increases' : 'decreases';
      
      if (absR >= 0.7) {
        return `Strong relationship: ${description} ${direction} together reliably.`;
      } else if (absR >= 0.5) {
        return `Moderate relationship: ${description} ${direction} together sometimes.`;
      } else if (absR >= 0.3) {
        return `Weak relationship: ${description} might ${direction === 'increases' ? 'increase' : 'decrease'} together.`;
      } else {
        return `Very weak relationship: ${description} don't really ${direction === 'increases' ? 'increase' : 'decrease'} together.`;
      }
    };

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</h3>
          <MetricHelpPopover {...helpContent} />
        </div>
        <div className={`text-2xl font-bold mb-1 ${getCorrelationColor(correlation)}`}>
          {correlation}
          <span className="text-sm font-normal text-gray-500 ml-1">r-value</span>
        </div>
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span>Strength:</span>
            <span>{getCorrelationStrength(correlation)}</span>
          </div>
          <div className="flex justify-between">
            <span>Direction:</span>
            <span>{correlation >= 0 ? 'Positive' : 'Negative'}</span>
          </div>
          <div className="flex justify-between">
            <span>Sample Size:</span>
            <span>{count}</span>
          </div>
          <div className="flex justify-between">
            <span>R²:</span>
            <span>{Math.round(correlation * correlation * 1000) / 1000}</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-500 leading-relaxed">
            {getSimpleExplanation(correlation, description)}
          </p>
        </div>
      </div>
    );
  };

  const FlowMetricCard = ({ 
    title, 
    value, 
    unit, 
    description, 
    color = 'text-blue-600',
    details,
    helpContent
  }: { 
    title: string; 
    value: number | string; 
    unit?: string; 
    description: string;
    color?: string;
    details?: Array<{ label: string; value: string | number }>;
    helpContent: {
      title: string;
      description: string;
      calculation: string;
      interpretation: string;
    };
  }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</h3>
        <MetricHelpPopover {...helpContent} />
      </div>
      <div className={`text-2xl font-bold mb-1 ${color}`}>
        {value}{unit}
      </div>
      {details && (
        <div className="text-xs text-gray-600 space-y-1 mb-2">
          {details.map((detail, index) => (
            <div key={index} className="flex justify-between">
              <span>{detail.label}:</span>
              <span>{detail.value}</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 pt-2 border-t border-gray-100">
        <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
      </div>
    </div>
  );

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Not resolved';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const sortStories = (field: string) => {
    let direction: 'asc' | 'desc' = 'desc';
    
    if (sortConfig && sortConfig.key === field && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    
    setSortConfig({ key: field, direction });
  };

  // Apply sorting to filtered stories
  const sortedAndFilteredStories = [...filteredStories].sort((a, b) => {
    if (!sortConfig) return 0;
    
    const { key, direction } = sortConfig;
    const multiplier = direction === 'asc' ? 1 : -1;
    
    if (key === 'key') {
      return a.key.localeCompare(b.key) * multiplier;
    }
    if (key === 'summary') {
      return a.summary.localeCompare(b.summary) * multiplier;
    }
    if (key === 'issue_type') {
      return a.issue_type.localeCompare(b.issue_type) * multiplier;
    }
    if (key === 'sprint') {
      return a.sprint.localeCompare(b.sprint) * multiplier;
    }
    if (key === 'created') {
      return (new Date(a.created).getTime() - new Date(b.created).getTime()) * multiplier;
    }
    if (key === 'resolved') {
      const aResolved = a.resolved ? new Date(a.resolved).getTime() : 0;
      const bResolved = b.resolved ? new Date(b.resolved).getTime() : 0;
      return (aResolved - bResolved) * multiplier;
    }
    if (key === 'story_points') {
      const aPoints = a.story_points || 0;
      const bPoints = b.story_points || 0;
      return (aPoints - bPoints) * multiplier;
    }
    if (key === 'subIssueCount') {
      return (a.subIssueCount - b.subIssueCount) * multiplier;
    }
    if (key.startsWith('metrics.')) {
      const metricKey = key.replace('metrics.', '') as keyof StoryMetrics;
      const aValue = a.metrics[metricKey] || 0;
      const bValue = b.metrics[metricKey] || 0;
      return (Number(aValue) - Number(bValue)) * multiplier;
    }
    
    return 0;
  });

  // Sidebar Filter Component
  const FilterSidebar = () => {
    const { issueTypeCounts, sprintCounts, storyPointCounts } = getFilterCounts();

    return (
      <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 space-y-6 overflow-y-auto h-screen sticky top-0" style={{ minWidth: '256px' }}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Filters</h3>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Date Range Filter */}
        <div>
          <h4 className="font-medium text-gray-700 text-sm mb-3 flex items-center">
            <CalendarDays className="h-4 w-4 mr-1" />
            Date Range
          </h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            {(filters.startDate || filters.endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Clear dates
              </button>
            )}
          </div>
        </div>

        {/* Issue Type Filter */}
        <div>
          <h4 className="font-medium text-gray-700 text-sm mb-3">Issue Type</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {issueTypeCounts.map(({ value, count }) => (
              <label key={value} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                <input
                  type="checkbox"
                  checked={filters.issueTypes.includes(value)}
                  onChange={() => toggleIssueType(value)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 flex-1">{value}</span>
                <span className="text-xs text-gray-500">({count})</span>
              </label>
            ))}
          </div>
        </div>

        {/* Sprint Filter */}
        <div>
          <h4 className="font-medium text-gray-700 text-sm mb-3">Sprint</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {sprintCounts.map(({ value, count }) => (
              <label key={value} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                <input
                  type="checkbox"
                  checked={filters.sprints.includes(value)}
                  onChange={() => toggleSprint(value)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 flex-1 truncate" title={value}>{value}</span>
                <span className="text-xs text-gray-500">({count})</span>
              </label>
            ))}
          </div>
        </div>

        {/* Story Points Filter */}
        <div>
          <h4 className="font-medium text-gray-700 text-sm mb-3">Story Points</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {storyPointCounts.map(({ value, count }) => (
              <label key={value} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                <input
                  type="checkbox"
                  checked={filters.storyPoints.includes(value)}
                  onChange={() => toggleStoryPoint(value)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 flex-1">
                  {value === 'none' ? 'No Points' : `${value} points`}
                </span>
                <span className="text-xs text-gray-500">({count})</span>
              </label>
            ))}
          </div>
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="pt-4 border-t border-gray-200">
            <h4 className="font-medium text-gray-700 text-sm mb-2">Active Filters</h4>
            <div className="text-xs text-gray-600">
              <div>Filtered: {filteredStories.length}</div>
              <div>Total: {processedStories.length}</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Filter Sidebar - only show when there are stories */}
      {processedStories.length > 0 && <FilterSidebar />}
      
      {/* Main Content */}
      <div className="flex-1 p-6 bg-white">
        <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">JIRA Story Report</h1>
        <p className="text-gray-600">Upload your JIRA JSON export to view all Story issues with cycle time analysis</p>
      </div>

      {/* File Upload */}
      <div className="mb-6">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <label className="cursor-pointer">
            <span className="text-lg font-medium text-gray-900">
              Choose JSON file
            </span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          <p className="text-sm text-gray-500 mt-2">
            Select your JIRA export JSON file
          </p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">Processing file...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {processedStories.length > 0 && (
        <div>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Issues: {filteredStories.length} {hasActiveFilters && `of ${processedStories.length}`}
            </h2>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Clear All Filters
              </button>
            )}
          </div>

          {/* Top Level Metrics */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary Metrics</h3>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <StatCard 
                title="Lead Time" 
                stats={calculateStats(filteredStories.map(s => s.metrics.leadTime))} 
                unit=" days" 
              />
              <StatCard 
                title="Grooming Time" 
                stats={calculateStats(filteredStories.map(s => s.metrics.groomingCycleTime))} 
                unit=" days" 
              />
              <StatCard 
                title="Dev Time" 
                stats={calculateStats(filteredStories.map(s => s.metrics.devCycleTime))} 
                unit=" days" 
              />
              <StatCard 
                title="QA Time" 
                stats={calculateStats(filteredStories.map(s => s.metrics.qaCycleTime))} 
                unit=" days" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <CorrelationCard 
                title="Points ↔ Dev Days"
                correlation={calculateStoryPointsCorrelation().correlation}
                count={calculateStoryPointsCorrelation().count}
                description="higher story points and longer dev time"
                helpContent={{
                  title: "Story Points vs Development Time Correlation",
                  description: "Measures how well story point estimates predict actual development time. A strong positive correlation means larger estimates reliably take longer to develop.",
                  calculation: "Pearson correlation coefficient (r) between story points and development cycle time. R² shows the percentage of variance explained by the relationship.",
                  interpretation: "r > 0.7 indicates excellent estimation accuracy. 0.5-0.7 is good. 0.3-0.5 suggests estimation needs improvement. <0.3 means estimates don't predict reality well."
                }}
              />
              <CorrelationCard 
                title="QA Churn ↔ QA Time"
                correlation={calculateQAChurnCorrelation().correlation}
                count={calculateQAChurnCorrelation().count}
                description="more QA rounds and longer QA time"
                helpContent={{
                  title: "QA Churn vs QA Time Correlation",
                  description: "Measures the relationship between the number of times a story bounces back from QA and the total time spent in QA testing.",
                  calculation: "Pearson correlation coefficient between QA churn count (number of times story returned from QA) and QA cycle time in days.",
                  interpretation: "Strong positive correlation indicates QA rework significantly extends testing time. This suggests either quality issues in development or unclear acceptance criteria."
                }}
              />
            </div>
          </div>

          {/* Flow & Process Analysis */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Flow & Process Analysis</h3>
            
            {/* Row 1: Flow Efficiency & Stage Variability */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
                             <FlowMetricCard
                 title="Flow Efficiency"
                 value={calculateFlowEfficiency().efficiency}
                 unit="%"
                 description="Percentage of lead time spent actively working vs waiting. Higher is better (25%+ is excellent)."
                 color={calculateFlowEfficiency().efficiency >= 25 ? 'text-green-600' : 
                        calculateFlowEfficiency().efficiency >= 15 ? 'text-yellow-600' : 'text-red-600'}
                 details={[
                   { label: 'Stories Analyzed', value: calculateFlowEfficiency().count }
                 ]}
                 helpContent={{
                   title: "Flow Efficiency",
                   description: "The percentage of total lead time where work is actively being performed vs time spent waiting in queues or blocked.",
                   calculation: "(Grooming Time + Dev Time + QA Time) / Total Lead Time × 100. Only includes time in active work states.",
                   interpretation: "25%+ is excellent, 15-25% is good, 10-15% needs attention, <10% indicates serious waste. Low efficiency means too much waiting time between stages."
                 }}
               />
              
                             {calculateStageVariability().map((stage) => (
                 <FlowMetricCard
                   key={stage.stage}
                   title={`${stage.stage} Variability`}
                   value={stage.cv}
                   description={`Predictability of ${stage.stage.toLowerCase()} stage. Lower is better (<0.5 is good).`}
                   color={stage.cv <= 0.5 ? 'text-green-600' : 
                          stage.cv <= 1.0 ? 'text-yellow-600' : 'text-red-600'}
                   details={[
                     { label: 'Stories', value: stage.count }
                   ]}
                   helpContent={{
                     title: `${stage.stage} Stage Variability`,
                     description: `Measures how consistent the ${stage.stage.toLowerCase()} stage duration is across different stories. High variability indicates unpredictable delivery times.`,
                     calculation: "Coefficient of Variation (CV) = Standard Deviation / Mean. A dimensionless measure of relative variability.",
                     interpretation: "CV < 0.5 is very predictable, 0.5-1.0 is moderately predictable, 1.0-1.5 is unpredictable, >1.5 is highly unpredictable. High variability suggests process inconsistencies."
                   }}
                 />
               ))}
            </div>

            {/* Row 2: Quality Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                             <FlowMetricCard
                 title="First-Time-Through"
                 value={calculateFirstTimeThrough().rate}
                 unit="%"
                 description="Stories completed without significant rework. Higher is better (80%+ is excellent)."
                 color={calculateFirstTimeThrough().rate >= 80 ? 'text-green-600' : 
                        calculateFirstTimeThrough().rate >= 60 ? 'text-yellow-600' : 'text-red-600'}
                 details={[
                   { label: 'First-Time', value: calculateFirstTimeThrough().firstTimeCount },
                   { label: 'Total Stories', value: calculateFirstTimeThrough().totalStories }
                 ]}
                 helpContent={{
                   title: "First-Time-Through Rate",
                   description: "The percentage of stories that flow through the development process with ZERO rework. No bounces from review or QA.",
                   calculation: "Stories with 0 review churn AND 0 QA churn / Total stories × 100. Any bounce back from review or QA disqualifies the story.",
                   interpretation: "50%+ is excellent quality, 30-50% is good, 15-30% needs attention, <15% indicates serious quality issues. This strict metric reveals true 'right first time' delivery capability."
                 }}
               />

                             <FlowMetricCard
                 title="Process Adherence"
                 value="See Details"
                 description="Percentage of stories that follow the standard workflow without skipping stages."
                 details={(() => {
                   const skips = calculateStageSkips();
                   return [
                     { label: 'Skipped Grooming', value: `${skips.groomingSkipRate}%` },
                     { label: 'Skipped Review', value: `${skips.reviewSkipRate}%` }
                   ];
                 })()}
                 helpContent={{
                   title: "Process Adherence",
                   description: "Measures how consistently teams follow the defined workflow stages. High skip rates indicate process shortcuts that may impact quality.",
                   calculation: "% Skipped Grooming = Stories going direct to 'In Progress' without 'Ready for Grooming' / Total Stories. % Skipped Review = Stories going direct to QA without Review.",
                   interpretation: "Lower skip rates are better. <10% skipping is excellent, 10-20% is acceptable, >20% suggests process problems or inadequate tooling. Some skipping may be intentional for small fixes."
                 }}
               />

                             <FlowMetricCard
                 title="Blocked Time Impact"
                 value={calculateBlockedTimeAnalysis().blockedTimeRatio}
                 unit="%"
                 description="Estimated percentage of total time spent blocked. Lower is better."
                 color={calculateBlockedTimeAnalysis().blockedTimeRatio <= 5 ? 'text-green-600' : 
                        calculateBlockedTimeAnalysis().blockedTimeRatio <= 15 ? 'text-yellow-600' : 'text-red-600'}
                 details={[
                   { label: 'Stories Blocked', value: calculateBlockedTimeAnalysis().storiesBlocked },
                   { label: 'Avg Blocked Days', value: calculateBlockedTimeAnalysis().avgBlockedTime }
                 ]}
                 helpContent={{
                   title: "Blocked Time Impact",
                   description: "Estimates what percentage of total delivery time is lost due to blockers and dependencies. Helps quantify the cost of external dependencies.",
                   calculation: "Estimated blocked time (2 days per blocker incident) / Total lead time of blocked stories × 100. Uses approximation since exact blocked time isn't tracked.",
                   interpretation: "≤5% is excellent, 5-15% is manageable, 15-25% needs attention, >25% indicates serious dependency issues. High values suggest need for better dependency management."
                 }}
               />
            </div>

            {/* Row 3: Size Distribution */}
            <div className="mb-4">
              <h4 className="text-md font-medium text-gray-700 mb-3">Story Size Impact</h4>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                                 {Object.entries(calculateSizeDistribution()).map(([size, data]) => (
                   <FlowMetricCard
                     key={size}
                     title={size}
                     value={data.count}
                     unit=" stories"
                     description={`Median timing breakdown and completion rate for ${size.toLowerCase()} stories.`}
                     details={[
                       { label: 'Median Lead Time', value: `${data.medianLeadTime} days` },
                       { label: 'Median Grooming', value: `${data.medianGroomingTime} days` },
                       { label: 'Median Dev Time', value: `${data.medianDevTime} days` },
                       { label: 'Median QA Time', value: `${data.medianQATime} days` },
                       { label: 'Completion Rate', value: `${data.completionRate}%` }
                     ]}
                     helpContent={{
                       title: `${size} Story Analysis`,
                       description: `Analysis of delivery performance for ${size.toLowerCase()} stories. Shows how story size impacts timing across all development stages and completion rates.`,
                       calculation: "Groups stories by point estimates: Small (1pt), Medium (2-3pts), Large (4+pts), Unestimated (0pts). Calculates median times for lead time, grooming, development, QA, and completion percentage for each group.",
                       interpretation: "1pt stories should show fastest medians across all stages with highest completion rates. 2-3pt stories represent typical complexity. 4+pt stories often need breaking down and show longer medians with more variability."
                     }}
                   />
                 ))}
              </div>
            </div>
          </div>

          <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => sortStories('key')}
                    >
                      Issue Key
                    </th>
                    <th 
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => sortStories('issue_type')}
                    >
                      Type
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => sortStories('summary')}
                    >
                      Summary
                    </th>
                    <th 
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => sortStories('sprint')}
                    >
                      Sprint
                    </th>
                    <th 
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => sortStories('created')}
                    >
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        Created
                      </div>
                    </th>
                    <th 
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => sortStories('resolved')}
                    >
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        Resolved
                      </div>
                    </th>
                    <th 
                      className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => sortStories('story_points')}
                    >
                      Story Points
                    </th>
                    <th 
                      className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => sortStories('subIssueCount')}
                    >
                      Sub-Issues
                    </th>
                    <th 
                      className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => sortStories('metrics.leadTime')}
                    >
                      <div className="flex items-center justify-center">
                        <span>Lead Time (days)</span>
                        <div className="relative ml-1">
                          <HelpCircle 
                            className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" 
                            onMouseEnter={() => setHoveredTooltip('leadTime')}
                            onMouseLeave={() => setHoveredTooltip(null)}
                          />
                          {hoveredTooltip === 'leadTime' && (
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-gray-900 text-white text-xs rounded py-2 px-3 whitespace-nowrap z-50 shadow-lg">
                              First &quot;Draft&quot; → Last &quot;Done&quot;
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </th>
                    <th 
                      className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => sortStories('metrics.groomingCycleTime')}
                    >
                      <div className="flex items-center justify-center">
                        <span>Grooming (days)</span>
                        <div className="relative ml-1">
                          <HelpCircle 
                            className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" 
                            onMouseEnter={() => setHoveredTooltip('grooming')}
                            onMouseLeave={() => setHoveredTooltip(null)}
                          />
                          {hoveredTooltip === 'grooming' && (
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-gray-900 text-white text-xs rounded py-2 px-3 whitespace-nowrap z-50 shadow-lg">
                              First &quot;Ready for Grooming&quot; → First &quot;In Progress&quot;
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </th>
                    <th 
                      className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => sortStories('metrics.devCycleTime')}
                    >
                      <div className="flex items-center justify-center">
                        <span>Dev (days)</span>
                        <div className="relative ml-1">
                          <HelpCircle 
                            className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" 
                            onMouseEnter={() => setHoveredTooltip('dev')}
                            onMouseLeave={() => setHoveredTooltip(null)}
                          />
                          {hoveredTooltip === 'dev' && (
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-gray-900 text-white text-xs rounded py-2 px-3 whitespace-nowrap z-50 shadow-lg">
                              First &quot;In Progress&quot; → First &quot;In QA&quot;
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </th>
                    <th 
                      className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => sortStories('metrics.qaCycleTime')}
                    >
                      <div className="flex items-center justify-center">
                        <span>QA (days)</span>
                        <div className="relative ml-1">
                          <HelpCircle 
                            className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" 
                            onMouseEnter={() => setHoveredTooltip('qa')}
                            onMouseLeave={() => setHoveredTooltip(null)}
                          />
                          {hoveredTooltip === 'qa' && (
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-gray-900 text-white text-xs rounded py-2 px-3 whitespace-nowrap z-50 shadow-lg">
                              First &quot;In QA&quot; → Last &quot;Done&quot;
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </th>
                    <th 
                      className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => sortStories('metrics.blockers')}
                    >
                      Blockers
                    </th>
                    <th 
                      className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => sortStories('metrics.reviewChurn')}
                    >
                      Review Churn
                    </th>
                    <th 
                      className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => sortStories('metrics.qaChurn')}
                    >
                      QA Churn
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      In Grooming
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      In Progress
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      In Review
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      In QA
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Done
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedAndFilteredStories.map((story, index) => (
                    <tr key={story.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <a 
                          href={`https://rwaapps.atlassian.net/browse/${story.key}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {story.key}
                        </a>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700">
                          {story.issue_type || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {story.summary}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-700 max-w-32 truncate block">
                          {story.sprint}
                        </span>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(story.created)}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(story.resolved)}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-700">
                        {story.story_points || '-'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-center">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          story.subIssueCount === 0 ? 'bg-gray-100 text-gray-500' :
                          story.subIssueCount <= 3 ? 'bg-green-100 text-green-800' :
                          story.subIssueCount <= 6 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {story.subIssueCount}
                        </span>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-center">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          story.metrics.leadTime === null ? 'bg-gray-100 text-gray-500' :
                          story.metrics.leadTime > 60 ? 'bg-red-100 text-red-800' :
                          story.metrics.leadTime > 30 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {story.metrics.leadTime === null ? '-' : story.metrics.leadTime}
                        </span>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-700">
                        {story.metrics.groomingCycleTime === null ? '-' : story.metrics.groomingCycleTime}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-700">
                        {story.metrics.devCycleTime === null ? '-' : story.metrics.devCycleTime}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-700">
                        {story.metrics.qaCycleTime === null ? '-' : story.metrics.qaCycleTime}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-center">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          story.metrics.blockers === 0 ? 'bg-green-100 text-green-800' :
                          story.metrics.blockers === 1 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {story.metrics.blockers}
                        </span>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-center">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          story.metrics.reviewChurn === 0 ? 'bg-green-100 text-green-800' :
                          story.metrics.reviewChurn === 1 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {story.metrics.reviewChurn}
                        </span>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-center">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          story.metrics.qaChurn === 0 ? 'bg-green-100 text-green-800' :
                          story.metrics.qaChurn === 1 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {story.metrics.qaChurn}
                        </span>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-xs text-center text-gray-600">
                        {formatTimestamp(story.metrics.timestamps.readyForGrooming)}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-xs text-center text-gray-600">
                        {formatTimestamp(story.metrics.timestamps.inProgress)}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-xs text-center text-gray-600">
                        {formatTimestamp(story.metrics.timestamps.inReview)}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-xs text-center text-gray-600">
                        {formatTimestamp(story.metrics.timestamps.inQA)}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-xs text-center text-gray-600">
                        {formatTimestamp(story.metrics.timestamps.done)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {processedStories.length === 0 && !loading && !error && (
        <div className="text-center py-8 text-gray-500">
          <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p>No stories found in the uploaded file.</p>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};

export default JiraStoryReport; 