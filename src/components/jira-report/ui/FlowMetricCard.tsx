import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface HelpContent {
  title: string;
  description: string;
  calculation: string;
  interpretation: string;
}

interface Detail {
  label: string;
  value: string | number;
}

interface FlowMetricCardProps {
  title: string;
  value: number | string;
  unit?: string;
  description: string;
  color?: string;
  details?: Detail[];
  helpContent: HelpContent;
}

const MetricHelpPopover: React.FC<HelpContent> = ({ 
  title, 
  description, 
  calculation, 
  interpretation 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="text-gray-400 hover:text-gray-600 transition-colors"
      >
        <HelpCircle className="w-4 h-4" />
      </button>
      
      {isVisible && (
        <div className="absolute z-50 w-80 p-4 bg-white border border-gray-200 rounded-lg shadow-lg -top-2 left-6">
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 text-sm">{title}</h4>
            
            <div>
              <h5 className="font-medium text-gray-700 text-xs mb-1">What it measures:</h5>
              <p className="text-xs text-gray-600 leading-relaxed">{description}</p>
            </div>
            
            <div>
              <h5 className="font-medium text-gray-700 text-xs mb-1">How it&apos;s calculated:</h5>
              <p className="text-xs text-gray-600 leading-relaxed">{calculation}</p>
            </div>
            
            <div>
              <h5 className="font-medium text-gray-700 text-xs mb-1">How to interpret:</h5>
              <p className="text-xs text-gray-600 leading-relaxed">{interpretation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FlowMetricCard: React.FC<FlowMetricCardProps> = ({ 
  title, 
  value, 
  unit, 
  description, 
  color = 'text-blue-600',
  details,
  helpContent
}) => (
  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</h3>
      <MetricHelpPopover {...helpContent} />
    </div>
    <div className={`text-2xl font-bold mb-1 ${color}`}>
      {value}{unit}
    </div>
    {details && (
      <div className="text-xs text-gray-600 space-y-1 mb-2">
        {details.map((detail, index) => (
          <div key={index} className="flex justify-between">
            <span>{detail.label}:</span>
            <span>{detail.value}</span>
          </div>
        ))}
      </div>
    )}
    <div className="mt-2 pt-2 border-t border-gray-100">
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
    </div>
  </div>
);

export default FlowMetricCard;