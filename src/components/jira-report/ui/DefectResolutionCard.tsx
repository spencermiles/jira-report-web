import React from 'react';
import { DefectResolutionStats } from '@/types/jira';

interface DefectResolutionCardProps {
  defectStats: DefectResolutionStats;
}

const getPriorityColor = (priority: string): string => {
  const lowerPriority = priority.toLowerCase();
  
  // P1 = Critical (Red)
  if (lowerPriority === 'p1' || lowerPriority === 'critical' || lowerPriority === 'highest') {
    return 'text-red-600 bg-red-50 border-red-200';
  }
  
  // P2 = High (Orange)
  if (lowerPriority === 'p2' || lowerPriority === 'high') {
    return 'text-orange-600 bg-orange-50 border-orange-200';
  }
  
  // P3 = Medium (Yellow)
  if (lowerPriority === 'p3' || lowerPriority === 'medium') {
    return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  }
  
  // P4/P5 = Low (Green)
  if (lowerPriority === 'p4' || lowerPriority === 'p5' || lowerPriority === 'low' || lowerPriority === 'lowest') {
    return 'text-green-600 bg-green-50 border-green-200';
  }
  
  // Default (Gray)
  return 'text-gray-600 bg-gray-50 border-gray-200';
};

const DefectResolutionCard: React.FC<DefectResolutionCardProps> = ({ defectStats }) => {
  const colorClasses = getPriorityColor(defectStats.priority);
  
  return (
    <div className={`border rounded-lg p-4 shadow-sm ${colorClasses}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium uppercase tracking-wider">
          {defectStats.priority} Priority
        </h3>
        <span className="text-xs px-2 py-1 bg-white bg-opacity-70 rounded-full font-medium">
          {defectStats.count} defects
        </span>
      </div>
      
      <div className="text-2xl font-bold mb-2">
        {defectStats.stats.median}
        <span className="text-lg font-normal ml-1">days</span>
      </div>
      
      <div className="text-xs space-y-1 mb-3">
        <div className="flex justify-between">
          <span>Mean:</span>
          <span>{defectStats.stats.mean} days</span>
        </div>
        <div className="flex justify-between">
          <span>Min:</span>
          <span>{defectStats.stats.min} days</span>
        </div>
        <div className="flex justify-between">
          <span>Max:</span>
          <span>{defectStats.stats.max} days</span>
        </div>
      </div>
      
      <div className="mt-2 pt-2 border-t border-current border-opacity-20">
        <p className="text-xs leading-relaxed opacity-80">
          Resolution time from creation to completion for {defectStats.priority.toLowerCase()} priority defects.
        </p>
      </div>
    </div>
  );
};

export default DefectResolutionCard;