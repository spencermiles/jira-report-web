'use client';

import React from 'react';
import { useQuery } from '@apollo/client';
import { GET_COMPANIES } from '@/lib/graphql/queries';
import { paths } from '@/lib/paths';
import { useRouter } from 'next/navigation';

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

interface CompaniesResponse {
  companies: Company[];
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export default function CompaniesPage() {
  const router = useRouter();
  const { data, loading, error } = useQuery<{ companies: CompaniesResponse }>(GET_COMPANIES, {
    variables: {
      pagination: { limit: 20, offset: 0 },
      sortBy: 'name'
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
            <p className="mt-1 text-sm text-gray-600">Select a company to view their analytics</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Companies</h2>
            <p className="text-red-600">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  const companies = data?.companies?.companies || [];

  const handleCompanyClick = (company: Company) => {
    router.push(paths.company(company.slug));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
          <p className="mt-1 text-sm text-gray-600">
            Select a company to view their analytics dashboard
          </p>
        </div>

        {companies.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <h2 className="text-lg font-medium text-gray-900 mb-2">No Companies Found</h2>
            <p className="text-gray-600">There are no companies set up in the system yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {companies.map((company) => (
              <div
                key={company.id}
                onClick={() => handleCompanyClick(company)}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {company.name}
                    </h3>
                    {company.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {company.description}
                      </p>
                    )}
                  </div>
                  {company.logoUrl && (
                    <div className="ml-4 flex-shrink-0">
                      <img
                        src={company.logoUrl}
                        alt={`${company.name} logo`}
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    </div>
                  )}
                </div>

                {company.metrics && (
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                    <div>
                      <div className="text-sm text-gray-500">Projects</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {company.metrics.totalProjects}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Issues</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {company.metrics.totalIssues}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Resolved</div>
                      <div className="text-lg font-semibold text-green-600">
                        {company.metrics.resolvedIssues}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Flow Efficiency</div>
                      <div className="text-lg font-semibold text-blue-600">
                        {company.metrics.flowEfficiency 
                          ? `${(company.metrics.flowEfficiency * 100).toFixed(1)}%`
                          : 'N/A'
                        }
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
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
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Website ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}