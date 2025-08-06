import { useQuery, useLazyQuery, useMutation, QueryHookOptions, LazyQueryHookOptions, MutationHookOptions } from '@apollo/client';
import { useMemo, useState } from 'react';
import {
  GET_PROJECTS,
  GET_PROJECT_SUMMARIES,
  GET_PROJECT,
  GET_PROJECT_WITH_ISSUES,
  GET_ISSUES,
  GET_ISSUE,
  GET_CYCLE_TIME_DISTRIBUTION,
  GET_FLOW_METRICS_TREND,
  GET_DASHBOARD_DATA,
} from '@/lib/graphql/queries';
import {
  UPLOAD_JIRA_DATA,
  DELETE_PROJECT,
} from '@/lib/graphql/mutations';

// Type definitions for query variables and results
export interface IssueFilters {
  projectKeys?: string[];
  issueTypes?: string[];
  priorities?: string[];
  sprints?: string[];
  storyPoints?: number[];
  statuses?: string[];
  createdAfter?: string;
  createdBefore?: string;
  resolvedAfter?: string;
  resolvedBefore?: string;
  cycleTimeMin?: number;
  cycleTimeMax?: number;
  leadTimeMin?: number;
  leadTimeMax?: number;
  hasBlockers?: boolean;
  hasChurn?: boolean;
  parentKey?: string;
  search?: string;
}

export interface PaginationInput {
  limit?: number;
  offset?: number;
}

export interface SortInput {
  field: string;
  direction: 'ASC' | 'DESC';
}

// Projects hooks
export function useProjects(companyId: string, options?: QueryHookOptions) {
  return useQuery(GET_PROJECTS, {
    ...options,
    variables: { companyId },
    skip: !companyId || options?.skip,
  });
}

export function useProjectSummaries(
  companyId: string,
  filters?: IssueFilters,
  pagination?: PaginationInput,
  sort?: SortInput,
  options?: QueryHookOptions
) {
  return useQuery(GET_PROJECT_SUMMARIES, {
    ...options,
    variables: {
      companyId,
      filters,
      pagination: pagination || { limit: 50, offset: 0 },
      sort,
    },
    skip: !companyId || options?.skip,
  });
}

export function useProject(companyId: string, key: string, options?: QueryHookOptions) {
  return useQuery(GET_PROJECT, {
    ...options,
    variables: { companyId, key },
    skip: !companyId || !key || options?.skip,
  });
}

export function useProjectWithIssues(
  companyId: string,
  key: string,
  issueFilters?: IssueFilters,
  options?: QueryHookOptions
) {
  return useQuery(GET_PROJECT_WITH_ISSUES, {
    ...options,
    variables: { companyId, key, issueFilters },
    skip: !companyId || !key || options?.skip,
  });
}

// Issues hooks
export function useIssues(
  filters?: IssueFilters,
  pagination?: PaginationInput,
  sort?: SortInput,
  options?: QueryHookOptions
) {
  return useQuery(GET_ISSUES, {
    ...options,
    variables: {
      filters,
      pagination: pagination || { limit: 50, offset: 0 },
      sort,
    },
  });
}

export function useIssue(key: string, options?: QueryHookOptions) {
  return useQuery(GET_ISSUE, {
    ...options,
    variables: { key },
    skip: !key || options?.skip,
  });
}

// Analytics hooks
export function useCycleTimeDistribution(
  projectKeys?: string[],
  filters?: IssueFilters,
  options?: QueryHookOptions
) {
  return useQuery(GET_CYCLE_TIME_DISTRIBUTION, {
    ...options,
    variables: { projectKeys, filters },
  });
}

export function useFlowMetricsTrend(
  projectKeys: string[],
  period: 'week' | 'month' | 'quarter',
  filters?: IssueFilters,
  options?: QueryHookOptions
) {
  return useQuery(GET_FLOW_METRICS_TREND, {
    ...options,
    variables: { projectKeys, period, filters },
    skip: !projectKeys?.length || options?.skip,
  });
}

// Dashboard hook
export function useDashboardData(
  projectFilters?: IssueFilters,
  pagination?: PaginationInput,
  trendPeriod: 'week' | 'month' | 'quarter' = 'month',
  options?: QueryHookOptions
) {
  return useQuery(GET_DASHBOARD_DATA, {
    ...options,
    variables: {
      projectFilters,
      pagination: pagination || { limit: 10, offset: 0 },
      trendPeriod,
    },
  });
}

// Lazy query hooks for on-demand fetching
export function useLazyIssues(options?: LazyQueryHookOptions) {
  return useLazyQuery(GET_ISSUES, options);
}

export function useLazyProjectWithIssues(options?: LazyQueryHookOptions) {
  return useLazyQuery(GET_PROJECT_WITH_ISSUES, options);
}

// Helper hook for managing pagination
export function usePaginatedQuery<T>(
  useQueryHook: Function,
  filters?: IssueFilters,
  pageSize: number = 50
) {
  const [page, setPage] = useState(0);
  
  const pagination = useMemo(
    () => ({
      limit: pageSize,
      offset: page * pageSize,
    }),
    [page, pageSize]
  );

  const result = useQueryHook(filters, pagination);

  const nextPage = () => {
    if (result.data?.hasNextPage) {
      setPage(p => p + 1);
    }
  };

  const previousPage = () => {
    if (page > 0) {
      setPage(p => p - 1);
    }
  };

  const resetPage = () => {
    setPage(0);
  };

  return {
    ...result,
    page,
    nextPage,
    previousPage,
    resetPage,
    hasNextPage: result.data?.hasNextPage || false,
    hasPreviousPage: page > 0,
  };
}

// Helper hook for managing filters
export function useFilters(initialFilters?: IssueFilters) {
  const [filters, setFilters] = useState<IssueFilters>(initialFilters || {});

  const updateFilter = <K extends keyof IssueFilters>(
    key: K,
    value: IssueFilters[K]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const toggleArrayFilter = <K extends keyof IssueFilters>(
    key: K,
    value: string | number
  ) => {
    setFilters(prev => {
      const currentValue = prev[key] as (string | number)[] | undefined;
      const newValue = currentValue || [];
      
      if (newValue.includes(value)) {
        return {
          ...prev,
          [key]: newValue.filter(v => v !== value),
        };
      } else {
        return {
          ...prev,
          [key]: [...newValue, value],
        };
      }
    });
  };

  return {
    filters,
    updateFilter,
    clearFilters,
    toggleArrayFilter,
  };
}

// Mutation hooks
export function useUploadJiraData(options?: MutationHookOptions) {
  return useMutation(UPLOAD_JIRA_DATA, {
    ...options,
    refetchQueries: [
      'GetProjectSummaries',
      'GetProjects',
      'GetDashboardData',
    ],
    awaitRefetchQueries: true,
  });
}

export function useDeleteProject(options?: MutationHookOptions) {
  return useMutation(DELETE_PROJECT, {
    ...options,
    refetchQueries: [
      'GetProjectSummaries',
      'GetProjects',
      'GetDashboardData',
    ],
    awaitRefetchQueries: true,
  });
}