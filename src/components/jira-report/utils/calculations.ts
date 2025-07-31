import { StatsResult } from '@/types/jira';

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