import React from 'react';
import { Line } from 'react-chartjs-2';
import { ProcessedStory } from '@/types/jira';
import { TimePeriod } from '@/types';
import { getTimePeriodKey, formatTimePeriodLabel, getMovingAverageWindow } from '../utils/calculations';

interface TrendData {
  period: string;
  medianCycleTime: number;
  movingAverage: number;
  count: number;
}

interface RawDataPoint {
  resolvedDate: Date;
  value: number;
  key: string;
}

interface TrendChartProps {
  title: string;
  filteredStories: ProcessedStory[];
  metricExtractor: (story: ProcessedStory) => number | null;
  timePeriod?: TimePeriod;
  height?: number;
  noDataMessage?: string;
  color?: string;
  movingAverageColor?: string;
}

const TrendChart: React.FC<TrendChartProps> = ({
  title,
  filteredStories,
  metricExtractor,
  timePeriod = 'weekly',
  height = 400,
  noDataMessage = "No data available",
  color = '#3b82f6',
  movingAverageColor = '#ef4444'
}) => {
  
  const getTrendData = (): { periodData: TrendData[]; rawData: RawDataPoint[] } => {
    // Get stories with both resolved date and the specified metric
    const validStories = filteredStories
      .filter(story => {
        const value = metricExtractor(story);
        return story.resolved && value !== null && value > 0;
      })
      .map(story => ({
        resolvedDate: new Date(story.resolved!),
        value: metricExtractor(story)!,
        key: story.key
      }))
      .sort((a, b) => a.resolvedDate.getTime() - b.resolvedDate.getTime());

    if (validStories.length === 0) {
      return { periodData: [], rawData: validStories };
    }

    // Group by time period and calculate medians
    const periodGroups: Record<string, number[]> = {};
    
    validStories.forEach(story => {
      const periodKey = getTimePeriodKey(story.resolvedDate, timePeriod);
      if (!periodGroups[periodKey]) {
        periodGroups[periodKey] = [];
      }
      periodGroups[periodKey].push(story.value);
    });

    // Calculate period medians and moving averages
    const periodData = Object.entries(periodGroups)
      .map(([period, values]) => {
        const sorted = [...values].sort((a, b) => a - b);
        const median = sorted.length > 0 ? 
          (sorted.length % 2 === 0 ? 
            (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 : 
            sorted[Math.floor(sorted.length / 2)]) : 0;
        
        return {
          period,
          medianCycleTime: Math.round(median * 10) / 10,
          count: values.length,
          movingAverage: 0 // Will be calculated below
        };
      })
      .sort((a, b) => a.period.localeCompare(b.period));

    // Calculate moving average based on period type
    const windowSize = getMovingAverageWindow(timePeriod);
    periodData.forEach((item, index) => {
      const windowStart = Math.max(0, index - windowSize + 1);
      const windowData = periodData.slice(windowStart, index + 1);
      const windowValues = windowData.map(w => w.medianCycleTime);
      const movingMedian = windowValues.length > 0 ? 
        windowValues.reduce((sum, val) => sum + val, 0) / windowValues.length : 0;
      item.movingAverage = Math.round(movingMedian * 10) / 10;
    });

    return { periodData, rawData: validStories };
  };

  const { periodData, rawData } = getTrendData();
  
  if (periodData.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          {noDataMessage}
        </div>
      </div>
    );
  }

  // Format period dates for display
  const formatPeriodLabel = (periodStr: string) => {
    return formatTimePeriodLabel(periodStr, timePeriod);
  };

  // Calculate overall median for reference line
  const allValues = rawData.map(d => d.value);
  const overallMedian = allValues.length > 0 ? 
    allValues.sort((a, b) => a - b)[Math.floor(allValues.length / 2)] : 0;

  const getMovingAverageLabel = () => {
    const windowSize = getMovingAverageWindow(timePeriod);
    const periodLabel = timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1);
    return `${windowSize}-${periodLabel} Moving Median`;
  };

  const chartData = {
    labels: periodData.map(d => formatPeriodLabel(d.period)),
    datasets: [
      {
        type: 'line' as const,
        label: `${timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)} Median`,
        data: periodData.map(d => d.medianCycleTime),
        borderColor: color,
        backgroundColor: `${color}1a`, // Add transparency
        borderWidth: 2,
        fill: false,
        tension: 0.1,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        type: 'line' as const,
        label: getMovingAverageLabel(),
        data: periodData.map(d => d.movingAverage),
        borderColor: movingAverageColor,
        backgroundColor: `${movingAverageColor}1a`, // Add transparency
        borderWidth: 3,
        fill: false,
        tension: 0.2,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
      {
        type: 'line' as const,
        label: 'Overall Median',
        data: periodData.map(() => overallMedian),
        borderColor: '#6b7280',
        borderWidth: 1,
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 0,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          afterBody: (context: any) => {
            const dataIndex = context[0]?.dataIndex;
            if (dataIndex !== undefined && periodData[dataIndex]) {
              return `Stories resolved: ${periodData[dataIndex].count}`;
            }
            return '';
          }
        }
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: `${timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)} Period`
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Days'
        },
        beginAtZero: true,
      }
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="text-sm text-gray-500">
          Overall median: {Math.round(overallMedian * 10) / 10} days
        </div>
      </div>
      <div style={{ height: `${height}px` }}>
        <Line data={chartData} options={options} />
      </div>
      <div className="mt-4 text-sm text-gray-600">
        Shows {timePeriod} median values with {getMovingAverageWindow(timePeriod)}-{timePeriod} moving average trend line. Based on {rawData.length} resolved stories.
      </div>
    </div>
  );
};

export default TrendChart;