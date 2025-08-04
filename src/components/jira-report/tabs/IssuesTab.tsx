import React, { useState } from 'react';
import { Calendar, HelpCircle } from 'lucide-react';
import { ProcessedStory, TooltipType } from '@/types/jira';
import { formatDate, formatTimestamp } from '../utils/calculations';

interface IssuesTabProps {
  filteredStories: ProcessedStory[];
  totalStoriesCount: number;
  hasActiveFilters: boolean;
  sortConfig: { key: string; direction: 'asc' | 'desc' } | null;
  sortStories: (field: string) => void;
  clearAllFilters: () => void;
}

const IssuesTab: React.FC<IssuesTabProps> = ({
  filteredStories,
  totalStoriesCount,
  hasActiveFilters,
  sortConfig,
  sortStories,
  clearAllFilters
}) => {
  const [hoveredTooltip, setHoveredTooltip] = useState<TooltipType>(null);

  // Sort the stories based on current sort config
  const sortedStories = [...filteredStories].sort((a, b) => {
    if (!sortConfig) return 0;
    
    const { key, direction } = sortConfig;
    const multiplier = direction === 'asc' ? 1 : -1;
    
    if (key === 'key') {
      return a.key.localeCompare(b.key) * multiplier;
    }
    if (key === 'summary') {
      return a.summary.localeCompare(b.summary) * multiplier;
    }
    if (key === 'issue_type') {
      return a.issue_type.localeCompare(b.issue_type) * multiplier;
    }
    if (key === 'priority') {
      const aPriority = a.priority || 'Unassigned';
      const bPriority = b.priority || 'Unassigned';
      return aPriority.localeCompare(bPriority) * multiplier;
    }
    if (key === 'sprint') {
      return a.sprint.localeCompare(b.sprint) * multiplier;
    }
    if (key === 'created') {
      return (new Date(a.created).getTime() - new Date(b.created).getTime()) * multiplier;
    }
    if (key === 'resolved') {
      const aResolved = a.resolved ? new Date(a.resolved).getTime() : 0;
      const bResolved = b.resolved ? new Date(b.resolved).getTime() : 0;
      return (aResolved - bResolved) * multiplier;
    }
    if (key === 'story_points') {
      const aPoints = a.story_points || 0;
      const bPoints = b.story_points || 0;
      return (aPoints - bPoints) * multiplier;
    }
    if (key === 'subIssueCount') {
      return (a.subIssueCount - b.subIssueCount) * multiplier;
    }
    if (key.startsWith('metrics.')) {
      const metricKey = key.replace('metrics.', '') as keyof typeof a.metrics;
      const aValue = a.metrics[metricKey] || 0;
      const bValue = b.metrics[metricKey] || 0;
      return (Number(aValue) - Number(bValue)) * multiplier;
    }
    
    return 0;
  });

  const renderTooltip = (tooltipType: TooltipType, content: string) => {
    if (hoveredTooltip === tooltipType) {
      return (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-gray-900 text-white text-xs rounded py-2 px-3 whitespace-nowrap z-50 shadow-lg">
          {content}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Issues: {filteredStories.length} {hasActiveFilters && `of ${totalStoriesCount}`}
        </h2>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Clear All Filters
          </button>
        )}
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => sortStories('key')}
                >
                  Issue Key
                </th>
                <th 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => sortStories('issue_type')}
                >
                  Type
                </th>
                <th 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => sortStories('priority')}
                >
                  Priority
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => sortStories('summary')}
                >
                  Summary
                </th>
                <th 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => sortStories('sprint')}
                >
                  Sprint
                </th>
                <th 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => sortStories('created')}
                >
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    Created
                  </div>
                </th>
                <th 
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => sortStories('resolved')}
                >
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    Resolved
                  </div>
                </th>
                <th 
                  className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => sortStories('story_points')}
                >
                  Story Points
                </th>
                <th 
                  className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => sortStories('subIssueCount')}
                >
                  Sub-Issues
                </th>
                <th 
                  className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => sortStories('metrics.leadTime')}
                >
                  <div className="flex items-center justify-center">
                    <span>Lead Time (days)</span>
                    <div className="relative ml-1">
                      <HelpCircle 
                        className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" 
                        onMouseEnter={() => setHoveredTooltip('leadTime')}
                        onMouseLeave={() => setHoveredTooltip(null)}
                      />
                      {renderTooltip('leadTime', 'Issue Created → Last "Done"')}
                    </div>
                  </div>
                </th>
                <th 
                  className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => sortStories('metrics.cycleTime')}
                >
                  <div className="flex items-center justify-center">
                    <span>Cycle Time (days)</span>
                    <div className="relative ml-1">
                      <HelpCircle 
                        className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" 
                        onMouseEnter={() => setHoveredTooltip('cycleTime')}
                        onMouseLeave={() => setHoveredTooltip(null)}
                      />
                      {renderTooltip('cycleTime', 'First "In Progress" → Last "Done"')}
                    </div>
                  </div>
                </th>
                <th 
                  className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => sortStories('metrics.groomingCycleTime')}
                >
                  <div className="flex items-center justify-center">
                    <span>Grooming (days)</span>
                    <div className="relative ml-1">
                      <HelpCircle 
                        className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" 
                        onMouseEnter={() => setHoveredTooltip('grooming')}
                        onMouseLeave={() => setHoveredTooltip(null)}
                      />
                      {renderTooltip('grooming', 'First "Ready for Grooming" → First "In Progress"')}
                    </div>
                  </div>
                </th>
                <th 
                  className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => sortStories('metrics.devCycleTime')}
                >
                  <div className="flex items-center justify-center">
                    <span>Dev (days)</span>
                    <div className="relative ml-1">
                      <HelpCircle 
                        className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" 
                        onMouseEnter={() => setHoveredTooltip('dev')}
                        onMouseLeave={() => setHoveredTooltip(null)}
                      />
                      {renderTooltip('dev', 'First "In Progress" → First "In QA"')}
                    </div>
                  </div>
                </th>
                <th 
                  className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => sortStories('metrics.qaCycleTime')}
                >
                  <div className="flex items-center justify-center">
                    <span>QA (days)</span>
                    <div className="relative ml-1">
                      <HelpCircle 
                        className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" 
                        onMouseEnter={() => setHoveredTooltip('qa')}
                        onMouseLeave={() => setHoveredTooltip(null)}
                      />
                      {renderTooltip('qa', 'First "In QA" → Last "Done"')}
                    </div>
                  </div>
                </th>
                <th 
                  className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => sortStories('metrics.blockers')}
                >
                  Blockers
                </th>
                <th 
                  className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => sortStories('metrics.reviewChurn')}
                >
                  Review Churn
                </th>
                <th 
                  className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => sortStories('metrics.qaChurn')}
                >
                  QA Churn
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Opened
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  In Grooming
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  In Progress
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  In Review
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  In QA
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Done
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedStories.map((story, index) => (
                <tr key={story.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <a 
                      href={story.web_url || `https://rwaapps.atlassian.net/browse/${story.key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {story.key}
                    </a>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-700">
                      {story.issue_type || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-700">
                      {story.priority || 'Unassigned'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {story.summary}
                    </div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-700 max-w-32 truncate block">
                      {story.sprint}
                    </span>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(story.created)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(story.resolved)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-700">
                    {story.story_points || '-'}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      story.subIssueCount === 0 ? 'bg-gray-100 text-gray-500' :
                      story.subIssueCount <= 3 ? 'bg-green-100 text-green-800' :
                      story.subIssueCount <= 6 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {story.subIssueCount}
                    </span>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      story.metrics.leadTime === null ? 'bg-gray-100 text-gray-500' :
                      story.metrics.leadTime > 60 ? 'bg-red-100 text-red-800' :
                      story.metrics.leadTime > 30 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {story.metrics.leadTime === null ? '-' : story.metrics.leadTime}
                    </span>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      story.metrics.cycleTime === null ? 'bg-gray-100 text-gray-500' :
                      story.metrics.cycleTime > 30 ? 'bg-red-100 text-red-800' :
                      story.metrics.cycleTime > 14 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {story.metrics.cycleTime === null ? '-' : story.metrics.cycleTime}
                    </span>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-700">
                    {story.metrics.groomingCycleTime === null ? '-' : story.metrics.groomingCycleTime}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-700">
                    {story.metrics.devCycleTime === null ? '-' : story.metrics.devCycleTime}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-700">
                    {story.metrics.qaCycleTime === null ? '-' : story.metrics.qaCycleTime}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      story.metrics.blockers === 0 ? 'bg-green-100 text-green-800' :
                      story.metrics.blockers === 1 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {story.metrics.blockers}
                    </span>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      story.metrics.reviewChurn === 0 ? 'bg-green-100 text-green-800' :
                      story.metrics.reviewChurn === 1 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {story.metrics.reviewChurn}
                    </span>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      story.metrics.qaChurn === 0 ? 'bg-green-100 text-green-800' :
                      story.metrics.qaChurn === 1 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {story.metrics.qaChurn}
                    </span>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-xs text-center text-gray-600">
                    {formatTimestamp(story.metrics.timestamps.opened)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-xs text-center text-gray-600">
                    {formatTimestamp(story.metrics.timestamps.readyForGrooming)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-xs text-center text-gray-600">
                    {formatTimestamp(story.metrics.timestamps.inProgress)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-xs text-center text-gray-600">
                    {formatTimestamp(story.metrics.timestamps.inReview)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-xs text-center text-gray-600">
                    {formatTimestamp(story.metrics.timestamps.inQA)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-xs text-center text-gray-600">
                    {formatTimestamp(story.metrics.timestamps.done)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default IssuesTab;