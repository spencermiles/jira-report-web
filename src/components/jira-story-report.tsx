'use client';

import React, { useState } from 'react';
import { Upload, FileText, Calendar, AlertCircle, HelpCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { 
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { 
  JiraIssue, 
  ProcessedStory, 
  StoryMetrics, 
  StatsResult, 
  TooltipType
} from '@/types/jira';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const JiraIssueReport = () => {
  const [processedStories, setProcessedStories] = useState<ProcessedStory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [hoveredTooltip, setHoveredTooltip] = useState<TooltipType>(null);
  const [activeTab, setActiveTab] = useState<'metrics' | 'issues' | 'charts'>('metrics');

  // Filter states
  const [filters, setFilters] = useState({
    issueTypes: ['Story'] as string[],
    sprints: [] as string[],
    storyPoints: [] as (number | 'none')[],
    createdStartDate: '' as string,
    createdEndDate: '' as string,
    resolvedStartDate: '' as string,
    resolvedEndDate: '' as string
  });

  // Accordion states - all collapsed by default
  const [accordionStates, setAccordionStates] = useState({
    createdDate: false,
    resolvedDate: false,
    issueType: true,
    sprint: false,
    storyPoints: false
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

    // Created date range filter
    if (filters.createdStartDate || filters.createdEndDate) {
      const createdDate = new Date(story.created);
      
      if (filters.createdStartDate) {
        const startDate = new Date(filters.createdStartDate);
        if (createdDate < startDate) {
          return false;
        }
      }
      
      if (filters.createdEndDate) {
        const endDate = new Date(filters.createdEndDate);
        endDate.setHours(23, 59, 59, 999); // Include the entire end date
        if (createdDate > endDate) {
          return false;
        }
      }
    }

    // Resolved date range filter
    if (filters.resolvedStartDate || filters.resolvedEndDate) {
      if (!story.resolved) {
        // If looking for resolved dates but story isn't resolved, exclude it
        return false;
      }
      
      const resolvedDate = new Date(story.resolved);
      
      if (filters.resolvedStartDate) {
        const startDate = new Date(filters.resolvedStartDate);
        if (resolvedDate < startDate) {
          return false;
        }
      }
      
      if (filters.resolvedEndDate) {
        const endDate = new Date(filters.resolvedEndDate);
        endDate.setHours(23, 59, 59, 999); // Include the entire end date
        if (resolvedDate > endDate) {
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
        // Apply date filters
        if (filters.createdStartDate || filters.createdEndDate) {
          const createdDate = new Date(story.created);
          if (filters.createdStartDate && createdDate < new Date(filters.createdStartDate)) return false;
          if (filters.createdEndDate) {
            const endDate = new Date(filters.createdEndDate);
            endDate.setHours(23, 59, 59, 999);
            if (createdDate > endDate) return false;
          }
        }
        if (filters.resolvedStartDate || filters.resolvedEndDate) {
          if (!story.resolved) return false;
          const resolvedDate = new Date(story.resolved);
          if (filters.resolvedStartDate && resolvedDate < new Date(filters.resolvedStartDate)) return false;
          if (filters.resolvedEndDate) {
            const endDate = new Date(filters.resolvedEndDate);
            endDate.setHours(23, 59, 59, 999);
            if (resolvedDate > endDate) return false;
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
        // Apply date filters
        if (filters.createdStartDate || filters.createdEndDate) {
          const createdDate = new Date(story.created);
          if (filters.createdStartDate && createdDate < new Date(filters.createdStartDate)) return false;
          if (filters.createdEndDate) {
            const endDate = new Date(filters.createdEndDate);
            endDate.setHours(23, 59, 59, 999);
            if (createdDate > endDate) return false;
          }
        }
        if (filters.resolvedStartDate || filters.resolvedEndDate) {
          if (!story.resolved) return false;
          const resolvedDate = new Date(story.resolved);
          if (filters.resolvedStartDate && resolvedDate < new Date(filters.resolvedStartDate)) return false;
          if (filters.resolvedEndDate) {
            const endDate = new Date(filters.resolvedEndDate);
            endDate.setHours(23, 59, 59, 999);
            if (resolvedDate > endDate) return false;
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
        // Apply date filters
        if (filters.createdStartDate || filters.createdEndDate) {
          const createdDate = new Date(story.created);
          if (filters.createdStartDate && createdDate < new Date(filters.createdStartDate)) return false;
          if (filters.createdEndDate) {
            const endDate = new Date(filters.createdEndDate);
            endDate.setHours(23, 59, 59, 999);
            if (createdDate > endDate) return false;
          }
        }
        if (filters.resolvedStartDate || filters.resolvedEndDate) {
          if (!story.resolved) return false;
          const resolvedDate = new Date(story.resolved);
          if (filters.resolvedStartDate && resolvedDate < new Date(filters.resolvedStartDate)) return false;
          if (filters.resolvedEndDate) {
            const endDate = new Date(filters.resolvedEndDate);
            endDate.setHours(23, 59, 59, 999);
            if (resolvedDate > endDate) return false;
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

  const setCreatedStartDate = (date: string) => {
    setFilters(prev => ({
      ...prev,
      createdStartDate: date
    }));
  };

  const setCreatedEndDate = (date: string) => {
    setFilters(prev => ({
      ...prev,
      createdEndDate: date
    }));
  };

  const setResolvedStartDate = (date: string) => {
    setFilters(prev => ({
      ...prev,
      resolvedStartDate: date
    }));
  };

  const setResolvedEndDate = (date: string) => {
    setFilters(prev => ({
      ...prev,
      resolvedEndDate: date
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      issueTypes: [],
      sprints: [],
      storyPoints: [],
      createdStartDate: '',
      createdEndDate: '',
      resolvedStartDate: '',
      resolvedEndDate: ''
    });
  };

  const hasActiveFilters = filters.issueTypes.length > 0 || filters.sprints.length > 0 || filters.storyPoints.length > 0 || filters.createdStartDate || filters.createdEndDate || filters.resolvedStartDate || filters.resolvedEndDate;

  // Accordion toggle function
  const toggleAccordion = (section: keyof typeof accordionStates) => {
    setAccordionStates(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

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
    // Get stories that have both story points and dev cycle time (only resolved stories)
    const validPairs = filteredStories
      .filter(story => 
        story.resolved && // Only resolved stories
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
    // Get stories that have both QA churn and QA cycle time (only resolved stories)
    const validPairs = filteredStories
      .filter(story => 
        story.resolved && // Only resolved stories
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
      story.resolved && // Only resolved stories
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
        .filter(story => story.resolved) // Only resolved stories
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
    const resolvedStories = filteredStories.filter(story => story.resolved);
    const totalStories = resolvedStories.length;

    for (const story of resolvedStories) {
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

    // For size distribution, we want to see completion rate of all stories, 
    // but only calculate timing metrics for resolved stories
    filteredStories.forEach(story => {
      const points = story.story_points || 0;
      const isCompleted = !!story.resolved;

      let group: string;
      if (points === 0) group = 'Unestimated';
      else if (points === 1) group = 'Small (1pt)';
      else if (points >= 2 && points <= 3) group = 'Medium (2-3pts)';
      else group = 'Large (4+pts)'; // 4+ points

      sizeGroups[group].count++;
      if (isCompleted) {
        groupData[group].completed++;
        
        // Only include timing metrics for resolved stories
        const leadTime = story.metrics.leadTime;
        const groomingTime = story.metrics.groomingCycleTime;
        const devTime = story.metrics.devCycleTime;
        const qaTime = story.metrics.qaCycleTime;

        if (leadTime) groupData[group].leadTimes.push(leadTime);
        if (groomingTime) groupData[group].groomingTimes.push(groomingTime);
        if (devTime) groupData[group].devTimes.push(devTime);
        if (qaTime) groupData[group].qaTimes.push(qaTime);
      }
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
    const resolvedStories = filteredStories.filter(story => story.resolved);
    const totalStories = resolvedStories.length;

    resolvedStories.forEach(story => {
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
    const resolvedStories = filteredStories.filter(story => story.resolved);
    const storiesWithBlocks = resolvedStories.filter(story => story.metrics.blockers > 0);
    
    if (storiesWithBlocks.length === 0) {
      return { blockedTimeRatio: 0, avgBlockedTime: 0, storiesBlocked: 0, totalStories: resolvedStories.length };
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
      totalStories: resolvedStories.length
    };
  };

  // Chart data processing
  const getCreatedResolvedData = () => {
    const dailyData: Record<string, { created: number; resolved: number }> = {};
    
    // Initialize with all dates in the range
    const allDates = new Set<string>();
    
    filteredStories.forEach(story => {
      if (story.created) {
        const createdDate = new Date(story.created).toISOString().split('T')[0];
        allDates.add(createdDate);
        
        if (!dailyData[createdDate]) {
          dailyData[createdDate] = { created: 0, resolved: 0 };
        }
        dailyData[createdDate].created++;
      }
      
      if (story.resolved) {
        const resolvedDate = new Date(story.resolved).toISOString().split('T')[0];
        allDates.add(resolvedDate);
        
        if (!dailyData[resolvedDate]) {
          dailyData[resolvedDate] = { created: 0, resolved: 0 };
        }
        dailyData[resolvedDate].resolved++;
      }
    });
    
    // Fill in missing dates with zero values
    allDates.forEach(date => {
      if (!dailyData[date]) {
        dailyData[date] = { created: 0, resolved: 0 };
      }
    });
    
    // Convert to array and sort by date
    return Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        created: data.created,
        resolved: data.resolved
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  // Dev cycle time trend data processing
  const getDevCycleTrendData = () => {
    // Get stories with both resolved date and dev cycle time
    const validStories = filteredStories
      .filter(story => 
        story.resolved && 
        story.metrics.devCycleTime !== null && 
        story.metrics.devCycleTime > 0
      )
      .map(story => ({
        resolvedDate: new Date(story.resolved!),
        devCycleTime: story.metrics.devCycleTime!,
        key: story.key
      }))
      .sort((a, b) => a.resolvedDate.getTime() - b.resolvedDate.getTime());

    if (validStories.length === 0) {
      return { weeklyData: [], rawData: [] };
    }

    // Helper function to get week start (Monday)
    const getWeekStart = (date: Date): string => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
      d.setDate(diff);
      return d.toISOString().split('T')[0];
    };

    // Group by week and calculate weekly averages
    const weeklyGroups: Record<string, number[]> = {};
    
    validStories.forEach(story => {
      const weekStart = getWeekStart(story.resolvedDate);
      if (!weeklyGroups[weekStart]) {
        weeklyGroups[weekStart] = [];
      }
      weeklyGroups[weekStart].push(story.devCycleTime);
    });

    // Calculate weekly averages and moving averages
    const weeklyData = Object.entries(weeklyGroups)
      .map(([week, cycleTimes]) => ({
        week,
        avgCycleTime: Math.round((cycleTimes.reduce((sum, time) => sum + time, 0) / cycleTimes.length) * 10) / 10,
        medianCycleTime: cycleTimes.length > 0 ? 
          cycleTimes.sort((a, b) => a - b)[Math.floor(cycleTimes.length / 2)] : 0,
        count: cycleTimes.length
      }))
      .sort((a, b) => a.week.localeCompare(b.week));

    // Calculate 4-week moving average
    const movingAverageWindow = 4;
    const weeklyDataWithMA = weeklyData.map((item, index) => {
      let movingAverage = item.avgCycleTime;
      
      if (index >= movingAverageWindow - 1) {
        const windowData = weeklyData.slice(index - movingAverageWindow + 1, index + 1);
        movingAverage = Math.round((windowData.reduce((sum, d) => sum + d.avgCycleTime, 0) / windowData.length) * 10) / 10;
      }
      
      return {
        ...item,
        movingAverage
      };
    });

    // Raw data for scatter plot
    const rawData = validStories.map(story => ({
      date: story.resolvedDate.toISOString().split('T')[0],
      devCycleTime: story.devCycleTime,
      key: story.key
    }));

    return { weeklyData: weeklyDataWithMA, rawData };
  };

  // Lead time trend data processing
  const getLeadTimeTrendData = () => {
    const validStories = filteredStories
      .filter(story => 
        story.resolved && 
        story.metrics.leadTime !== null && 
        story.metrics.leadTime > 0
      )
      .map(story => ({
        resolvedDate: new Date(story.resolved!),
        leadTime: story.metrics.leadTime!,
        key: story.key
      }))
      .sort((a, b) => a.resolvedDate.getTime() - b.resolvedDate.getTime());

    if (validStories.length === 0) {
      return { weeklyData: [], rawData: [] };
    }

    const getWeekStart = (date: Date): string => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      return d.toISOString().split('T')[0];
    };

    const weeklyGroups: Record<string, number[]> = {};
    
    validStories.forEach(story => {
      const weekStart = getWeekStart(story.resolvedDate);
      if (!weeklyGroups[weekStart]) {
        weeklyGroups[weekStart] = [];
      }
      weeklyGroups[weekStart].push(story.leadTime);
    });

    const weeklyData = Object.entries(weeklyGroups)
      .map(([week, leadTimes]) => ({
        week,
        avgCycleTime: Math.round((leadTimes.reduce((sum, time) => sum + time, 0) / leadTimes.length) * 10) / 10,
        medianCycleTime: leadTimes.length > 0 ? 
          leadTimes.sort((a, b) => a - b)[Math.floor(leadTimes.length / 2)] : 0,
        count: leadTimes.length
      }))
      .sort((a, b) => a.week.localeCompare(b.week));

    const movingAverageWindow = 4;
    const weeklyDataWithMA = weeklyData.map((item, index) => {
      let movingAverage = item.avgCycleTime;
      
      if (index >= movingAverageWindow - 1) {
        const windowData = weeklyData.slice(index - movingAverageWindow + 1, index + 1);
        movingAverage = Math.round((windowData.reduce((sum, d) => sum + d.avgCycleTime, 0) / windowData.length) * 10) / 10;
      }
      
      return {
        ...item,
        movingAverage
      };
    });

    const rawData = validStories.map(story => ({
      date: story.resolvedDate.toISOString().split('T')[0],
      cycleTime: story.leadTime,
      key: story.key
    }));

    return { weeklyData: weeklyDataWithMA, rawData };
  };

  // Grooming cycle time trend data processing
  const getGroomingCycleTrendData = () => {
    const validStories = filteredStories
      .filter(story => 
        story.resolved && 
        story.metrics.groomingCycleTime !== null && 
        story.metrics.groomingCycleTime > 0
      )
      .map(story => ({
        resolvedDate: new Date(story.resolved!),
        groomingCycleTime: story.metrics.groomingCycleTime!,
        key: story.key
      }))
      .sort((a, b) => a.resolvedDate.getTime() - b.resolvedDate.getTime());

    if (validStories.length === 0) {
      return { weeklyData: [], rawData: [] };
    }

    const getWeekStart = (date: Date): string => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      return d.toISOString().split('T')[0];
    };

    const weeklyGroups: Record<string, number[]> = {};
    
    validStories.forEach(story => {
      const weekStart = getWeekStart(story.resolvedDate);
      if (!weeklyGroups[weekStart]) {
        weeklyGroups[weekStart] = [];
      }
      weeklyGroups[weekStart].push(story.groomingCycleTime);
    });

    const weeklyData = Object.entries(weeklyGroups)
      .map(([week, cycleTimes]) => ({
        week,
        avgCycleTime: Math.round((cycleTimes.reduce((sum, time) => sum + time, 0) / cycleTimes.length) * 10) / 10,
        medianCycleTime: cycleTimes.length > 0 ? 
          cycleTimes.sort((a, b) => a - b)[Math.floor(cycleTimes.length / 2)] : 0,
        count: cycleTimes.length
      }))
      .sort((a, b) => a.week.localeCompare(b.week));

    const movingAverageWindow = 4;
    const weeklyDataWithMA = weeklyData.map((item, index) => {
      let movingAverage = item.avgCycleTime;
      
      if (index >= movingAverageWindow - 1) {
        const windowData = weeklyData.slice(index - movingAverageWindow + 1, index + 1);
        movingAverage = Math.round((windowData.reduce((sum, d) => sum + d.avgCycleTime, 0) / windowData.length) * 10) / 10;
      }
      
      return {
        ...item,
        movingAverage
      };
    });

    const rawData = validStories.map(story => ({
      date: story.resolvedDate.toISOString().split('T')[0],
      cycleTime: story.groomingCycleTime,
      key: story.key
    }));

    return { weeklyData: weeklyDataWithMA, rawData };
  };

  // QA cycle time trend data processing
  const getQACycleTrendData = () => {
    const validStories = filteredStories
      .filter(story => 
        story.resolved && 
        story.metrics.qaCycleTime !== null && 
        story.metrics.qaCycleTime > 0
      )
      .map(story => ({
        resolvedDate: new Date(story.resolved!),
        qaCycleTime: story.metrics.qaCycleTime!,
        key: story.key
      }))
      .sort((a, b) => a.resolvedDate.getTime() - b.resolvedDate.getTime());

    if (validStories.length === 0) {
      return { weeklyData: [], rawData: [] };
    }

    const getWeekStart = (date: Date): string => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      return d.toISOString().split('T')[0];
    };

    const weeklyGroups: Record<string, number[]> = {};
    
    validStories.forEach(story => {
      const weekStart = getWeekStart(story.resolvedDate);
      if (!weeklyGroups[weekStart]) {
        weeklyGroups[weekStart] = [];
      }
      weeklyGroups[weekStart].push(story.qaCycleTime);
    });

    const weeklyData = Object.entries(weeklyGroups)
      .map(([week, cycleTimes]) => ({
        week,
        avgCycleTime: Math.round((cycleTimes.reduce((sum, time) => sum + time, 0) / cycleTimes.length) * 10) / 10,
        medianCycleTime: cycleTimes.length > 0 ? 
          cycleTimes.sort((a, b) => a - b)[Math.floor(cycleTimes.length / 2)] : 0,
        count: cycleTimes.length
      }))
      .sort((a, b) => a.week.localeCompare(b.week));

    const movingAverageWindow = 4;
    const weeklyDataWithMA = weeklyData.map((item, index) => {
      let movingAverage = item.avgCycleTime;
      
      if (index >= movingAverageWindow - 1) {
        const windowData = weeklyData.slice(index - movingAverageWindow + 1, index + 1);
        movingAverage = Math.round((windowData.reduce((sum, d) => sum + d.avgCycleTime, 0) / windowData.length) * 10) / 10;
      }
      
      return {
        ...item,
        movingAverage
      };
    });

    const rawData = validStories.map(story => ({
      date: story.resolvedDate.toISOString().split('T')[0],
      cycleTime: story.qaCycleTime,
      key: story.key
    }));

    return { weeklyData: weeklyDataWithMA, rawData };
  };

  const SimpleHistogram = ({ 
    data, 
    title, 
    height = 300
  }: { 
    data: Array<{ date: string; created: number; resolved: number }>; 
    title: string;
    height?: number;
  }) => {
    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          No data available
        </div>
      );
    }

    // Format date for display
    const formatDateLabel = (dateStr: string) => {
      try {
        return new Date(dateStr).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
      } catch {
        return dateStr;
      }
    };

    const chartData = {
      labels: data.map(d => formatDateLabel(d.date)),
      datasets: [
        {
          label: 'Issues Created',
          data: data.map(d => d.created),
          backgroundColor: '#3b82f6',
          borderColor: '#3b82f6',
          borderWidth: 1,
        },
        {
          label: 'Issues Resolved',
          data: data.map(d => d.resolved),
          backgroundColor: '#10b981',
          borderColor: '#10b981',
          borderWidth: 1,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: false,
        },
        legend: {
          position: 'bottom' as const,
          labels: {
            usePointStyle: true,
            padding: 20,
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            maxTicksLimit: 12,
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: '#f3f4f6',
          },
        },
      },
      interaction: {
        intersect: false,
        mode: 'index' as const,
      },
    };
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div style={{ height: `${height}px` }}>
          <Bar data={chartData} options={options} />
        </div>
      </div>
    );
  };

  const CumulativeLineChart = ({ 
    data, 
    title, 
    height = 300
  }: { 
    data: Array<{ date: string; created: number; resolved: number }>; 
    title: string;
    height?: number;
  }) => {
    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          No data available
        </div>
      );
    }

    // Calculate cumulative data
    const cumulativeData = data.reduce((acc, curr, index) => {
      const prevCreated = index > 0 ? acc[index - 1].cumulativeCreated : 0;
      const prevResolved = index > 0 ? acc[index - 1].cumulativeResolved : 0;
      
      acc.push({
        date: curr.date,
        cumulativeCreated: prevCreated + curr.created,
        cumulativeResolved: prevResolved + curr.resolved
      });
      
      return acc;
    }, [] as Array<{ date: string; cumulativeCreated: number; cumulativeResolved: number }>);

    // Format date for display
    const formatDateLabel = (dateStr: string) => {
      try {
        return new Date(dateStr).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
      } catch {
        return dateStr;
      }
    };

    const chartData = {
      labels: cumulativeData.map(d => formatDateLabel(d.date)),
      datasets: [
        {
          label: 'Cumulative Issues Created',
          data: cumulativeData.map(d => d.cumulativeCreated),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.1,
        },
        {
          label: 'Cumulative Issues Resolved',
          data: cumulativeData.map(d => d.cumulativeResolved),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.1,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: false,
        },
        legend: {
          position: 'bottom' as const,
          labels: {
            usePointStyle: true,
            padding: 20,
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            maxTicksLimit: 12,
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: '#f3f4f6',
          },
        },
      },
      interaction: {
        intersect: false,
        mode: 'index' as const,
      },
    };
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div style={{ height: `${height}px` }}>
          <Line data={chartData} options={options} />
        </div>
      </div>
    );
  };

  const DevCycleTrendChart = ({ 
    height = 400
  }: { 
    height?: number;
  }) => {
    const { weeklyData, rawData } = getDevCycleTrendData();
    
    if (weeklyData.length === 0) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Development Cycle Time Trend</h3>
          <div className="flex items-center justify-center h-64 text-gray-500">
            No development cycle time data available
          </div>
        </div>
      );
    }

    // Format week dates for display
    const formatWeekLabel = (weekStr: string) => {
      try {
        return new Date(weekStr).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
      } catch {
        return weekStr;
      }
    };

    // Calculate overall median for reference line
    const allDevTimes = rawData.map(d => d.devCycleTime);
    const overallMedian = allDevTimes.length > 0 ? 
      allDevTimes.sort((a, b) => a - b)[Math.floor(allDevTimes.length / 2)] : 0;

    const chartData = {
      labels: weeklyData.map(d => formatWeekLabel(d.week)),
      datasets: [
        {
          type: 'line' as const,
          label: 'Weekly Average',
          data: weeklyData.map(d => d.avgCycleTime),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.1,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          type: 'line' as const,
          label: '4-Week Moving Average',
          data: weeklyData.map(d => d.movingAverage),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderWidth: 3,
          fill: false,
          tension: 0.2,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        {
          type: 'line' as const,
          label: `Overall Median (${overallMedian} days)`,
          data: weeklyData.map(() => overallMedian),
          borderColor: '#6b7280',
          backgroundColor: 'rgba(107, 114, 128, 0.1)',
          borderWidth: 1,
          borderDash: [5, 5],
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 0,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: false,
        },
        legend: {
          position: 'bottom' as const,
          labels: {
            usePointStyle: true,
            padding: 20,
          },
        },
        tooltip: {
          callbacks: {
            afterBody: (context: any) => {
              const dataIndex = context[0]?.dataIndex;
              if (dataIndex !== undefined && weeklyData[dataIndex]) {
                const week = weeklyData[dataIndex];
                return [
                  `Issues this week: ${week.count}`,
                  `Median: ${week.medianCycleTime} days`
                ];
              }
              return [];
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            maxTicksLimit: 12,
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: '#f3f4f6',
          },
          title: {
            display: true,
            text: 'Development Cycle Time (days)'
          }
        },
      },
      interaction: {
        intersect: false,
        mode: 'index' as const,
      },
    };
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Development Cycle Time Trend</h3>
          <div className="text-sm text-gray-500">
            {rawData.length} resolved issues
          </div>
        </div>
        
        <div style={{ height: `${height}px` }}>
          <Line data={chartData} options={options} />
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          <p><strong>Weekly Average:</strong> Average dev cycle time for issues resolved each week</p>
          <p><strong>4-Week Moving Average:</strong> Smoothed trend line showing overall direction</p>
          <p><strong>Overall Median:</strong> Reference line for comparison ({overallMedian} days)</p>
        </div>
      </div>
    );
  };

  const LeadTimeTrendChart = ({ 
    height = 400
  }: { 
    height?: number;
  }) => {
    const { weeklyData, rawData } = getLeadTimeTrendData();
    
    if (weeklyData.length === 0) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Time Trend</h3>
          <div className="flex items-center justify-center h-64 text-gray-500">
            No lead time data available
          </div>
        </div>
      );
    }

    const formatWeekLabel = (weekStr: string) => {
      try {
        return new Date(weekStr).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
      } catch {
        return weekStr;
      }
    };

    const allTimes = rawData.map(d => d.cycleTime);
    const overallMedian = allTimes.length > 0 ? 
      allTimes.sort((a, b) => a - b)[Math.floor(allTimes.length / 2)] : 0;

    const chartData = {
      labels: weeklyData.map(d => formatWeekLabel(d.week)),
      datasets: [
        {
          type: 'line' as const,
          label: 'Weekly Average',
          data: weeklyData.map(d => d.avgCycleTime),
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.1,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          type: 'line' as const,
          label: '4-Week Moving Average',
          data: weeklyData.map(d => d.movingAverage),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderWidth: 3,
          fill: false,
          tension: 0.2,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        {
          type: 'line' as const,
          label: `Overall Median (${overallMedian} days)`,
          data: weeklyData.map(() => overallMedian),
          borderColor: '#6b7280',
          backgroundColor: 'rgba(107, 114, 128, 0.1)',
          borderWidth: 1,
          borderDash: [5, 5],
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 0,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: false,
        },
        legend: {
          position: 'bottom' as const,
          labels: {
            usePointStyle: true,
            padding: 20,
          },
        },
        tooltip: {
          callbacks: {
            afterBody: (context: any) => {
              const dataIndex = context[0]?.dataIndex;
              if (dataIndex !== undefined && weeklyData[dataIndex]) {
                const week = weeklyData[dataIndex];
                return [
                  `Issues this week: ${week.count}`,
                  `Median: ${week.medianCycleTime} days`
                ];
              }
              return [];
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            maxTicksLimit: 12,
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: '#f3f4f6',
          },
          title: {
            display: true,
            text: 'Lead Time (days)'
          }
        },
      },
      interaction: {
        intersect: false,
        mode: 'index' as const,
      },
    };
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Lead Time Trend</h3>
          <div className="text-sm text-gray-500">
            {rawData.length} resolved issues
          </div>
        </div>
        
        <div style={{ height: `${height}px` }}>
          <Line data={chartData} options={options} />
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          <p><strong>Weekly Average:</strong> Average lead time for issues resolved each week</p>
          <p><strong>4-Week Moving Average:</strong> Smoothed trend line showing overall direction</p>
          <p><strong>Overall Median:</strong> Reference line for comparison ({overallMedian} days)</p>
        </div>
      </div>
    );
  };

  const GroomingCycleTrendChart = ({ 
    height = 400
  }: { 
    height?: number;
  }) => {
    const { weeklyData, rawData } = getGroomingCycleTrendData();
    
    if (weeklyData.length === 0) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Grooming Cycle Time Trend</h3>
          <div className="flex items-center justify-center h-64 text-gray-500">
            No grooming cycle time data available
          </div>
        </div>
      );
    }

    const formatWeekLabel = (weekStr: string) => {
      try {
        return new Date(weekStr).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
      } catch {
        return weekStr;
      }
    };

    const allTimes = rawData.map(d => d.cycleTime);
    const overallMedian = allTimes.length > 0 ? 
      allTimes.sort((a, b) => a - b)[Math.floor(allTimes.length / 2)] : 0;

    const chartData = {
      labels: weeklyData.map(d => formatWeekLabel(d.week)),
      datasets: [
        {
          type: 'line' as const,
          label: 'Weekly Average',
          data: weeklyData.map(d => d.avgCycleTime),
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.1,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          type: 'line' as const,
          label: '4-Week Moving Average',
          data: weeklyData.map(d => d.movingAverage),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderWidth: 3,
          fill: false,
          tension: 0.2,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        {
          type: 'line' as const,
          label: `Overall Median (${overallMedian} days)`,
          data: weeklyData.map(() => overallMedian),
          borderColor: '#6b7280',
          backgroundColor: 'rgba(107, 114, 128, 0.1)',
          borderWidth: 1,
          borderDash: [5, 5],
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 0,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: false,
        },
        legend: {
          position: 'bottom' as const,
          labels: {
            usePointStyle: true,
            padding: 20,
          },
        },
        tooltip: {
          callbacks: {
            afterBody: (context: any) => {
              const dataIndex = context[0]?.dataIndex;
              if (dataIndex !== undefined && weeklyData[dataIndex]) {
                const week = weeklyData[dataIndex];
                return [
                  `Issues this week: ${week.count}`,
                  `Median: ${week.medianCycleTime} days`
                ];
              }
              return [];
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            maxTicksLimit: 12,
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: '#f3f4f6',
          },
          title: {
            display: true,
            text: 'Grooming Cycle Time (days)'
          }
        },
      },
      interaction: {
        intersect: false,
        mode: 'index' as const,
      },
    };
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Grooming Cycle Time Trend</h3>
          <div className="text-sm text-gray-500">
            {rawData.length} resolved issues
          </div>
        </div>
        
        <div style={{ height: `${height}px` }}>
          <Line data={chartData} options={options} />
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          <p><strong>Weekly Average:</strong> Average grooming cycle time for issues resolved each week</p>
          <p><strong>4-Week Moving Average:</strong> Smoothed trend line showing overall direction</p>
          <p><strong>Overall Median:</strong> Reference line for comparison ({overallMedian} days)</p>
        </div>
      </div>
    );
  };

  const QACycleTrendChart = ({ 
    height = 400
  }: { 
    height?: number;
  }) => {
    const { weeklyData, rawData } = getQACycleTrendData();
    
    if (weeklyData.length === 0) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">QA Cycle Time Trend</h3>
          <div className="flex items-center justify-center h-64 text-gray-500">
            No QA cycle time data available
          </div>
        </div>
      );
    }

    const formatWeekLabel = (weekStr: string) => {
      try {
        return new Date(weekStr).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
      } catch {
        return weekStr;
      }
    };

    const allTimes = rawData.map(d => d.cycleTime);
    const overallMedian = allTimes.length > 0 ? 
      allTimes.sort((a, b) => a - b)[Math.floor(allTimes.length / 2)] : 0;

    const chartData = {
      labels: weeklyData.map(d => formatWeekLabel(d.week)),
      datasets: [
        {
          type: 'line' as const,
          label: 'Weekly Average',
          data: weeklyData.map(d => d.avgCycleTime),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.1,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          type: 'line' as const,
          label: '4-Week Moving Average',
          data: weeklyData.map(d => d.movingAverage),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderWidth: 3,
          fill: false,
          tension: 0.2,
          pointRadius: 0,
          pointHoverRadius: 4,
        },
        {
          type: 'line' as const,
          label: `Overall Median (${overallMedian} days)`,
          data: weeklyData.map(() => overallMedian),
          borderColor: '#6b7280',
          backgroundColor: 'rgba(107, 114, 128, 0.1)',
          borderWidth: 1,
          borderDash: [5, 5],
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 0,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: false,
        },
        legend: {
          position: 'bottom' as const,
          labels: {
            usePointStyle: true,
            padding: 20,
          },
        },
        tooltip: {
          callbacks: {
            afterBody: (context: any) => {
              const dataIndex = context[0]?.dataIndex;
              if (dataIndex !== undefined && weeklyData[dataIndex]) {
                const week = weeklyData[dataIndex];
                return [
                  `Issues this week: ${week.count}`,
                  `Median: ${week.medianCycleTime} days`
                ];
              }
              return [];
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            maxTicksLimit: 12,
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: '#f3f4f6',
          },
          title: {
            display: true,
            text: 'QA Cycle Time (days)'
          }
        },
      },
      interaction: {
        intersect: false,
        mode: 'index' as const,
      },
    };
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">QA Cycle Time Trend</h3>
          <div className="text-sm text-gray-500">
            {rawData.length} resolved issues
          </div>
        </div>
        
        <div style={{ height: `${height}px` }}>
          <Line data={chartData} options={options} />
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          <p><strong>Weekly Average:</strong> Average QA cycle time for issues resolved each week</p>
          <p><strong>4-Week Moving Average:</strong> Smoothed trend line showing overall direction</p>
          <p><strong>Overall Median:</strong> Reference line for comparison ({overallMedian} days)</p>
        </div>
      </div>
    );
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

  // Accordion Header Component
  const AccordionHeader = ({ 
    title, 
    icon, 
    isOpen, 
    onClick, 
    activeCount = 0 
  }: { 
    title: string; 
    icon?: React.ReactNode; 
    isOpen: boolean; 
    onClick: () => void;
    activeCount?: number;
  }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between py-3 px-0 text-left hover:bg-gray-100 rounded-md transition-colors"
    >
      <div className="flex items-center space-x-2">
        {icon}
        <span className="font-medium text-gray-700 text-sm">{title}</span>
        {activeCount > 0 && (
          <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">
            {activeCount}
          </span>
        )}
      </div>
      {isOpen ? (
        <ChevronDown className="h-4 w-4 text-gray-500" />
      ) : (
        <ChevronRight className="h-4 w-4 text-gray-500" />
      )}
    </button>
  );

  // Sidebar Filter Component
  const FilterSidebar = () => {
    const { issueTypeCounts, sprintCounts, storyPointCounts } = getFilterCounts();

    return (
      <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 space-y-4 overflow-y-auto h-screen sticky top-0" style={{ minWidth: '256px' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Filters</h3>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Created Date Range Filter */}
        <div>
          <AccordionHeader
            title="Created Date"
            isOpen={accordionStates.createdDate}
            onClick={() => toggleAccordion('createdDate')}
            activeCount={filters.createdStartDate || filters.createdEndDate ? 1 : 0}
          />
          {accordionStates.createdDate && (
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
                <input
                  type="date"
                  value={filters.createdStartDate}
                  onChange={(e) => setCreatedStartDate(e.target.value)}
                  className="w-full text-sm font-medium text-gray-900 border border-gray-300 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                  style={{ colorScheme: 'light' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
                <input
                  type="date"
                  value={filters.createdEndDate}
                  onChange={(e) => setCreatedEndDate(e.target.value)}
                  className="w-full text-sm font-medium text-gray-900 border border-gray-300 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                  style={{ colorScheme: 'light' }}
                />
              </div>
              {(filters.createdStartDate || filters.createdEndDate) && (
                <button
                  onClick={() => {
                    setCreatedStartDate('');
                    setCreatedEndDate('');
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700 underline font-medium"
                >
                  Clear created dates
                </button>
              )}
            </div>
          )}
        </div>

        {/* Resolved Date Range Filter */}
        <div>
          <AccordionHeader
            title="Resolved Date"
            isOpen={accordionStates.resolvedDate}
            onClick={() => toggleAccordion('resolvedDate')}
            activeCount={filters.resolvedStartDate || filters.resolvedEndDate ? 1 : 0}
          />
          {accordionStates.resolvedDate && (
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
                <input
                  type="date"
                  value={filters.resolvedStartDate}
                  onChange={(e) => setResolvedStartDate(e.target.value)}
                  className="w-full text-sm font-medium text-gray-900 border border-gray-300 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                  style={{ colorScheme: 'light' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
                <input
                  type="date"
                  value={filters.resolvedEndDate}
                  onChange={(e) => setResolvedEndDate(e.target.value)}
                  className="w-full text-sm font-medium text-gray-900 border border-gray-300 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                  style={{ colorScheme: 'light' }}
                />
              </div>
              {(filters.resolvedStartDate || filters.resolvedEndDate) && (
                <button
                  onClick={() => {
                    setResolvedStartDate('');
                    setResolvedEndDate('');
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700 underline font-medium"
                >
                  Clear resolved dates
                </button>
              )}
            </div>
          )}
        </div>

        {/* Issue Type Filter */}
        <div>
          <AccordionHeader
            title="Issue Type"
            isOpen={accordionStates.issueType}
            onClick={() => toggleAccordion('issueType')}
            activeCount={filters.issueTypes.length}
          />
          {accordionStates.issueType && (
            <div className="mt-3 space-y-2">
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
          )}
        </div>

        {/* Sprint Filter */}
        <div>
          <AccordionHeader
            title="Sprint"
            isOpen={accordionStates.sprint}
            onClick={() => toggleAccordion('sprint')}
            activeCount={filters.sprints.length}
          />
          {accordionStates.sprint && (
            <div className="mt-3 space-y-2">
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
          )}
        </div>

        {/* Story Points Filter */}
        <div>
          <AccordionHeader
            title="Story Points"
            isOpen={accordionStates.storyPoints}
            onClick={() => toggleAccordion('storyPoints')}
            activeCount={filters.storyPoints.length}
          />
          {accordionStates.storyPoints && (
            <div className="mt-3 space-y-2">
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
          )}
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">JIRA Issue Report</h1>
        <p className="text-gray-600">Upload your JIRA JSON export to view all issues with cycle time analysis</p>
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
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('metrics')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'metrics'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Metrics
              </button>
              <button
                onClick={() => setActiveTab('issues')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'issues'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Issues ({filteredStories.length})
              </button>
              <button
                onClick={() => setActiveTab('charts')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'charts'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Charts
              </button>
            </nav>
          </div>

          {/* Metrics Tab Content */}
          {activeTab === 'metrics' && (
            <div>
              {/* Top Level Metrics */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Summary Metrics</h3>
                  <div className="text-sm text-gray-600">
                    Based on {filteredStories.filter(s => s.resolved).length} resolved issues 
                    ({filteredStories.filter(s => !s.resolved).length} unresolved excluded)
                  </div>
                </div>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <StatCard 
                title="Lead Time" 
                stats={calculateStats(filteredStories.filter(s => s.resolved).map(s => s.metrics.leadTime))} 
                unit=" days" 
              />
              <StatCard 
                title="Grooming Time" 
                stats={calculateStats(filteredStories.filter(s => s.resolved).map(s => s.metrics.groomingCycleTime))} 
                unit=" days" 
              />
              <StatCard 
                title="Dev Time" 
                stats={calculateStats(filteredStories.filter(s => s.resolved).map(s => s.metrics.devCycleTime))} 
                unit=" days" 
              />
              <StatCard 
                title="QA Time" 
                stats={calculateStats(filteredStories.filter(s => s.resolved).map(s => s.metrics.qaCycleTime))} 
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
                     { label: 'Issues Analyzed', value: calculateFlowEfficiency().count }
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
                     { label: 'Issues', value: stage.count }
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
                 description="Issues completed without significant rework. Higher is better (80%+ is excellent)."
                 color={calculateFirstTimeThrough().rate >= 80 ? 'text-green-600' : 
                        calculateFirstTimeThrough().rate >= 60 ? 'text-yellow-600' : 'text-red-600'}
                 details={[
                   { label: 'First-Time', value: calculateFirstTimeThrough().firstTimeCount },
                   { label: 'Total Issues', value: calculateFirstTimeThrough().totalStories }
                 ]}
                 helpContent={{
                   title: "First-Time-Through Rate",
                   description: "The percentage of issues that flow through the development process with ZERO rework. No bounces from review or QA.",
                   calculation: "Issues with 0 review churn AND 0 QA churn / Total issues × 100. Any bounce back from review or QA disqualifies the issue.",
                   interpretation: "50%+ is excellent quality, 30-50% is good, 15-30% needs attention, <15% indicates serious quality issues. This strict metric reveals true 'right first time' delivery capability."
                 }}
               />

                             <FlowMetricCard
                 title="Process Adherence"
                 value="See Details"
                 description="Percentage of issues that follow the standard workflow without skipping stages."
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
                                        calculation: "% Skipped Grooming = Issues going direct to 'In Progress' without 'Ready for Grooming' / Total Issues. % Skipped Review = Issues going direct to QA without Review.",
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
                   { label: 'Issues Blocked', value: calculateBlockedTimeAnalysis().storiesBlocked },
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
              <h4 className="text-md font-medium text-gray-700 mb-3">Lead Time Analysis by Issue Size</h4>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                                 {Object.entries(calculateSizeDistribution()).map(([size, data]) => (
                   <FlowMetricCard
                     key={size}
                     title={size}
                     value={data.medianLeadTime}
                     unit=" days"
                     description="lead time"
                     details={[
                       { label: 'Issue Count', value: `${data.count} issues` },
                       { label: 'Median Grooming', value: `${data.medianGroomingTime} days` },
                       { label: 'Median Dev Time', value: `${data.medianDevTime} days` },
                       { label: 'Median QA Time', value: `${data.medianQATime} days` },
                       { label: 'Completion Rate', value: `${data.completionRate}%` }
                     ]}
                     helpContent={{
                                                title: `${size} Issue Analysis`,
                       description: `Analysis of delivery performance for ${size.toLowerCase()} issues. Shows how issue size impacts timing across all development stages and completion rates.`,
                       calculation: "Groups issues by point estimates: Small (1pt), Medium (2-3pts), Large (4+pts), Unestimated (0pts). Calculates median times for lead time, grooming, development, QA, and completion percentage for each group.",
                       interpretation: "1pt issues should show fastest medians across all stages with highest completion rates. 2-3pt issues represent typical complexity. 4+pt issues often need breaking down and show longer medians with more variability."
                     }}
                   />
                 ))}
              </div>
            </div>
          </div>
            </div>
          )}

          {/* Issues Tab Content */}
          {activeTab === 'issues' && (
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

          {/* Charts Tab Content */}
          {activeTab === 'charts' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Charts & Trends</h2>
                <p className="text-gray-600">Visual analysis of issue creation and resolution patterns over time</p>
              </div>

              {/* Cycle Time Trend Charts */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Cycle Time Trends</h3>
                
                {/* Lead Time Trend */}
                <div className="mb-8">
                  <LeadTimeTrendChart />
                </div>

                {/* Grooming Cycle Time Trend */}
                <div className="mb-8">
                  <GroomingCycleTrendChart />
                </div>

                {/* Development Cycle Time Trend */}
                <div className="mb-8">
                  <DevCycleTrendChart />
                </div>

                {/* QA Cycle Time Trend */}
                <div className="mb-8">
                  <QACycleTrendChart />
                </div>
              </div>

              {/* Issue Activity Charts */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Issue Activity</h3>

                {/* Daily Activity Histogram */}
                <div className="mb-8">
                  <SimpleHistogram
                    data={getCreatedResolvedData()}
                    title="Daily Issues Created vs Resolved"
                    height={400}
                  />
                </div>

                {/* Cumulative Trend Chart */}
                <div className="mb-8">
                  <CumulativeLineChart
                    data={getCreatedResolvedData()}
                    title="Cumulative Issues Created vs Resolved Over Time"
                    height={400}
                  />
                </div>
              </div>

              {/* Summary Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Creation Trend</h3>
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {filteredStories.filter(s => s.created).length}
                  </div>
                  <div className="text-sm text-gray-600">Total Issues Created</div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Resolution Trend</h3>
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    {filteredStories.filter(s => s.resolved).length}
                  </div>
                  <div className="text-sm text-gray-600">Total Issues Resolved</div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Work in Progress</h3>
                  <div className="text-3xl font-bold text-yellow-600 mb-1">
                    {filteredStories.filter(s => !s.resolved).length}
                  </div>
                  <div className="text-sm text-gray-600">Issues Still Open</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {processedStories.length === 0 && !loading && !error && (
        <div className="text-center py-8 text-gray-500">
          <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p>No issues found in the uploaded file.</p>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};

export default JiraIssueReport; 