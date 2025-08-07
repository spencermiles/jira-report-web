'use client';

import React from 'react';
import { useQuery } from '@apollo/client';
import { GET_COMPANY } from '@/lib/graphql/queries';
import JiraIssueReport from '@/components/jira-report';
import { useRouter } from 'next/navigation';
import { paths } from '@/lib/paths';
import { AppBreadcrumb, useBreadcrumbSegments } from '@/components/common/AppBreadcrumb';

interface CompanyMetrics {
  totalProjects: number;
  totalIssues: number;
  resolvedIssues: number;
  averageLeadTime?: number;
  averageCycleTime?: number;
  flowEfficiency?: number;
  firstTimeThrough?: number;
}

interface Company {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  metrics?: CompanyMetrics;
}

interface CompanyProjectReportProps {
  companySlug: string;
  projectKey: string;
}

const CompanyProjectReport: React.FC<CompanyProjectReportProps> = ({
  companySlug,
  projectKey
}) => {
  const router = useRouter();
  const buildSegments = useBreadcrumbSegments();

  const { data: companyData, loading: companyLoading, error: companyError } = useQuery<{ company: Company }>(GET_COMPANY, {
    variables: { slug: companySlug }
  });

  if (companyLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading company data...</p>
        </div>
      </div>
    );
  }

  if (companyError || !companyData?.company) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Company Not Found</h2>
            <p className="text-red-600 mb-4">
              {companyError?.message || 'The requested company could not be found.'}
            </p>
            <button
              onClick={() => router.push(paths.companies)}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Back to Companies
            </button>
          </div>
        </div>
      </div>
    );
  }

  const company = companyData.company;
  const breadcrumbSegments = buildSegments.companyProject(company.name, company.slug, projectKey);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Company Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center space-x-4">
            {company.logoUrl && (
              <img
                src={company.logoUrl}
                alt={`${company.name} logo`}
                className="h-10 w-10 rounded-lg object-cover"
              />
            )}
            <div>
              <AppBreadcrumb segments={breadcrumbSegments} className="mb-1" />
              <h1 className="text-xl font-semibold text-gray-900">
                {company.name} - {projectKey}
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Project Report */}
      <JiraIssueReport 
        preselectedProjectKey={projectKey}
        companyId={company.id}
      />
    </div>
  );
};

export default CompanyProjectReport;