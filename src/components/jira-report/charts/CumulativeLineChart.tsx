import React from 'react';
import { Line } from 'react-chartjs-2';

interface CumulativeData {
  date: string;
  created: number;
  resolved: number;
}

interface CumulativeLineChartProps {
  data: CumulativeData[];
  title: string;
  height?: number;
}

const CumulativeLineChart: React.FC<CumulativeLineChartProps> = ({ 
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

  // Calculate cumulative data
  const cumulativeData = data.reduce((acc, curr, index) => {
    const prevCreated = index > 0 ? acc[index - 1].cumulativeCreated : 0;
    const prevResolved = index > 0 ? acc[index - 1].cumulativeResolved : 0;
    
    acc.push({
      date: curr.date,
      cumulativeCreated: prevCreated + curr.created,
      cumulativeResolved: prevResolved + curr.resolved
    });
    
    return acc;
  }, [] as Array<{ date: string; cumulativeCreated: number; cumulativeResolved: number }>);

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
    labels: cumulativeData.map(d => formatDateLabel(d.date)),
    datasets: [
      {
        label: 'Cumulative Issues Created',
        data: cumulativeData.map(d => d.cumulativeCreated),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.1,
      },
      {
        label: 'Cumulative Issues Resolved',
        data: cumulativeData.map(d => d.cumulativeResolved),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.1,
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

export default CumulativeLineChart;