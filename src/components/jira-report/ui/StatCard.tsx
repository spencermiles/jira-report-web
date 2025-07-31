import React from 'react';
import { StatsResult } from '@/types/jira';

interface StatCardProps {
  title: string;
  stats: StatsResult;
  unit?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, stats, unit = '' }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">{title}</h3>
    <div className="text-2xl font-bold text-gray-900 mb-1">
      {stats.median}{unit}
      <span className="text-sm font-normal text-gray-500 ml-1">median</span>
    </div>
    <div className="text-xs text-gray-600 space-y-1">
      <div className="flex justify-between">
        <span>Mean:</span>
        <span>{stats.mean}{unit}</span>
      </div>
      <div className="flex justify-between">
        <span>Range:</span>
        <span>{stats.min}-{stats.max}{unit}</span>
      </div>
      <div className="flex justify-between">
        <span>Std Dev:</span>
        <span>{stats.stdDev}{unit}</span>
      </div>
      <div className="flex justify-between">
        <span>Count:</span>
        <span>{stats.count}</span>
      </div>
    </div>
  </div>
);

export default StatCard;