'use client';

import React from 'react';
import { AlertCircle, TrendingUp, Clock, CheckCircle, Upload } from 'lucide-react';
import { useProjectSummaries } from '@/hooks/use-graphql';
import { useJiraUpload } from '@/hooks/use-jira-upload';
import { useDefaultCompanyId } from '@/hooks/use-default-company';
import type { GraphQLProjectSummary } from '@/types/graphql';
import GraphQLErrorBoundary from '@/components/common/GraphQLErrorBoundary';
import { ProjectCardSkeleton, MetricsGridSkeleton } from '@/components/common/SkeletonLoader';
import ProjectCard from './ProjectCard';

interface ProjectsGraphQLProps {
  showUploadButton?: boolean;
}

const ProjectsGraphQL: React.FC<ProjectsGraphQLProps> = ({
  showUploadButton = true,
}) => {
  const defaultCompanyId = useDefaultCompanyId();
  const { loading, error, data, refetch } = useProjectSummaries(defaultCompanyId || '', undefined, undefined, undefined, {
    skip: !defaultCompanyId
  });
  const { uploading, progress, error: uploadError, uploadJiraFile, clearError } = useJiraUpload();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && defaultCompanyId) {
      await uploadJiraFile(file, defaultCompanyId);
      // Clear the input value so the same file can be uploaded again if needed
      event.target.value = '';
    }
  };

  if (loading || uploading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {uploading ? (progress?.message || 'Uploading...') : 'Loading projects...'}
          </p>
          {progress && (
            <div className="mt-4 max-w-xs mx-auto">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span className="capitalize">{progress.stage}</span>
                <span>{progress.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-width duration-300"
                  style={{ width: `${progress.progress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error || uploadError) {
    const displayError = uploadError || error?.message || 'An unexpected error occurred';
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {uploadError ? 'Upload Error' : 'Error Loading Projects'}
          </h2>
          <p className="text-gray-600 mb-4">{displayError}</p>
          <div className="space-x-3">
            {uploadError && (
              <button
                onClick={clearError}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                Dismiss
              </button>
            )}
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const projects = data?.projectSummaries?.projects || [];
  const aggregatedMetrics = data?.projectSummaries?.aggregatedMetrics;

  if (projects.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">JIRA Project Analytics</h1>
            <p className="text-lg text-gray-600">
              No projects found. Upload JIRA data to get started.
            </p>
          </div>

          {showUploadButton && (
            <div className="text-center">
              <label className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer transition-colors">
                <Upload className="h-5 w-5 mr-2" />
                Upload JIRA Data
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <GraphQLErrorBoundary error={error || (uploadError ? new Error(uploadError) : null)} retry={refetch} loading={loading || uploading}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Project Overview</h1>
            <p className="text-gray-600">
              {loading ? (
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-64"></div>
                </div>
              ) : aggregatedMetrics ? (
                <>
                  {aggregatedMetrics.totalProjects} projects with {aggregatedMetrics.totalIssues} total issues
                  {aggregatedMetrics.totalResolvedIssues > 0 && (
                    <span className="text-green-600 ml-2">
                      ({aggregatedMetrics.totalResolvedIssues} resolved)
                    </span>
                  )}
                </>
              ) : null}
            </p>
          </div>

        {/* Overall Metrics */}
        {loading ? (
          <MetricsGridSkeleton />
        ) : aggregatedMetrics ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Median Cycle Time</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {aggregatedMetrics.overallAverageCycleTime?.toFixed(1) || '--'} days
                  </p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Median Lead Time</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {aggregatedMetrics.overallAverageLeadTime?.toFixed(1) || '--'} days
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Flow Efficiency</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {aggregatedMetrics.overallFlowEfficiency?.toFixed(1) || '--'}%
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-purple-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Projects</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {aggregatedMetrics.totalProjects}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Resolution Rate</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {aggregatedMetrics.totalIssues > 0
                      ? Math.round((aggregatedMetrics.totalResolvedIssues / aggregatedMetrics.totalIssues) * 100)
                      : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Projects Grid */}
        <div className="grid gap-6">
          {loading ? (
            // Show skeleton loaders while loading
            [...Array(3)].map((_, i) => <ProjectCardSkeleton key={i} />)
          ) : (
            projects.map((project: GraphQLProjectSummary) => (
              <ProjectCard key={project.key} project={project} />
            ))
          )}
        </div>

        {/* Upload Button */}
        {showUploadButton && (
          <div className="mt-8 text-center">
            <label className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors">
              <Upload className="h-4 w-4 mr-2" />
              Upload New Data
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        )}
        </div>
      </div>
    </GraphQLErrorBoundary>
  );
};

export default ProjectsGraphQL;