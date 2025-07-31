import { useMemo } from 'react';
import { ProcessedStory } from '@/types/jira';
import { calculateStats, calculateCorrelation } from '../utils/calculations';

export const useMetricsCalculations = (filteredStories: ProcessedStory[]) => {
  
  const calculateStoryPointsCorrelation = useMemo(() => {
    return () => {
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
  }, [filteredStories]);

  const calculateQAChurnCorrelation = useMemo(() => {
    return () => {
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
          qaDays: story.metrics.qaCycleTime!
        }));

      if (validPairs.length < 2) {
        return { correlation: 0, count: 0 };
      }

      const qaChurns = validPairs.map(pair => pair.qaChurn);
      const qaDays = validPairs.map(pair => pair.qaDays);
      
      const correlation = calculateCorrelation(qaChurns, qaDays);
      
      return {
        correlation: Math.round(correlation * 1000) / 1000, // Round to 3 decimal places
        count: validPairs.length
      };
    };
  }, [filteredStories]);

  const calculateFlowEfficiency = useMemo(() => {
    return () => {
      const validStories = filteredStories.filter(story => 
        story.resolved && // Only resolved stories
        story.metrics.leadTime && story.metrics.leadTime > 0
      );

      if (validStories.length === 0) {
        return { efficiency: 0, activeTime: 0, waitTime: 0, count: 0 };
      }

      const totalActiveTime = validStories.reduce((sum, story) => {
        const activeTime = (story.metrics.groomingCycleTime || 0) + 
                          (story.metrics.devCycleTime || 0) + 
                          (story.metrics.qaCycleTime || 0);
        return sum + activeTime;
      }, 0);
      
      const totalLeadTime = validStories.reduce((sum, story) => sum + (story.metrics.leadTime || 0), 0);
      const totalWaitTime = totalLeadTime - totalActiveTime;
      
      const efficiency = totalLeadTime > 0 ? (totalActiveTime / totalLeadTime) * 100 : 0;
      
      return {
        efficiency: Math.round(efficiency * 10) / 10,
        activeTime: Math.round(totalActiveTime * 10) / 10,
        waitTime: Math.round(totalWaitTime * 10) / 10,
        count: validStories.length
      };
    };
  }, [filteredStories]);

  const calculateFirstTimeThrough = useMemo(() => {
    return () => {
      let firstTimeCount = 0;
      const resolvedStories = filteredStories.filter(story => story.resolved);
      const totalStories = resolvedStories.length;

      for (const story of resolvedStories) {
        // First-time through means no rework (review churn = 0 and QA churn = 0)
        if (story.metrics.reviewChurn === 0 && story.metrics.qaChurn === 0) {
          firstTimeCount++;
        }
      }

      const percentage = totalStories > 0 ? (firstTimeCount / totalStories) * 100 : 0;
      
      return {
        percentage: Math.round(percentage * 10) / 10,
        firstTimeCount,
        totalStories
      };
    };
  }, [filteredStories]);

  const calculateStageSkips = useMemo(() => {
    return () => {
      let skippedGrooming = 0;
      let skippedReview = 0;
      const resolvedStories = filteredStories.filter(story => story.resolved);
      const totalStories = resolvedStories.length;

      for (const story of resolvedStories) {
        if (story.metrics.groomingCycleTime === null || story.metrics.groomingCycleTime === 0) {
          skippedGrooming++;
        }
        if (story.metrics.reviewChurn === 0) {
          skippedReview++;
        }
      }

      return {
        groomingSkipPercentage: totalStories > 0 ? Math.round((skippedGrooming / totalStories) * 1000) / 10 : 0,
        reviewSkipPercentage: totalStories > 0 ? Math.round((skippedReview / totalStories) * 1000) / 10 : 0,
        skippedGrooming,
        skippedReview,
        totalStories
      };
    };
  }, [filteredStories]);

  const calculateBlockedTimeAnalysis = useMemo(() => {
    return () => {
      const resolvedStories = filteredStories.filter(story => story.resolved);
      const storiesWithBlocks = resolvedStories.filter(story => story.metrics.blockers > 0);
      
      if (storiesWithBlocks.length === 0) {
        return { blockedTimeRatio: 0, avgBlockedTime: 0, storiesBlocked: 0, totalStories: resolvedStories.length };
      }

      // Estimate blocked time based on lead time difference
      const avgLeadTimeBlocked = storiesWithBlocks.reduce((sum, story) => sum + (story.metrics.leadTime || 0), 0) / storiesWithBlocks.length;
      const avgLeadTimeUnblocked = resolvedStories
        .filter(story => story.metrics.blockers === 0)
        .reduce((sum, story) => sum + (story.metrics.leadTime || 0), 0) / (resolvedStories.length - storiesWithBlocks.length || 1);
      
      const estimatedBlockedTime = Math.max(0, avgLeadTimeBlocked - avgLeadTimeUnblocked);
      const blockedTimeRatio = avgLeadTimeBlocked > 0 ? (estimatedBlockedTime / avgLeadTimeBlocked) * 100 : 0;
      
      return {
        blockedTimeRatio: Math.round(blockedTimeRatio * 10) / 10,
        avgBlockedTime: Math.round(estimatedBlockedTime * 10) / 10,
        storiesBlocked: storiesWithBlocks.length,
        totalStories: resolvedStories.length
      };
    };
  }, [filteredStories]);

  const getCreatedResolvedData = useMemo(() => {
    return () => {
      // Helper function to get the start of the week (Monday) for a given date
      const getWeekStart = (date: Date): string => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        const weekStart = new Date(d.setDate(diff));
        return weekStart.toISOString().split('T')[0];
      };

      const weeklyData: Record<string, { created: number; resolved: number }> = {};
      
      // Initialize with all weeks in the range
      const allWeeks = new Set<string>();
      
      // Process created dates
      filteredStories.forEach(story => {
        if (story.created) {
          const weekKey = getWeekStart(new Date(story.created));
          allWeeks.add(weekKey);
          if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = { created: 0, resolved: 0 };
          }
          weeklyData[weekKey].created++;
        }
      });

      // Process resolved dates
      filteredStories.forEach(story => {
        if (story.resolved) {
          const weekKey = getWeekStart(new Date(story.resolved));
          allWeeks.add(weekKey);
          if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = { created: 0, resolved: 0 };
          }
          weeklyData[weekKey].resolved++;
        }
      });

      // Fill in missing weeks with zeros
      allWeeks.forEach(week => {
        if (!weeklyData[week]) {
          weeklyData[week] = { created: 0, resolved: 0 };
        }
      });

      // Convert to array and sort by date
      const dataArray = Object.entries(weeklyData)
        .map(([date, data]) => ({
          date,
          created: data.created,
          resolved: data.resolved
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return dataArray;
    };
  }, [filteredStories]);

  const getStageVariability = useMemo(() => {
    return () => {
      const stages = ['groomingCycleTime', 'devCycleTime', 'qaCycleTime'] as const;
      const stageNames = ['Grooming', 'Development', 'QA'];
      
      return stages.map((stage, index) => {
        const values = filteredStories
          .filter(story => story.resolved && story.metrics[stage] !== null && story.metrics[stage]! > 0)
          .map(story => story.metrics[stage]!);
        
        const stats = calculateStats(values);
        
        return {
          stage: stageNames[index],
          stats,
          coefficient: stats.mean > 0 ? Math.round((stats.stdDev / stats.mean) * 1000) / 10 : 0
        };
      });
    };
  }, [filteredStories]);

  return {
    calculateStoryPointsCorrelation,
    calculateQAChurnCorrelation,
    calculateFlowEfficiency,
    calculateFirstTimeThrough,
    calculateStageSkips,
    calculateBlockedTimeAnalysis,
    getCreatedResolvedData,
    getStageVariability
  };
};