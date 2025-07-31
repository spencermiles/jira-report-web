import React from 'react';
import { Line } from 'react-chartjs-2';
import { TimePeriod } from '@/types';
import { formatTimePeriodLabel } from '../utils/calculations';

interface HistogramData {
  date: string;
  created: number;
  resolved: number;
}

interface SimpleHistogramProps {
  data: HistogramData[];
  title: string;
  timePeriod?: TimePeriod;
  height?: number;
}

const SimpleHistogram: React.FC<SimpleHistogramProps> = ({ 
  data, 
  title, 
  timePeriod = 'weekly',
  height = 300
}) => {
  if (data.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  // Format date for display based on time period
  const formatDateLabel = (dateStr: string) => {
    return formatTimePeriodLabel(dateStr, timePeriod);
  };

  const chartData = {
    labels: data.map(d => formatDateLabel(d.date)),
    datasets: [
      {
        label: 'Issues Created',
        data: data.map(d => d.created),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.1,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Issues Resolved',
        data: data.map(d => d.resolved),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.1,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: false,
      },
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxTicksLimit: 12,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: '#f3f4f6',
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div style={{ height: `${height}px` }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};

export default SimpleHistogram;