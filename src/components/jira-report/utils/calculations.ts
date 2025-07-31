import { StatsResult } from '@/types/jira';
import { TimePeriod } from '@/types';

export const calculateStats = (values: (number | null)[]): StatsResult => {
  const validValues = values.filter((v): v is number => v !== null && typeof v === 'number' && !isNaN(v));
  
  if (validValues.length === 0) {
    return { median: 0, mean: 0, min: 0, max: 0, stdDev: 0, count: 0 };
  }
  
  const sorted = [...validValues].sort((a, b) => a - b);
  const sum = validValues.reduce((acc, val) => acc + val, 0);
  const mean = sum / validValues.length;
  
  // Calculate median
  let median: number;
  if (sorted.length % 2 === 0) {
    median = (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
  } else {
    median = sorted[Math.floor(sorted.length / 2)];
  }
  
  
  // Calculate standard deviation
  const variance = validValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / validValues.length;
  const stdDev = Math.sqrt(variance);
  
  return {
    median: Math.round(median * 10) / 10,
    mean: Math.round(mean * 10) / 10,
    min: Math.min(...validValues),
    max: Math.max(...validValues),
    stdDev: Math.round(stdDev * 10) / 10,
    count: validValues.length
  };
};

export const calculateCorrelation = (xValues: number[], yValues: number[]): number => {
  if (xValues.length !== yValues.length || xValues.length < 2) {
    return 0;
  }

  const n = xValues.length;
  const xMean = xValues.reduce((sum, x) => sum + x, 0) / n;
  const yMean = yValues.reduce((sum, y) => sum + y, 0) / n;

  let numerator = 0;
  let xSumSquares = 0;
  let ySumSquares = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = xValues[i] - xMean;
    const yDiff = yValues[i] - yMean;
    
    numerator += xDiff * yDiff;
    xSumSquares += xDiff * xDiff;
    ySumSquares += yDiff * yDiff;
  }

  const denominator = Math.sqrt(xSumSquares * ySumSquares);
  
  if (denominator === 0) {
    return 0;
  }

  return numerator / denominator;
};

export const formatTimestamp = (timestamp: Date | null): string => {
  if (!timestamp) return '-';
  try {
    return timestamp.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Invalid date';
  }
};

export const formatDate = (dateString?: string): string => {
  if (!dateString) return 'Not resolved';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'Invalid date';
  }
};

// Time period grouping utilities
export const getTimePeriodKey = (date: Date, period: TimePeriod): string => {
  const d = new Date(date);
  
  switch (period) {
    case 'daily':
      return d.toISOString().split('T')[0]; // YYYY-MM-DD
      
    case 'weekly': {
      // Get Monday of the week
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      return monday.toISOString().split('T')[0];
    }
    
    case 'biweekly': {
      // Get Monday of the week, then find which biweek it belongs to
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      
      // Use year and week number to determine biweek
      const yearStart = new Date(monday.getFullYear(), 0, 1);
      const weekNum = Math.ceil((monday.getTime() - yearStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
      const biweekNum = Math.ceil(weekNum / 2);
      
      // Return the Monday of the first week in this biweek period
      const biweekStart = new Date(yearStart);
      biweekStart.setDate(yearStart.getDate() + (biweekNum - 1) * 14 - yearStart.getDay() + 1);
      return biweekStart.toISOString().split('T')[0];
    }
    
    case 'monthly': {
      // First day of the month
      return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
    }
    
    case 'quarterly': {
      // First day of the quarter
      const quarter = Math.floor(d.getMonth() / 3);
      return new Date(d.getFullYear(), quarter * 3, 1).toISOString().split('T')[0];
    }
    
    default:
      return d.toISOString().split('T')[0];
  }
};

export const formatTimePeriodLabel = (dateStr: string, period: TimePeriod): string => {
  try {
    const date = new Date(dateStr);
    
    switch (period) {
      case 'daily':
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
        
      case 'weekly': {
        const weekEnd = new Date(date);
        weekEnd.setDate(date.getDate() + 6);
        
        const startStr = date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
        const endStr = weekEnd.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
        
        return `${startStr} - ${endStr}`;
      }
      
      case 'biweekly': {
        const biweekEnd = new Date(date);
        biweekEnd.setDate(date.getDate() + 13);
        
        const startStr = date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
        const endStr = biweekEnd.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
        
        return `${startStr} - ${endStr}`;
      }
      
      case 'monthly':
        return date.toLocaleDateString('en-US', { 
          year: 'numeric',
          month: 'short' 
        });
        
      case 'quarterly': {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return `Q${quarter} ${date.getFullYear()}`;
      }
      
      default:
        return dateStr;
    }
  } catch {
    return dateStr;
  }
};

export const getMovingAverageWindow = (period: TimePeriod): number => {
  switch (period) {
    case 'daily':
      return 7; // 7-day moving average
    case 'weekly':
      return 4; // 4-week moving average
    case 'biweekly':
      return 3; // 3 biweek moving average
    case 'monthly':
      return 3; // 3-month moving average
    case 'quarterly':
      return 2; // 2-quarter moving average
    default:
      return 4;
  }
};