import React from 'react';
import { Bar } from 'react-chartjs-2';

interface HistogramData {
  date: string;
  created: number;
  resolved: number;
}

interface SimpleHistogramProps {
  data: HistogramData[];
  title: string;
  height?: number;
}

const SimpleHistogram: React.FC<SimpleHistogramProps> = ({ 
  data, 
  title, 
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

  // Format date for display (week range)
  const formatDateLabel = (dateStr: string) => {
    try {
      const weekStart = new Date(dateStr);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const startStr = weekStart.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      const endStr = weekEnd.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
      
      return `${startStr} - ${endStr}`;
    } catch {
      return dateStr;
    }
  };

  const chartData = {
    labels: data.map(d => formatDateLabel(d.date)),
    datasets: [
      {
        label: 'Issues Created',
        data: data.map(d => d.created),
        backgroundColor: '#3b82f6',
        borderColor: '#3b82f6',
        borderWidth: 1,
      },
      {
        label: 'Issues Resolved',
        data: data.map(d => d.resolved),
        backgroundColor: '#10b981',
        borderColor: '#10b981',
        borderWidth: 1,
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
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
};

export default SimpleHistogram;