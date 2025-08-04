import { useMemo } from 'react';
import { ProcessedStory, DefectResolutionStats } from '@/types/jira';
import { TimePeriod } from '@/types';
import { calculateStats, calculateCorrelation, getTimePeriodKey } from '../utils/calculations';

export const useMetricsCalculations = (filteredStories: ProcessedStory[], timePeriod: TimePeriod = 'weekly') => {
  
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
      const periodData: Record<string, { created: number; resolved: number }> = {};
      
      // Initialize with all periods in the range
      const allPeriods = new Set<string>();
      
      // Process created dates
      filteredStories.forEach(story => {
        if (story.created) {
          const periodKey = getTimePeriodKey(new Date(story.created), timePeriod);
          allPeriods.add(periodKey);
          if (!periodData[periodKey]) {
            periodData[periodKey] = { created: 0, resolved: 0 };
          }
          periodData[periodKey].created++;
        }
      });

      // Process resolved dates
      filteredStories.forEach(story => {
        if (story.resolved) {
          const periodKey = getTimePeriodKey(new Date(story.resolved), timePeriod);
          allPeriods.add(periodKey);
          if (!periodData[periodKey]) {
            periodData[periodKey] = { created: 0, resolved: 0 };
          }
          periodData[periodKey].resolved++;
        }
      });

      // Fill in missing periods with zeros
      allPeriods.forEach(period => {
        if (!periodData[period]) {
          periodData[period] = { created: 0, resolved: 0 };
        }
      });

      // Convert to array and sort by date
      const dataArray = Object.entries(periodData)
        .map(([date, data]) => ({
          date,
          created: data.created,
          resolved: data.resolved
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return dataArray;
    };
  }, [filteredStories, timePeriod]);

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

  const calculateDefectResolutionTime = useMemo(() => {
    return () => {
      // Common defect/bug issue types (case-insensitive)
      const defectTypes = ['bug', 'defect', 'issue', 'incident'];
      
      // Filter for resolved defects only
      const resolvedDefects = filteredStories.filter(story => 
        story.resolved && 
        defectTypes.some(type => story.issue_type.toLowerCase().includes(type.toLowerCase()))
      );

      if (resolvedDefects.length === 0) {
        return [];
      }

      // Group by priority
      const priorityGroups: Record<string, ProcessedStory[]> = {};
      
      resolvedDefects.forEach(defect => {
        const priority = defect.priority || 'Unassigned';
        if (!priorityGroups[priority]) {
          priorityGroups[priority] = [];
        }
        priorityGroups[priority].push(defect);
      });

      // Calculate resolution time for each priority
      const defectStats: DefectResolutionStats[] = Object.entries(priorityGroups)
        .map(([priority, defects]) => {
          // Calculate resolution times in days
          const resolutionTimes = defects.map(defect => {
            const createdDate = new Date(defect.created);
            const resolvedDate = new Date(defect.resolved!);
            const diffInDays = (resolvedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
            return Math.round(diffInDays * 10) / 10; // Round to 1 decimal place
          });

          const stats = calculateStats(resolutionTimes);

          return {
            priority,
            count: defects.length,
            stats,
            resolutionTimes
          };
        })
        .sort((a, b) => {
          // Sort by priority: P1, P2, P3, etc., then others alphabetically
          const aPriority = a.priority.toLowerCase();
          const bPriority = b.priority.toLowerCase();
          
          const aIsP = aPriority.match(/^p(\d+)$/);
          const bIsP = bPriority.match(/^p(\d+)$/);
          
          if (aIsP && bIsP) {
            return parseInt(aIsP[1]) - parseInt(bIsP[1]);
          }
          if (aIsP && !bIsP) return -1;
          if (!aIsP && bIsP) return 1;
          
          return aPriority.localeCompare(bPriority);
        });

      return defectStats;
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
    getStageVariability,
    calculateDefectResolutionTime
  };
};