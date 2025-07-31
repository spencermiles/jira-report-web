import React from 'react';
import { TimePeriod, TimePeriodOption } from '@/types';

interface TimePeriodSelectorProps {
  value: TimePeriod;
  onChange: (period: TimePeriod) => void;
  className?: string;
}

const TIME_PERIOD_OPTIONS: TimePeriodOption[] = [
  { value: 'daily', label: 'Daily', shortLabel: 'Day' },
  { value: 'weekly', label: 'Weekly', shortLabel: 'Week' },
  { value: 'biweekly', label: 'Bi-Weekly', shortLabel: 'Biweek' },
  { value: 'monthly', label: 'Monthly', shortLabel: 'Month' },
  { value: 'quarterly', label: 'Quarterly', shortLabel: 'Quarter' },
];

const TimePeriodSelector: React.FC<TimePeriodSelectorProps> = ({ 
  value, 
  onChange, 
  className = '' 
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label htmlFor="time-period-select" className="text-sm font-medium text-gray-700">
        Group by:
      </label>
      <select
        id="time-period-select"
        value={value}
        onChange={(e) => onChange(e.target.value as TimePeriod)}
        className="px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
      >
        {TIME_PERIOD_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default TimePeriodSelector;