import React from 'react';
import { ProcessedStory } from '@/types/jira';
import TrendChart from '../charts/TrendChart';
import SimpleHistogram from '../charts/SimpleHistogram';
import CumulativeLineChart from '../charts/CumulativeLineChart';

interface ChartsTabProps {
  filteredStories: ProcessedStory[];
  createdResolvedData: Array<{ date: string; created: number; resolved: number }>;
}

const ChartsTab: React.FC<ChartsTabProps> = ({
  filteredStories,
  createdResolvedData
}) => {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Charts & Trends</h2>
        <p className="text-gray-600">Visual analysis of issue creation and resolution patterns over time</p>
      </div>

      {/* Cycle Time Trend Charts */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Cycle Time Trends</h3>
        
        {/* Lead Time Trend */}
        <div className="mb-8">
          <TrendChart
            title="Lead Time Trend"
            filteredStories={filteredStories}
            metricExtractor={(story) => story.metrics.leadTime}
            noDataMessage="No lead time data available"
            color="#3b82f6"
            movingAverageColor="#ef4444"
          />
        </div>

        {/* Cycle Time Trend */}
        <div className="mb-8">
          <TrendChart
            title="Cycle Time Trend"
            filteredStories={filteredStories}
            metricExtractor={(story) => story.metrics.cycleTime}
            noDataMessage="No cycle time data available"
            color="#10b981"
            movingAverageColor="#f59e0b"
          />
        </div>

        {/* Grooming Cycle Time Trend */}
        <div className="mb-8">
          <TrendChart
            title="Grooming Cycle Time Trend"
            filteredStories={filteredStories}
            metricExtractor={(story) => story.metrics.groomingCycleTime}
            noDataMessage="No grooming cycle time data available"
            color="#8b5cf6"
            movingAverageColor="#ef4444"
          />
        </div>

        {/* Development Cycle Time Trend */}
        <div className="mb-8">
          <TrendChart
            title="Development Cycle Time Trend"
            filteredStories={filteredStories}
            metricExtractor={(story) => story.metrics.devCycleTime}
            noDataMessage="No development cycle time data available"
            color="#f59e0b"
            movingAverageColor="#ef4444"
          />
        </div>

        {/* QA Cycle Time Trend */}
        <div className="mb-8">
          <TrendChart
            title="QA Cycle Time Trend"
            filteredStories={filteredStories}
            metricExtractor={(story) => story.metrics.qaCycleTime}
            noDataMessage="No QA cycle time data available"
            color="#ef4444"
            movingAverageColor="#6366f1"
          />
        </div>
      </div>

      {/* Issue Activity Charts */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Issue Activity</h3>

        {/* Weekly Activity Histogram */}
        <div className="mb-8">
          <SimpleHistogram
            data={createdResolvedData}
            title="Weekly Issues Created vs Resolved"
            height={400}
          />
        </div>

        {/* Cumulative Trend Chart */}
        <div className="mb-8">
          <CumulativeLineChart
            data={createdResolvedData}
            title="Cumulative Issues Created vs Resolved Over Time (Weekly)"
            height={400}
          />
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Creation Trend</h3>
          <div className="text-3xl font-bold text-blue-600 mb-1">
            {filteredStories.filter(s => s.created).length}
          </div>
          <div className="text-sm text-gray-600">Total Issues Created</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Resolution Trend</h3>
          <div className="text-3xl font-bold text-green-600 mb-1">
            {filteredStories.filter(s => s.resolved).length}
          </div>
          <div className="text-sm text-gray-600">Total Issues Resolved</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Work in Progress</h3>
          <div className="text-3xl font-bold text-yellow-600 mb-1">
            {filteredStories.filter(s => !s.resolved).length}
          </div>
          <div className="text-sm text-gray-600">Issues Still Open</div>
        </div>
      </div>
    </div>
  );
};

export default ChartsTab;