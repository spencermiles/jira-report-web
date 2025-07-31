import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface CycleTimeTier {
  name: string;
  range: string;
  color: string;
  bgColor: string;
}

interface Detail {
  label: string;
  value: string | number;
}

interface CycleTimeCardProps {
  value: number | null;
  details?: Detail[];
  description?: string;
}

const CYCLE_TIME_TIERS: CycleTimeTier[] = [
  { name: 'Elite', range: '< 1 day', color: 'text-green-600', bgColor: 'bg-green-50 border-green-200' },
  { name: 'Good', range: '1-3 days', color: 'text-blue-500', bgColor: 'bg-blue-50 border-blue-200' },
  { name: 'Fair', range: '3-7 days', color: 'text-yellow-600', bgColor: 'bg-yellow-50 border-yellow-200' },
  { name: 'Needs Focus', range: '> 7 days', color: 'text-red-600', bgColor: 'bg-red-50 border-red-200' }
];

const CycleTimeLegend: React.FC = () => {
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
        <div className="absolute z-50 w-64 p-4 bg-white border border-gray-200 rounded-lg shadow-lg -top-2 left-6">
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 text-sm">Cycle Time Benchmarks</h4>
            
            <div>
              <h5 className="font-medium text-gray-700 text-xs mb-2">Performance Tiers:</h5>
              <div className="space-y-2">
                {CYCLE_TIME_TIERS.map((tier, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${tier.color === 'text-green-600' ? 'bg-green-500' : 
                                                                tier.color === 'text-blue-500' ? 'bg-blue-500' :
                                                                tier.color === 'text-yellow-600' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                      <span className="font-medium text-gray-900">{tier.name}</span>
                    </div>
                    <span className="text-gray-700">{tier.range}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-600 leading-relaxed">
                Based on LinearB 2025 Benchmark Report. Cycle time measures the duration from when work begins (In Progress) to completion (Done).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const getCycleTimeTier = (days: number | null): CycleTimeTier => {
  if (days === null || days === 0) {
    return CYCLE_TIME_TIERS[3]; // Default to "Needs Focus" for no data
  }
  
  if (days < 1) return CYCLE_TIME_TIERS[0]; // Elite
  if (days <= 3) return CYCLE_TIME_TIERS[1]; // Good
  if (days <= 7) return CYCLE_TIME_TIERS[2]; // Fair
  return CYCLE_TIME_TIERS[3]; // Needs Focus
};

const CycleTimeCard: React.FC<CycleTimeCardProps> = ({ 
  value, 
  details,
  description = "Time from In Progress to Done. Lower values indicate faster delivery and better flow efficiency."
}) => {
  const tier = getCycleTimeTier(value);
  const displayValue = value !== null ? Math.round(value * 10) / 10 : 'N/A';
  const unit = value !== null ? (value === 1 ? ' day' : ' days') : '';

  return (
    <div className={`border rounded-lg p-4 shadow-sm ${tier.bgColor}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Cycle Time</h3>
        <CycleTimeLegend />
      </div>
      
      <div className="flex items-center space-x-3 mb-2">
        <div className={`text-2xl font-bold ${tier.color}`}>
          {displayValue}{unit}
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${tier.color} bg-white bg-opacity-70`}>
          {tier.name}
        </div>
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
};

export default CycleTimeCard;