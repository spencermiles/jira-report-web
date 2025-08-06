'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, AlertCircle, ArrowLeft } from 'lucide-react';
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

// GraphQL Hooks
import { useProjectWithIssues, useFilters } from '@/hooks/use-graphql';
import { useDefaultCompanyId } from '@/hooks/use-default-company';

// Components
import FilterSidebar from './ui/FilterSidebar';
import MetricsTab from './tabs/MetricsTab';  
import IssuesTab from './tabs/IssuesTab';
import ChartsTab from './tabs/ChartsTab';

// Utils
import { paths } from '@/lib/paths';
import { calculateStats } from './utils/calculations';
import { useSorting } from './hooks/useSorting';

// Types
import type { ProcessedStory, DefectResolutionStats } from '@/types/jira';
import type { GraphQLIssue, GraphQLProject } from '@/types/graphql';

interface AccordionState {
  createdDate: boolean;
  resolvedDate: boolean;
  issueType: boolean;
  sprint: boolean;
  storyPoints: boolean;
  status: boolean;
  priority: boolean;
}

// Components
import GraphQLErrorBoundary from '@/components/common/GraphQLErrorBoundary';
import { FilterSidebarSkeleton, IssuesTableSkeleton } from '@/components/common/SkeletonLoader';

interface JiraIssueReportGraphQLProps {
  preselectedProjectKey?: string;
  companyId?: string;
}

const JiraIssueReportGraphQL: React.FC<JiraIssueReportGraphQLProps> = ({ 
  preselectedProjectKey,
  companyId
}) => {
  const [activeTab, setActiveTab] = useState<'metrics' | 'issues' | 'charts'>('metrics');

  // Fallback to default company if no companyId is provided (backward compatibility)
  const defaultCompanyId = useDefaultCompanyId();
  const effectiveCompanyId = companyId || defaultCompanyId;

  // Accordion state management for FilterSidebar
  const [accordionStates, setAccordionStates] = useState<AccordionState>({
    createdDate: false,
    resolvedDate: false,
    issueType: true,
    sprint: false,
    storyPoints: false,
    status: false,
    priority: false,
  });

  // GraphQL filters hook
  const { filters, updateFilter, clearFilters, toggleArrayFilter } = useFilters({
    projectKeys: preselectedProjectKey ? [preselectedProjectKey] : undefined,
  });

  // Fetch project data with issues using GraphQL
  const { loading, error, data, refetch } = useProjectWithIssues(
    effectiveCompanyId || '',
    preselectedProjectKey || '',
    filters,
    {
      skip: !effectiveCompanyId || !preselectedProjectKey, // Skip if no company ID or project key provided
      fetchPolicy: 'cache-and-network',
    }
  );

  const project = data?.project as GraphQLProject | undefined;
  const issues = (project?.issues || []) as GraphQLIssue[];

  // Initialize all issue types as selected when data loads
  useEffect(() => {
    if (issues.length > 0 && (!filters.issueTypes || filters.issueTypes.length === 0)) {
      // Get all unique issue types from the loaded issues
      const allIssueTypes = [...new Set(issues.map(issue => issue.issueType))];
      updateFilter('issueTypes', allIssueTypes);
    }
  }, [issues.length]); // Only run when issues are first loaded

  // Handler for viewing defect issues by priority
  const handleViewDefectIssues = (priority: string) => {
    // Clear all filters but keep all issue types selected
    const allIssueTypes = [...new Set(issues.map(issue => issue.issueType))];
    clearFilters();
    updateFilter('issueTypes', allIssueTypes);
    // Set the priority filter after clearing
    setTimeout(() => {
      toggleArrayFilter('priorities', priority);
    }, 0);
    // Switch to issues tab
    setActiveTab('issues');
  };

  // Accordion toggle handler
  const toggleAccordion = (section: keyof AccordionState) => {
    setAccordionStates(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Create filter counts for sidebar
  const getFilterCounts = () => {
    if (!issues.length) {
      return {
        issueTypeCounts: [],
        sprintCounts: [],
        storyPointCounts: [],
        statusCounts: [],
        priorityCounts: [],
      };
    }
    
    const counts = {
      issueTypes: {} as Record<string, number>,
      priorities: {} as Record<string, number>,
      statuses: {} as Record<string, number>,
      sprints: {} as Record<string, number>,
      storyPoints: {} as Record<string | number, number>,
    };

    issues.forEach((issue: GraphQLIssue) => {
      // Count issue types
      counts.issueTypes[issue.issueType] = (counts.issueTypes[issue.issueType] || 0) + 1;

      // Count priorities
      if (issue.priority) {
        counts.priorities[issue.priority] = (counts.priorities[issue.priority] || 0) + 1;
      }

      // Count statuses
      counts.statuses[issue.status] = (counts.statuses[issue.status] || 0) + 1;

      // Count sprints
      if (issue.sprint) {
        counts.sprints[issue.sprint] = (counts.sprints[issue.sprint] || 0) + 1;
      }

      // Count story points
      if (issue.storyPoints) {
        counts.storyPoints[issue.storyPoints] = (counts.storyPoints[issue.storyPoints] || 0) + 1;
      }
    });

    return {
      issueTypeCounts: Object.entries(counts.issueTypes).map(([value, count]) => ({ value, count })),
      priorityCounts: Object.entries(counts.priorities).map(([value, count]) => ({ value, count })),
      statusCounts: Object.entries(counts.statuses).map(([value, count]) => ({ value, count })),
      sprintCounts: Object.entries(counts.sprints).map(([value, count]) => ({ value, count })),
      storyPointCounts: Object.entries(counts.storyPoints).map(([value, count]) => ({ 
        value: value === 'none' ? 'none' as const : Number(value), 
        count 
      })),
    };
  };

  const filterCounts = getFilterCounts();

  // Transform GraphQL data to ProcessedStory format
  const processedStories: ProcessedStory[] = issues.map((issue: GraphQLIssue) => {
    // Parse timestamps from stageTimestamps JSON if available
    const timestamps = {
      opened: null as Date | null,
      readyForDev: null as Date | null,
      readyForGrooming: null as Date | null,
      inProgress: null as Date | null,
      inReview: null as Date | null,
      inQA: null as Date | null,
      done: null as Date | null,
      readyForRelease: null as Date | null,
    };

    try {
      if (issue.metrics?.stageTimestamps) {
        const stageData = typeof issue.metrics.stageTimestamps === 'string' 
          ? JSON.parse(issue.metrics.stageTimestamps)
          : issue.metrics.stageTimestamps;
        
        // Map stage timestamps to expected format
        timestamps.opened = issue.created ? new Date(issue.created) : null;
        timestamps.done = issue.resolved ? new Date(issue.resolved) : null;
        
        // Map other stages if available in stageTimestamps
        if (stageData.inProgress) timestamps.inProgress = new Date(stageData.inProgress);
        if (stageData.inReview) timestamps.inReview = new Date(stageData.inReview);
        if (stageData.inQA) timestamps.inQA = new Date(stageData.inQA);
      } else {
        // Fallback to basic timestamps
        timestamps.opened = issue.created ? new Date(issue.created) : null;
        timestamps.done = issue.resolved ? new Date(issue.resolved) : null;
      }
    } catch {
      // Fallback for any parsing errors
      timestamps.opened = issue.created ? new Date(issue.created) : null;
      timestamps.done = issue.resolved ? new Date(issue.resolved) : null;
    }

    return {
      id: issue.id,
      key: issue.key,
      summary: issue.summary || '',
      issue_type: issue.issueType,
      project_key: issue.projectKey,
      priority: issue.priority,
      sprint: issue.sprint || '',
      created: issue.created,
      resolved: issue.resolved,
      story_points: issue.storyPoints,
      subIssueCount: 0, // TODO: Calculate from GraphQL if needed
      web_url: undefined, // webUrl not available in current GraphQL schema
      metrics: {
        leadTime: issue.metrics?.leadTime || null,
        cycleTime: issue.metrics?.cycleTime || null,
        groomingCycleTime: issue.metrics?.groomingCycleTime || null,
        devCycleTime: issue.metrics?.devCycleTime || null,
        qaCycleTime: issue.metrics?.qaCycleTime || null,
        blockers: issue.metrics?.blockers || 0,
        reviewChurn: issue.metrics?.reviewChurn || 0,
        qaChurn: issue.metrics?.qaChurn || 0,
        timestamps,
      },
    };
  });

  // Sorting functionality
  const { sortConfig, sortedStories, sortStories } = useSorting(processedStories);

  // Calculate advanced metrics for MetricsTab
  const calculateAdvancedMetrics = () => {
    const resolvedIssues = processedStories.filter(issue => issue.resolved);
    
    // Story Points Correlation
    const storyPointsCorrelation = (() => {
      const issuesWithStoryPoints = resolvedIssues.filter(issue => 
        issue.story_points && issue.metrics.cycleTime
      );
      
      if (issuesWithStoryPoints.length < 2) {
        return { correlation: 0, count: 0 };
      }
      
      // Simple correlation calculation
      const points = issuesWithStoryPoints.map(i => i.story_points!);
      const cycleTimes = issuesWithStoryPoints.map(i => i.metrics.cycleTime!);
      
      const n = points.length;
      const sumX = points.reduce((a, b) => a + b, 0);
      const sumY = cycleTimes.reduce((a, b) => a + b, 0);
      const sumXY = points.reduce((total, x, i) => total + x * cycleTimes[i], 0);
      const sumX2 = points.reduce((total, x) => total + x * x, 0);
      const sumY2 = cycleTimes.reduce((total, y) => total + y * y, 0);
      
      const correlation = (n * sumXY - sumX * sumY) / 
        Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
      
      return { 
        correlation: isNaN(correlation) ? 0 : correlation, 
        count: n 
      };
    })();

    // QA Churn Correlation
    const qaChurnCorrelation = (() => {
      const issuesWithQAChurn = resolvedIssues.filter(issue => 
        issue.metrics.qaChurn !== undefined && issue.metrics.cycleTime
      );
      
      return {
        correlation: 0, // Simplified for now
        count: issuesWithQAChurn.length
      };
    })();

    // Flow Efficiency (use GraphQL data if available, otherwise calculate)
    const flowEfficiency = project?.metrics?.flowEfficiency ? {
      efficiency: project.metrics.flowEfficiency,
      activeTime: 0, // TODO: Calculate from GraphQL data
      waitTime: 0,
      count: resolvedIssues.length
    } : {
      efficiency: 0,
      activeTime: 0,
      waitTime: 0,
      count: 0
    };

    // First Time Through (use GraphQL data if available)
    const firstTimeThrough = project?.metrics?.firstTimeThrough ? {
      percentage: project.metrics.firstTimeThrough,
      firstTimeCount: Math.round(resolvedIssues.length * project.metrics.firstTimeThrough / 100),
      totalStories: resolvedIssues.length
    } : {
      percentage: 0,
      firstTimeCount: 0,
      totalStories: resolvedIssues.length
    };

    // Stage Skips (simplified calculation)
    const stageSkips = {
      groomingSkipPercentage: 0,
      reviewSkipPercentage: 0,
      skippedGrooming: 0,
      skippedReview: 0,
      totalStories: resolvedIssues.length
    };

    // Blocked Time Analysis
    const blockedTimeAnalysis = {
      blockedTimeRatio: 0,
      avgBlockedTime: 0,
      storiesBlocked: resolvedIssues.filter(issue => issue.metrics.blockers > 0).length,
      totalStories: resolvedIssues.length
    };

    // Stage Variability
    const stageVariability = [
      {
        stage: 'Cycle Time',
        stats: calculateStats(resolvedIssues.map(i => i.metrics.cycleTime).filter(Boolean) as number[]),
        coefficient: 0
      },
      {
        stage: 'Lead Time', 
        stats: calculateStats(resolvedIssues.map(i => i.metrics.leadTime).filter(Boolean) as number[]),
        coefficient: 0
      }
    ];

    // Defect Resolution Stats
    const defectResolutionStats: DefectResolutionStats[] = [];
    const defectTypes = ['bug', 'defect', 'issue', 'incident'];
    const defects = resolvedIssues.filter(issue => 
      defectTypes.some(type => issue.issue_type.toLowerCase().includes(type.toLowerCase()))
    );

    if (defects.length > 0) {
      const priorityGroups: Record<string, ProcessedStory[]> = {};
      
      defects.forEach(defect => {
        const priority = defect.priority || 'Unassigned';
        if (!priorityGroups[priority]) {
          priorityGroups[priority] = [];
        }
        priorityGroups[priority].push(defect);
      });

      const stats = Object.entries(priorityGroups)
        .map(([priority, defects]) => {
          const resolutionTimes = defects.map(defect => {
            const createdDate = new Date(defect.created);
            const resolvedDate = new Date(defect.resolved!);
            const diffInDays = (resolvedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
            return Math.round(diffInDays * 10) / 10;
          });

          return {
            priority,
            count: defects.length,
            stats: calculateStats(resolutionTimes),
            resolutionTimes
          };
        })
        .sort((a, b) => {
          const aPriority = a.priority.toLowerCase();
          const bPriority = b.priority.toLowerCase();
          
          const aIsP = aPriority.match(/^p(\d+)$/);
          const bIsP = bPriority.match(/^p(\d+)$/);
          
          if (aIsP && bIsP) return parseInt(aIsP[1]) - parseInt(bIsP[1]);
          if (aIsP && !bIsP) return -1;
          if (!aIsP && bIsP) return 1;
          
          return aPriority.localeCompare(bPriority);
        });

      defectResolutionStats.push(...stats);
    }

    return {
      storyPointsCorrelation,
      qaChurnCorrelation,
      flowEfficiency,
      firstTimeThrough,
      stageSkips,
      blockedTimeAnalysis,
      stageVariability,
      defectResolutionStats
    };
  };

  const metrics = calculateAdvancedMetrics();

  return (
    <GraphQLErrorBoundary error={error} retry={refetch} loading={loading}>
      <div className="flex min-h-screen bg-white">
        {/* Filter Sidebar - only show when there are issues or loading */}
        {loading ? (
          <FilterSidebarSkeleton />
        ) : issues.length > 0 ? (
        <FilterSidebar
          filters={{
            issueTypes: filters.issueTypes || [],
            priorities: filters.priorities || [],
            statuses: filters.statuses || [],
            sprints: filters.sprints || [],
            storyPoints: filters.storyPoints || [],
            createdStartDate: filters.createdAfter || '',
            createdEndDate: filters.createdBefore || '',
            resolvedStartDate: filters.resolvedAfter || '',
            resolvedEndDate: filters.resolvedBefore || '',
          }}
          accordionStates={accordionStates}
          filterCounts={filterCounts}
          toggleIssueType={(type) => toggleArrayFilter('issueTypes', type)}
          toggleSprint={(sprint) => toggleArrayFilter('sprints', sprint)}
          toggleStoryPoint={(points) => toggleArrayFilter('storyPoints', points)}
          toggleStatus={(status) => toggleArrayFilter('statuses', status)}
          togglePriority={(priority) => toggleArrayFilter('priorities', priority)}
          selectAllIssueTypes={() => {
            const allTypes = filterCounts.issueTypeCounts.map(item => item.value);
            updateFilter('issueTypes', allTypes);
          }}
          deselectAllIssueTypes={() => updateFilter('issueTypes', [])}
          setCreatedStartDate={(date) => updateFilter('createdAfter', date)}
          setCreatedEndDate={(date) => updateFilter('createdBefore', date)}
          setResolvedStartDate={(date) => updateFilter('resolvedAfter', date)}
          setResolvedEndDate={(date) => updateFilter('resolvedBefore', date)}
          clearAllFilters={() => {
            // Clear all filters but keep all issue types selected
            const allTypes = filterCounts.issueTypeCounts.map(item => item.value);
            clearFilters();
            updateFilter('issueTypes', allTypes);
          }}
          toggleAccordion={toggleAccordion}
          filteredStoriesCount={issues.length}
          totalStoriesCount={issues.length}
          hasActiveFilters={(() => {
            // Check if any filters are active, but don't count issue types if all are selected
            const allIssueTypes = filterCounts.issueTypeCounts.map(item => item.value);
            const hasIssueTypeFilter = filters.issueTypes && 
              filters.issueTypes.length > 0 && 
              filters.issueTypes.length !== allIssueTypes.length;
            
            return hasIssueTypeFilter ||
              (filters.priorities && filters.priorities.length > 0) ||
              (filters.statuses && filters.statuses.length > 0) ||
              (filters.sprints && filters.sprints.length > 0) ||
              (filters.storyPoints && filters.storyPoints.length > 0) ||
              Boolean(filters.createdAfter) ||
              Boolean(filters.createdBefore) ||
              Boolean(filters.resolvedAfter) ||
              Boolean(filters.resolvedBefore);
          })()}
        />
        ) : null}
        
        {/* Main Content */}
        <div className="flex-1 p-6 bg-white">
        <div className="max-w-7xl mx-auto">
          {/* Navigation breadcrumb when viewing specific project */}
          {preselectedProjectKey && (
            <div className="mb-6">
              <Link 
                href={paths.projects}
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Projects
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 mt-2">
                {project?.name ? `${preselectedProjectKey} - ${project.name}` : `${preselectedProjectKey} - Project Analysis`}
              </h1>
            </div>
          )}
          {!preselectedProjectKey && (
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">JIRA Issue Report</h1>
              <p className="text-gray-600">Analyze your JIRA issues with cycle time analysis and performance metrics</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading project data...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <span className="text-red-800">{error.message}</span>
              </div>
            </div>
          )}

          {/* Tab Navigation and Content */}
          {loading ? (
            <div className="space-y-6">
              <div className="animate-pulse">
                <div className="flex space-x-8 border-b border-gray-200 mb-6">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-10 bg-gray-200 rounded w-20"></div>
                  ))}
                </div>
              </div>
              <IssuesTableSkeleton />
            </div>
          ) : issues.length > 0 ? (
            <div>
              {/* Tab Navigation */}
              <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
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
                    Issues ({issues.length})
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

              {/* Tab Content */}
              {activeTab === 'metrics' && (
                <MetricsTab
                  filteredStories={processedStories}
                  storyPointsCorrelation={metrics.storyPointsCorrelation}
                  qaChurnCorrelation={metrics.qaChurnCorrelation}
                  flowEfficiency={metrics.flowEfficiency}
                  firstTimeThrough={metrics.firstTimeThrough}
                  stageSkips={metrics.stageSkips}
                  blockedTimeAnalysis={metrics.blockedTimeAnalysis}
                  stageVariability={metrics.stageVariability}
                  defectResolutionStats={metrics.defectResolutionStats}
                  onViewDefectIssues={handleViewDefectIssues}
                />
              )}

              {activeTab === 'issues' && (
                <IssuesTab
                  filteredStories={sortedStories}
                  totalStoriesCount={issues.length}
                  hasActiveFilters={(() => {
                    // Check if any filters are active, but don't count issue types if all are selected
                    const allIssueTypes = filterCounts.issueTypeCounts.map(item => item.value);
                    const hasIssueTypeFilter = filters.issueTypes && 
                      filters.issueTypes.length > 0 && 
                      filters.issueTypes.length !== allIssueTypes.length;
                    
                    return hasIssueTypeFilter ||
                      (filters.priorities && filters.priorities.length > 0) ||
                      (filters.statuses && filters.statuses.length > 0) ||
                      (filters.sprints && filters.sprints.length > 0) ||
                      (filters.storyPoints && filters.storyPoints.length > 0) ||
                      Boolean(filters.createdAfter) ||
                      Boolean(filters.createdBefore) ||
                      Boolean(filters.resolvedAfter) ||
                      Boolean(filters.resolvedBefore);
                  })()}
                  sortConfig={sortConfig}
                  sortStories={sortStories}
                  clearAllFilters={() => {
                    // Clear all filters but keep all issue types selected
                    const allTypes = filterCounts.issueTypeCounts.map(item => item.value);
                    clearFilters();
                    updateFilter('issueTypes', allTypes);
                  }}
                />
              )}

              {activeTab === 'charts' && (
                <ChartsTab
                  filteredStories={processedStories}
                />
              )}
            </div>
          ) : null}

          {/* Empty State */}
          {issues.length === 0 && !loading && !error && preselectedProjectKey && (
            <div className="text-center py-8 text-gray-500">
              <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p>No issues found for this project.</p>
            </div>
          )}

          {/* No Project Selected State */}
          {!preselectedProjectKey && !loading && (
            <div className="text-center py-8 text-gray-500">
              <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p>Please select a project to view its issues.</p>
            </div>
          )}
        </div>
        </div>
      </div>
    </GraphQLErrorBoundary>
  );
};

export default JiraIssueReportGraphQL;