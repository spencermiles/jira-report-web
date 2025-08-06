'use client';

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { paths } from '@/lib/paths';
import CycleTimeCard from '@/components/jira-report/ui/CycleTimeCard';
import DefectResolutionSummaryWidget from './DefectResolutionSummaryWidget';
import { useProjectDefectStats } from '@/hooks/use-project-defect-stats';
import type { GraphQLProjectSummary } from '@/types/graphql';

interface CompanyProjectCardProps {
  project: GraphQLProjectSummary;
  companySlug: string;
}

const CompanyProjectCard: React.FC<CompanyProjectCardProps> = ({ project, companySlug }) => {
  const { defectResolutionStats, loading: defectStatsLoading } = useProjectDefectStats(project.key);

  return (
    <a
      href={paths.companyProject(companySlug, project.key)}
      className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 hover:border-gray-300"
    >
      <div className="flex items-start justify-between">
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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

            {/* Defect Resolution */}
            {defectStatsLoading ? (
              <div className="bg-gray-50 rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </div>
            ) : defectResolutionStats.length > 0 ? (
              <DefectResolutionSummaryWidget defectResolutionStats={defectResolutionStats} />
            ) : (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-1">Defect Resolution</h3>
                <p className="text-sm text-gray-500">No defects found</p>
              </div>
            )}
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
  );
};

export default CompanyProjectCard;