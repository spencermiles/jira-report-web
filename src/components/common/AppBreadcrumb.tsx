'use client';

import React from 'react';
import Link from 'next/link';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { paths } from '@/lib/paths';

interface BreadcrumbSegment {
  label: string;
  href?: string;
  current?: boolean;
}

interface AppBreadcrumbProps {
  segments: BreadcrumbSegment[];
  className?: string;
}

export const AppBreadcrumb: React.FC<AppBreadcrumbProps> = ({
  segments,
  className = "mb-6"
}) => {
  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {segments.map((segment, index) => (
          <React.Fragment key={index}>
            <BreadcrumbItem>
              {segment.current || !segment.href ? (
                <BreadcrumbPage>{segment.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={segment.href}>{segment.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index < segments.length - 1 && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

// Convenience hook to build breadcrumb segments based on common patterns
export const useBreadcrumbSegments = () => {
  const buildSegments = {
    companies: (): BreadcrumbSegment[] => [
      { label: 'Companies', current: true }
    ],
    
    company: (companyName: string): BreadcrumbSegment[] => [
      { label: 'Companies', href: paths.companies },
      { label: companyName, current: true }
    ],
    
    companyProject: (
      companyName: string, 
      companySlug: string, 
      projectKey: string
    ): BreadcrumbSegment[] => [
      { label: 'Companies', href: paths.companies },
      { label: companyName, href: paths.company(companySlug) },
      { label: projectKey, current: true }
    ],
    
    // For legacy project routes (if still needed)
    project: (projectKey: string): BreadcrumbSegment[] => [
      { label: 'Projects', href: '/projects' },
      { label: projectKey, current: true }
    ]
  };

  return buildSegments;
};

export default AppBreadcrumb;