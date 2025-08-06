import { useMutation, useApolloClient } from '@apollo/client';
import { useState, useCallback } from 'react';
import { DELETE_PROJECT } from '@/lib/graphql/mutations';
import { GET_PROJECT_SUMMARIES, GET_PROJECTS } from '@/lib/graphql/queries';

interface UseOptimisticUpdatesResult {
  deleteProjectOptimistic: (projectId: string) => Promise<void>;
  undoDeleteProject: () => Promise<void>;
  isDeleting: boolean;
  canUndo: boolean;
  lastDeletedProject: any | null;
}

export function useOptimisticUpdates(): UseOptimisticUpdatesResult {
  const client = useApolloClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [lastDeletedProject, setLastDeletedProject] = useState<any | null>(null);
  const [canUndo, setCanUndo] = useState(false);

  const [deleteProjectMutation] = useMutation(DELETE_PROJECT, {
    onError: (error) => {
      console.error('Delete project error:', error);
      // Revert optimistic update on error
      if (lastDeletedProject) {
        client.cache.modify({
          fields: {
            projectSummaries(existing) {
              return {
                ...existing,
                projects: [...(existing?.projects || []), lastDeletedProject],
                totalCount: (existing?.totalCount || 0) + 1,
              };
            },
            projects(existing = []) {
              return [...existing, lastDeletedProject];
            },
          },
        });
      }
      setIsDeleting(false);
      setCanUndo(false);
    },
    onCompleted: () => {
      setIsDeleting(false);
      setCanUndo(true);
      
      // Clear undo possibility after 10 seconds
      setTimeout(() => {
        setCanUndo(false);
        setLastDeletedProject(null);
      }, 10000);
    },
  });

  const deleteProjectOptimistic = useCallback(async (projectId: string) => {
    setIsDeleting(true);
    
    // Find the project in cache to store for potential undo
    const projectSummariesQuery = client.readQuery({
      query: GET_PROJECT_SUMMARIES,
    });
    
    const projectToDelete = projectSummariesQuery?.projectSummaries?.projects?.find(
      (p: any) => p.id === projectId || p.key === projectId
    );
    
    if (projectToDelete) {
      setLastDeletedProject(projectToDelete);
    }

    // Optimistically remove from cache
    client.cache.modify({
      fields: {
        projectSummaries(existing) {
          if (!existing?.projects) return existing;
          
          return {
            ...existing,
            projects: existing.projects.filter((p: any) => p.id !== projectId && p.key !== projectId),
            totalCount: Math.max((existing.totalCount || 0) - 1, 0),
            aggregatedMetrics: existing.aggregatedMetrics ? {
              ...existing.aggregatedMetrics,
              totalProjects: Math.max((existing.aggregatedMetrics.totalProjects || 0) - 1, 0),
            } : undefined,
          };
        },
        projects(existing = []) {
          return existing.filter((p: any) => p.id !== projectId && p.key !== projectId);
        },
      },
    });

    // Perform actual deletion
    try {
      await deleteProjectMutation({
        variables: { id: projectId },
      });
    } catch (error) {
      // Error handling is done in the mutation's onError callback
      throw error;
    }
  }, [client, deleteProjectMutation]);

  const undoDeleteProject = useCallback(async () => {
    if (!lastDeletedProject || !canUndo) return;

    // Add project back to cache
    client.cache.modify({
      fields: {
        projectSummaries(existing) {
          return {
            ...existing,
            projects: [...(existing?.projects || []), lastDeletedProject],
            totalCount: (existing?.totalCount || 0) + 1,
            aggregatedMetrics: existing.aggregatedMetrics ? {
              ...existing.aggregatedMetrics,
              totalProjects: (existing.aggregatedMetrics.totalProjects || 0) + 1,
            } : undefined,
          };
        },
        projects(existing = []) {
          return [...existing, lastDeletedProject];
        },
      },
    });

    // Note: In a real application, you would need a "restore project" mutation
    // For now, we just restore the UI state
    setCanUndo(false);
    setLastDeletedProject(null);
  }, [client, lastDeletedProject, canUndo]);

  return {
    deleteProjectOptimistic,
    undoDeleteProject,
    isDeleting,
    canUndo,
    lastDeletedProject,
  };
}