import { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import { GET_ISSUES } from '@/lib/graphql/queries';
import { ProcessedStory, DefectResolutionStats } from '@/types/jira';
import { calculateStats } from '@/components/jira-report/utils/calculations';

export const useProjectDefectStats = (projectKey: string) => {
  const { data, loading, error } = useQuery(GET_ISSUES, {
    variables: {
      filters: {
        projectKeys: [projectKey],
      },
      pagination: { limit: 1000, offset: 0 },
    },
    skip: !projectKey,
  });

  const defectResolutionStats = useMemo((): DefectResolutionStats[] => {
    if (!data?.issues?.issues) return [];

    // Convert GraphQL data to ProcessedStory format
    const stories: ProcessedStory[] = data.issues.issues.map((issue: any) => ({
      id: issue.id,
      key: issue.key,
      summary: issue.summary,
      issueType: issue.issueType,
      priority: issue.priority,
      created: issue.created,
      resolved: issue.resolved,
      storyPoints: issue.storyPoints,
      parentKey: issue.parentKey,
      metrics: issue.metrics || {
        leadTime: null,
        cycleTime: null,
        groomingCycleTime: null,
        devCycleTime: null,
        qaCycleTime: null,
        blockers: 0,
        reviewChurn: 0,
        qaChurn: 0,
      },
    }));

    // Common defect/bug issue types (case-insensitive)
    const defectTypes = ['bug', 'defect', 'issue', 'incident'];
    
    // Filter for resolved defects only
    const resolvedDefects = stories.filter(story => 
      story.resolved && 
      story.issueType && 
      defectTypes.some(type => story.issueType.toLowerCase().includes(type))
    );

    if (resolvedDefects.length === 0) {
      return [];
    }

    // Group defects by priority
    const priorityGroups: Record<string, ProcessedStory[]> = {};
    
    resolvedDefects.forEach(defect => {
      const priority = defect.priority || 'None';
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
          return (resolvedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
        });

        const stats = calculateStats(resolutionTimes);

        return {
          priority,
          count: defects.length,
          stats: {
            median: stats.median,
            mean: stats.mean,
            min: stats.min,
            max: stats.max,
            stdDev: stats.stdDev,
            count: stats.count
          }
        };
      })
      .sort((a, b) => {
        // Sort by priority: P1/Critical -> P2/High -> P3/Medium -> P4+/Low -> None
        const priorityOrder: Record<string, number> = {
          'P1': 1, 'Critical': 1, 'Highest': 1,
          'P2': 2, 'High': 2,
          'P3': 3, 'Medium': 3,
          'P4': 4, 'P5': 4, 'Low': 4, 'Lowest': 4,
          'None': 5
        };
        
        const aOrder = priorityOrder[a.priority] || 5;
        const bOrder = priorityOrder[b.priority] || 5;
        
        return aOrder - bOrder;
      });

    return defectStats;
  }, [data]);

  return {
    defectResolutionStats,
    loading,
    error,
  };
};