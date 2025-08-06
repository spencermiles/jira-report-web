'use client';

import React from 'react';
import { ArrowRight, AlertCircle, TrendingUp, Clock, CheckCircle, Upload } from 'lucide-react';
import { useProjectSummaries } from '@/hooks/use-graphql';
import { useJiraUpload } from '@/hooks/use-jira-upload';
import { paths } from '@/lib/paths';
import CycleTimeCard from '@/components/jira-report/ui/CycleTimeCard';
import type { GraphQLProjectSummary } from '@/types/graphql';
import GraphQLErrorBoundary from '@/components/common/GraphQLErrorBoundary';
import { ProjectCardSkeleton, MetricsGridSkeleton } from '@/components/common/SkeletonLoader';

interface ProjectsGraphQLProps {
  showUploadButton?: boolean;
}

const ProjectsGraphQL: React.FC<ProjectsGraphQLProps> = ({
  showUploadButton = true,
}) => {
  const { loading, error, data, refetch } = useProjectSummaries();
  const { uploading, progress, error: uploadError, uploadJiraFile, clearError } = useJiraUpload();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await uploadJiraFile(file);
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
                  <p className="text-sm text-gray-600">Avg Cycle Time</p>
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
                  <p className="text-sm text-gray-600">Avg Lead Time</p>
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
            <a
              key={project.key}
              href={paths.project(project.key)}
              className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 hover:border-gray-300"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 mr-3">
                      {project.key}
                    </h2>
                    <span className="text-gray-600 mr-3">{project.name}</span>
                    <span className="bg-gray-100 text-gray-700 text-sm px-2 py-1 rounded-full">
                      {project.issueCount} issues
                    </span>
                    {project.metrics.resolvedIssues > 0 && (
                      <span className="bg-green-100 text-green-700 text-sm px-2 py-1 rounded-full ml-2">
                        {project.metrics.resolvedIssues} resolved
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Cycle Time */}
                    <CycleTimeCard
                      value={project.metrics.averageCycleTime ?? null}
                      details={[
                        { label: "Average", value: `${project.metrics.averageCycleTime?.toFixed(1) || '--'} days` },
                        { label: "Count", value: project.metrics.resolvedIssues }
                      ]}
                    />

                    {/* Lead Time */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-1">Lead Time</h3>
                      <p className="text-2xl font-semibold text-gray-900">
                        {project.metrics.averageLeadTime?.toFixed(1) || '--'}
                        <span className="text-sm font-normal text-gray-600"> days</span>
                      </p>
                    </div>

                    {/* Flow Efficiency */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-1">Flow Efficiency</h3>
                      <p className="text-2xl font-semibold text-gray-900">
                        {project.metrics.flowEfficiency?.toFixed(1) || '--'}
                        <span className="text-sm font-normal text-gray-600">%</span>
                      </p>
                    </div>

                    {/* First Time Through */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-1">First Time Through</h3>
                      <p className="text-2xl font-semibold text-gray-900">
                        {project.metrics.firstTimeThrough?.toFixed(1) || '--'}
                        <span className="text-sm font-normal text-gray-600">%</span>
                      </p>
                    </div>
                  </div>

                  {/* Activity indicator */}
                  {project.lastActivity && (
                    <div className="mt-4 text-sm text-gray-500">
                      Last activity: {new Date(project.lastActivity).toLocaleDateString()}
                    </div>
                  )}
                </div>

                <div className="ml-6 flex items-center text-gray-400 hover:text-gray-600">
                  <ArrowRight className="h-6 w-6" />
                </div>
              </div>
            </a>
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