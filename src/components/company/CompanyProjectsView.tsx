'use client';

import React, { useState } from 'react';
import { AlertCircle, TrendingUp, Clock, CheckCircle, Upload } from 'lucide-react';
import { useProjectSummaries } from '@/hooks/use-graphql';
import type { GraphQLProjectSummary } from '@/types/graphql';
import GraphQLErrorBoundary from '@/components/common/GraphQLErrorBoundary';
import { ProjectCardSkeleton, MetricsGridSkeleton } from '@/components/common/SkeletonLoader';
import CompanyProjectCard from './CompanyProjectCard';
import CompanyUploadModal from './CompanyUploadModal';

interface CompanyProjectsViewProps {
  companyId: string;
  companySlug: string;
  showUploadButton?: boolean;
}

const CompanyProjectsView: React.FC<CompanyProjectsViewProps> = ({
  companyId,
  companySlug,
  showUploadButton = false,
}) => {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const { loading, error, data, refetch } = useProjectSummaries(companyId, undefined, undefined, undefined, {
    skip: !companyId
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <MetricsGridSkeleton />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <ProjectCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    const displayError = error?.message || 'An unexpected error occurred';
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center mb-3">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <h3 className="text-lg font-semibold text-red-800">Error Loading Projects</h3>
        </div>
        <p className="text-red-600 mb-4">{displayError}</p>
        <button
          onClick={() => refetch()}
          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const projects = data?.projectSummaries?.projects || [];
  const aggregatedMetrics = data?.projectSummaries?.aggregatedMetrics;

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">No projects found for this company.</div>
        <p className="text-sm text-gray-400 mb-6">
          Upload JIRA data to get started with project analytics.
        </p>
        
        {showUploadButton && (
          <button
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Upload className="h-5 w-5 mr-2" />
            Upload JIRA Data
          </button>
        )}
      </div>
    );
  }

  return (
    <GraphQLErrorBoundary error={error} retry={refetch} loading={loading}>
      <div className="space-y-8">
        {/* Overall Metrics */}
        {aggregatedMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Median Cycle Time</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {aggregatedMetrics.overallAverageCycleTime?.toFixed(1) || '--'} 
                    <span className="text-sm font-normal text-gray-600"> days</span>
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
                    {aggregatedMetrics.overallAverageLeadTime?.toFixed(1) || '--'} 
                    <span className="text-sm font-normal text-gray-600"> days</span>
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
                    {aggregatedMetrics.overallFlowEfficiency?.toFixed(1) || '--'}
                    <span className="text-sm font-normal text-gray-600">%</span>
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
        )}

        {/* Projects Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Projects</h2>
            <p className="text-sm text-gray-600">
              {projects.length} project{projects.length !== 1 ? 's' : ''}
              {aggregatedMetrics && (
                <span className="ml-2 text-gray-500">
                  • {aggregatedMetrics.totalIssues} total issues
                  {aggregatedMetrics.totalResolvedIssues > 0 && (
                    <span className="text-green-600 ml-1">
                      ({aggregatedMetrics.totalResolvedIssues} resolved)
                    </span>
                  )}
                </span>
              )}
            </p>
          </div>

          <div className="grid gap-6">
            {projects.map((project: GraphQLProjectSummary) => (
              <CompanyProjectCard 
                key={project.key} 
                project={project} 
                companySlug={companySlug}
                companyId={companyId}
              />
            ))}
          </div>
        </div>

        {/* Upload Button */}
        {showUploadButton && (
          <div className="text-center">
            <button
              onClick={() => setUploadModalOpen(true)}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload New Data
            </button>
          </div>
        )}
      </div>
      
      {/* Upload Modal */}
      <CompanyUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        preselectedCompanyId={companyId}
      />
    </GraphQLErrorBoundary>
  );
};

export default CompanyProjectsView;