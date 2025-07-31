import React from 'react';
import { Line } from 'react-chartjs-2';
import { ProcessedStory } from '@/types/jira';

interface TrendData {
  week: string;
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
  height?: number;
  noDataMessage?: string;
  color?: string;
  movingAverageColor?: string;
}

const TrendChart: React.FC<TrendChartProps> = ({
  title,
  filteredStories,
  metricExtractor,
  height = 400,
  noDataMessage = "No data available",
  color = '#3b82f6',
  movingAverageColor = '#ef4444'
}) => {
  
  const getTrendData = (): { weeklyData: TrendData[]; rawData: RawDataPoint[] } => {
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
      return { weeklyData: [], rawData: validStories };
    }

    // Helper function to get week start (Monday)
    const getWeekStart = (date: Date): string => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
      d.setDate(diff);
      return d.toISOString().split('T')[0];
    };

    // Group by week and calculate weekly medians
    const weeklyGroups: Record<string, number[]> = {};
    
    validStories.forEach(story => {
      const weekStart = getWeekStart(story.resolvedDate);
      if (!weeklyGroups[weekStart]) {
        weeklyGroups[weekStart] = [];
      }
      weeklyGroups[weekStart].push(story.value);
    });

    // Calculate weekly medians and moving averages
    const weeklyData = Object.entries(weeklyGroups)
      .map(([week, values]) => {
        const sorted = [...values].sort((a, b) => a - b);
        const median = sorted.length > 0 ? 
          (sorted.length % 2 === 0 ? 
            (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 : 
            sorted[Math.floor(sorted.length / 2)]) : 0;
        
        return {
          week,
          medianCycleTime: Math.round(median * 10) / 10,
          count: values.length,
          movingAverage: 0 // Will be calculated below
        };
      })
      .sort((a, b) => a.week.localeCompare(b.week));

    // Calculate 4-week moving average
    weeklyData.forEach((item, index) => {
      const windowStart = Math.max(0, index - 3);
      const windowData = weeklyData.slice(windowStart, index + 1);
      const windowValues = windowData.map(w => w.medianCycleTime);
      const movingMedian = windowValues.length > 0 ? 
        windowValues.reduce((sum, val) => sum + val, 0) / windowValues.length : 0;
      item.movingAverage = Math.round(movingMedian * 10) / 10;
    });

    return { weeklyData, rawData: validStories };
  };

  const { weeklyData, rawData } = getTrendData();
  
  if (weeklyData.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          {noDataMessage}
        </div>
      </div>
    );
  }

  // Format week dates for display
  const formatWeekLabel = (weekStr: string) => {
    try {
      return new Date(weekStr).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return weekStr;
    }
  };

  // Calculate overall median for reference line
  const allValues = rawData.map(d => d.value);
  const overallMedian = allValues.length > 0 ? 
    allValues.sort((a, b) => a - b)[Math.floor(allValues.length / 2)] : 0;

  const chartData = {
    labels: weeklyData.map(d => formatWeekLabel(d.week)),
    datasets: [
      {
        type: 'line' as const,
        label: 'Weekly Median',
        data: weeklyData.map(d => d.medianCycleTime),
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
        label: '4-Week Moving Median',
        data: weeklyData.map(d => d.movingAverage),
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
        data: weeklyData.map(() => overallMedian),
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
            if (dataIndex !== undefined && weeklyData[dataIndex]) {
              return `Stories resolved: ${weeklyData[dataIndex].count}`;
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
          text: 'Week (Monday start)'
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
        Shows weekly median values with 4-week moving average trend line. Based on {rawData.length} resolved stories.
      </div>
    </div>
  );
};

export default TrendChart;