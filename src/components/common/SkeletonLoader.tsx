'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
}

const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
  rounded = false,
}) => {
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`animate-pulse bg-gray-200 ${rounded ? 'rounded-full' : 'rounded'} ${className}`}
      style={style}
    />
  );
};

// Project Card Skeleton
export const ProjectCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <div className="flex items-center mb-4">
          <Skeleton width={80} height={24} className="mr-3" />
          <Skeleton width={120} height={20} className="mr-3" />
          <Skeleton width={60} height={20} rounded />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-4">
              <Skeleton width={80} height={16} className="mb-1" />
              <Skeleton width={60} height={32} />
            </div>
          ))}
        </div>

        <div className="mt-4">
          <Skeleton width={150} height={16} />
        </div>
      </div>

      <div className="ml-6">
        <Skeleton width={24} height={24} />
      </div>
    </div>
  </div>
);

// Metrics Grid Skeleton
export const MetricsGridSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Skeleton width={80} height={16} className="mb-1" />
            <Skeleton width={60} height={32} />
          </div>
          <Skeleton width={32} height={32} />
        </div>
      </div>
    ))}
  </div>
);

// Issues Table Skeleton
export const IssuesTableSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow">
    <div className="px-6 py-4 border-b border-gray-200">
      <Skeleton width={200} height={24} />
    </div>
    
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {[...Array(8)].map((_, i) => (
              <th key={i} className="px-6 py-3">
                <Skeleton width={80} height={16} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {[...Array(10)].map((_, i) => (
            <tr key={i}>
              {[...Array(8)].map((_, j) => (
                <td key={j} className="px-6 py-4">
                  <Skeleton width={j === 1 ? 200 : 80} height={16} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// Filter Sidebar Skeleton
export const FilterSidebarSkeleton: React.FC = () => (
  <div className="w-80 bg-white border-r border-gray-200 p-6">
    <div className="mb-6">
      <Skeleton width={120} height={24} className="mb-4" />
      <Skeleton width="100%" height={16} className="mb-2" />
      <Skeleton width={80} height={16} />
    </div>

    {[...Array(6)].map((_, i) => (
      <div key={i} className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <Skeleton width={100} height={20} />
          <Skeleton width={20} height={20} />
        </div>
        <div className="space-y-2">
          {[...Array(4)].map((_, j) => (
            <div key={j} className="flex items-center justify-between">
              <Skeleton width={80} height={16} />
              <Skeleton width={24} height={16} />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

export default Skeleton;