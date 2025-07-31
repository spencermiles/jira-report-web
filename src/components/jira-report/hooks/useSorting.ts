import { useState, useMemo } from 'react';
import { ProcessedStory, StoryMetrics } from '@/types/jira';

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export const useSorting = (stories: ProcessedStory[]) => {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ 
    key: 'resolved', 
    direction: 'desc' 
  });

  const sortStories = (field: string) => {
    let direction: 'asc' | 'desc' = 'desc';
    
    if (sortConfig && sortConfig.key === field && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    
    setSortConfig({ key: field, direction });
  };

  const sortedStories = useMemo(() => {
    if (!sortConfig) return stories;
    
    return [...stories].sort((a, b) => {
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
  }, [stories, sortConfig]);

  return {
    sortConfig,
    sortedStories,
    sortStories
  };
};