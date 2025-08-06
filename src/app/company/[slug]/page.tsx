'use client';

import React from 'react';
import { useQuery } from '@apollo/client';
import { useParams, useRouter } from 'next/navigation';
import { GET_COMPANY } from '@/lib/graphql/queries';
import { paths } from '@/lib/paths';
import CompanyProjectsView from '@/components/company/CompanyProjectsView';

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


export default function CompanyDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const { data: companyData, loading: companyLoading, error: companyError } = useQuery<{ company: Company }>(GET_COMPANY, {
    variables: { slug },
    skip: !slug
  });

  const company = companyData?.company;

  if (companyLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-lg border border-gray-200">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (companyError || !company) {
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


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {company.logoUrl && (
                <img
                  src={company.logoUrl}
                  alt={`${company.name} logo`}
                  className="h-16 w-16 rounded-lg object-cover"
                />
              )}
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{company.name}</h1>
                {company.description && (
                  <p className="mt-1 text-gray-600">{company.description}</p>
                )}
                <div className="flex items-center space-x-4 mt-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    company.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {company.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {company.website && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Website ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => router.push(paths.companies)}
              className="text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              ← Back to Companies
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Metrics Overview */}
        {company.metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-500 mb-1">Total Projects</div>
              <div className="text-2xl font-bold text-gray-900">
                {company.metrics.totalProjects}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-500 mb-1">Total Issues</div>
              <div className="text-2xl font-bold text-gray-900">
                {company.metrics.totalIssues}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-500 mb-1">Resolved Issues</div>
              <div className="text-2xl font-bold text-green-600">
                {company.metrics.resolvedIssues}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-500 mb-1">Flow Efficiency</div>
              <div className="text-2xl font-bold text-blue-600">
                {company.metrics.flowEfficiency 
                  ? `${(company.metrics.flowEfficiency * 100).toFixed(1)}%`
                  : 'N/A'
                }
              </div>
            </div>
          </div>
        )}

        {/* Projects Section */}
        <CompanyProjectsView 
          companyId={company.id}
          companySlug={company.slug}
          showUploadButton={true}
        />
      </div>
    </div>
  );
}