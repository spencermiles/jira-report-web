import { useState, useMemo } from 'react';
import { ProcessedStory } from '@/types/jira';

interface FilterState {
  issueTypes: string[];
  sprints: string[];
  storyPoints: (number | 'none')[];
  statuses: string[];
  projectKeys: string[];
  priorities: string[];
  createdStartDate: string;
  createdEndDate: string;
  resolvedStartDate: string;
  resolvedEndDate: string;
}

interface AccordionState {
  createdDate: boolean;
  resolvedDate: boolean;
  issueType: boolean;
  sprint: boolean;
  storyPoints: boolean;
  status: boolean;
  projectKey: boolean;
  priority: boolean;
}

interface FilterCount {
  value: string | number | 'none';
  count: number;
}

export const useFilters = (processedStories: ProcessedStory[], preselectedProjectKey?: string) => {
  // Initialize with all issue types selected
  const allIssueTypes = [...new Set(processedStories.map(story => story.issue_type))].sort();
  
  const [filters, setFilters] = useState<FilterState>({
    issueTypes: allIssueTypes,
    sprints: [],
    storyPoints: [],
    statuses: ['resolved'],
    projectKeys: preselectedProjectKey ? [preselectedProjectKey] : [],
    priorities: [],
    createdStartDate: '',
    createdEndDate: '',
    resolvedStartDate: '',
    resolvedEndDate: ''
  });

  const [accordionStates, setAccordionStates] = useState<AccordionState>({
    createdDate: false,
    resolvedDate: false,
    issueType: true,
    sprint: false,
    storyPoints: false,
    status: false,
    projectKey: false,
    priority: false
  });

  const getFilterOptions = () => {
    const issueTypes = [...new Set(processedStories.map(story => story.issue_type))].sort();
    const sprints = [...new Set(processedStories.map(story => story.sprint))].filter(Boolean).sort();
    const projectKeys = [...new Set(processedStories.map(story => story.project_key))].filter(Boolean).sort();
    const priorities = [...new Set(processedStories.map(story => story.priority || 'Unassigned'))].sort((a, b) => {
      // Sort by priority: P1, P2, P3, etc., then others alphabetically
      const aPriority = a.toLowerCase();
      const bPriority = b.toLowerCase();
      
      const aIsP = aPriority.match(/^p(\d+)$/);
      const bIsP = bPriority.match(/^p(\d+)$/);
      
      if (aIsP && bIsP) {
        return parseInt(aIsP[1]) - parseInt(bIsP[1]);
      }
      if (aIsP && !bIsP) return -1;
      if (!aIsP && bIsP) return 1;
      
      return aPriority.localeCompare(bPriority);
    });
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

    return { issueTypes, sprints, projectKeys, priorities, storyPoints };
  };

  const filteredStories = useMemo(() => {
    return processedStories.filter(story => {
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

      // Status filter
      if (filters.statuses.length > 0) {
        const isResolved = story.resolved != null;
        const statusValue = isResolved ? 'resolved' : 'unresolved';
        if (!filters.statuses.includes(statusValue)) {
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

      // Project key filter
      if (filters.projectKeys.length > 0 && !filters.projectKeys.includes(story.project_key)) {
        return false;
      }

      // Priority filter
      if (filters.priorities.length > 0) {
        const storyPriority = story.priority || 'Unassigned';
        if (!filters.priorities.includes(storyPriority)) {
          return false;
        }
      }

      return true;
    });
  }, [processedStories, filters]);

  const getFilterCounts = () => {
    const { issueTypes, sprints, storyPoints, projectKeys, priorities } = getFilterOptions();
    
    const issueTypeCounts: FilterCount[] = issueTypes.map(type => ({
      value: type,
      count: processedStories.filter(story => {
        // Apply other active filters but not issue type filter
        if (filters.sprints.length > 0 && !filters.sprints.includes(story.sprint)) return false;
        if (filters.storyPoints.length > 0) {
          const storyPointValue = (story.story_points && story.story_points > 0) ? story.story_points : 'none';
          if (!filters.storyPoints.includes(storyPointValue)) return false;
        }
        if (filters.statuses.length > 0) {
          const isResolved = story.resolved != null;
          const statusValue = isResolved ? 'resolved' : 'unresolved';
          if (!filters.statuses.includes(statusValue)) return false;
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
        if (filters.projectKeys.length > 0 && !filters.projectKeys.includes(story.project_key)) return false;
        return story.issue_type === type;
      }).length
    }));

    const sprintCounts: FilterCount[] = sprints.map(sprint => ({
      value: sprint,
      count: processedStories.filter(story => {
        // Apply other active filters but not sprint filter
        if (filters.issueTypes.length > 0 && !filters.issueTypes.includes(story.issue_type)) return false;
        if (filters.storyPoints.length > 0) {
          const storyPointValue = (story.story_points && story.story_points > 0) ? story.story_points : 'none';
          if (!filters.storyPoints.includes(storyPointValue)) return false;
        }
        if (filters.statuses.length > 0) {
          const isResolved = story.resolved != null;
          const statusValue = isResolved ? 'resolved' : 'unresolved';
          if (!filters.statuses.includes(statusValue)) return false;
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
        if (filters.projectKeys.length > 0 && !filters.projectKeys.includes(story.project_key)) return false;
        return story.sprint === sprint;
      }).length
    }));

    const storyPointCounts: FilterCount[] = storyPoints.map(points => ({
      value: points,
      count: processedStories.filter(story => {
        // Apply other active filters but not story points filter
        if (filters.issueTypes.length > 0 && !filters.issueTypes.includes(story.issue_type)) return false;
        if (filters.sprints.length > 0 && !filters.sprints.includes(story.sprint)) return false;
        if (filters.statuses.length > 0) {
          const isResolved = story.resolved != null;
          const statusValue = isResolved ? 'resolved' : 'unresolved';
          if (!filters.statuses.includes(statusValue)) return false;
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
        if (filters.projectKeys.length > 0 && !filters.projectKeys.includes(story.project_key)) return false;
        const storyPointValue = (story.story_points && story.story_points > 0) ? story.story_points : 'none';
        return storyPointValue === points;
      }).length
    }));

    const statuses = ['resolved', 'unresolved'];
    const statusCounts: FilterCount[] = statuses.map(status => ({
      value: status,
      count: processedStories.filter(story => {
        // Apply other active filters but not status filter
        if (filters.issueTypes.length > 0 && !filters.issueTypes.includes(story.issue_type)) return false;
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
        if (filters.projectKeys.length > 0 && !filters.projectKeys.includes(story.project_key)) return false;
        const isResolved = story.resolved != null;
        const statusValue = isResolved ? 'resolved' : 'unresolved';
        return statusValue === status;
      }).length
    }));

    const projectKeyCounts: FilterCount[] = projectKeys.map(projectKey => ({
      value: projectKey,
      count: processedStories.filter(story => {
        // Apply other active filters but not project key filter
        if (filters.issueTypes.length > 0 && !filters.issueTypes.includes(story.issue_type)) return false;
        if (filters.sprints.length > 0 && !filters.sprints.includes(story.sprint)) return false;
        if (filters.storyPoints.length > 0) {
          const storyPointValue = (story.story_points && story.story_points > 0) ? story.story_points : 'none';
          if (!filters.storyPoints.includes(storyPointValue)) return false;
        }
        if (filters.statuses.length > 0) {
          const isResolved = story.resolved != null;
          const statusValue = isResolved ? 'resolved' : 'unresolved';
          if (!filters.statuses.includes(statusValue)) return false;
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
        return story.project_key === projectKey;
      }).length
    }));

    const priorityCounts: FilterCount[] = priorities.map(priority => ({
      value: priority,
      count: processedStories.filter(story => {
        // Apply other active filters but not priority filter
        if (filters.issueTypes.length > 0 && !filters.issueTypes.includes(story.issue_type)) return false;
        if (filters.sprints.length > 0 && !filters.sprints.includes(story.sprint)) return false;
        if (filters.storyPoints.length > 0) {
          const storyPointValue = (story.story_points && story.story_points > 0) ? story.story_points : 'none';
          if (!filters.storyPoints.includes(storyPointValue)) return false;
        }
        if (filters.statuses.length > 0) {
          const isResolved = story.resolved != null;
          const statusValue = isResolved ? 'resolved' : 'unresolved';
          if (!filters.statuses.includes(statusValue)) return false;
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
        if (filters.projectKeys.length > 0 && !filters.projectKeys.includes(story.project_key)) return false;
        const storyPriority = story.priority || 'Unassigned';
        return storyPriority === priority;
      }).length
    }));

    return { issueTypeCounts, sprintCounts, storyPointCounts, statusCounts, projectKeyCounts, priorityCounts };
  };

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

  const toggleStatus = (status: string) => {
    setFilters(prev => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter(s => s !== status)
        : [...prev.statuses, status]
    }));
  };

  const toggleProjectKey = (projectKey: string) => {
    setFilters(prev => ({
      ...prev,
      projectKeys: prev.projectKeys.includes(projectKey)
        ? prev.projectKeys.filter(pk => pk !== projectKey)
        : [...prev.projectKeys, projectKey]
    }));
  };

  const togglePriority = (priority: string) => {
    setFilters(prev => ({
      ...prev,
      priorities: prev.priorities.includes(priority)
        ? prev.priorities.filter(p => p !== priority)
        : [...prev.priorities, priority]
    }));
  };

  const selectAllIssueTypes = () => {
    const { issueTypes } = getFilterOptions();
    setFilters(prev => ({
      ...prev,
      issueTypes: issueTypes
    }));
  };

  const deselectAllIssueTypes = () => {
    setFilters(prev => ({
      ...prev,
      issueTypes: []
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
    const { issueTypes } = getFilterOptions();
    setFilters({
      issueTypes: issueTypes, // Reset to all issue types instead of empty
      sprints: [],
      storyPoints: [],
      statuses: [],
      projectKeys: preselectedProjectKey ? [preselectedProjectKey] : [],
      priorities: [],
      createdStartDate: '',
      createdEndDate: '',
      resolvedStartDate: '',
      resolvedEndDate: ''
    });
  };

  const hasActiveFilters = filters.issueTypes.length > 0 || 
    filters.sprints.length > 0 || 
    filters.storyPoints.length > 0 || 
    filters.statuses.length > 0 || 
    filters.projectKeys.length > 0 || 
    filters.priorities.length > 0 || 
    !!filters.createdStartDate || 
    !!filters.createdEndDate || 
    !!filters.resolvedStartDate || 
    !!filters.resolvedEndDate;

  const toggleAccordion = (section: keyof AccordionState) => {
    setAccordionStates(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return {
    filters,
    filteredStories,
    accordionStates,
    getFilterOptions,
    getFilterCounts,
    toggleIssueType,
    toggleSprint,
    toggleStoryPoint,
    toggleStatus,
    toggleProjectKey,
    togglePriority,
    selectAllIssueTypes,
    deselectAllIssueTypes,
    setCreatedStartDate,
    setCreatedEndDate,
    setResolvedStartDate,
    setResolvedEndDate,
    clearAllFilters,
    hasActiveFilters,
    toggleAccordion
  };
};