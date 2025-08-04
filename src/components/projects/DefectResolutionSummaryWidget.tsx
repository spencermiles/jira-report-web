import React from 'react';
import { DefectResolutionStats } from '@/types/jira';

interface DefectResolutionSummaryWidgetProps {
  defectResolutionStats: DefectResolutionStats[];
}

const getPriorityColor = (priority: string): string => {
  const lowerPriority = priority.toLowerCase();
  
  // P1 = Critical (Red)
  if (lowerPriority === 'p1' || lowerPriority === 'critical' || lowerPriority === 'highest') {
    return 'text-red-600 bg-red-50';
  }
  
  // P2 = High (Orange)
  if (lowerPriority === 'p2' || lowerPriority === 'high') {
    return 'text-orange-600 bg-orange-50';
  }
  
  // P3 = Medium (Yellow)
  if (lowerPriority === 'p3' || lowerPriority === 'medium') {
    return 'text-yellow-600 bg-yellow-50';
  }
  
  // P4/P5 = Low (Green)
  if (lowerPriority === 'p4' || lowerPriority === 'p5' || lowerPriority === 'low' || lowerPriority === 'lowest') {
    return 'text-green-600 bg-green-50';
  }
  
  // Default (Gray)
  return 'text-gray-600 bg-gray-50';
};

const DefectResolutionSummaryWidget: React.FC<DefectResolutionSummaryWidgetProps> = ({ 
  defectResolutionStats
}) => {
  if (defectResolutionStats.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-3">Defect Resolution Time</h3>
      <div className="space-y-2">
        {defectResolutionStats.map((defectStat) => {
          const colorClasses = getPriorityColor(defectStat.priority);
          
          return (
            <div key={defectStat.priority} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${colorClasses}`}>
                  {defectStat.priority}
                </span>
                <span className="text-sm text-gray-600">
                  {defectStat.count} bug{defectStat.count !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="text-sm font-medium text-gray-900">
                {defectStat.stats.median} days
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DefectResolutionSummaryWidget;