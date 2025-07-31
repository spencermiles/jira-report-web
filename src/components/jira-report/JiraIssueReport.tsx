'use client';

import React, { useState } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { 
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

// Hooks
import { useJiraData } from './hooks/useJiraData';
import { useFilters } from './hooks/useFilters';
import { useMetricsCalculations } from './hooks/useMetricsCalculations';
import { useSorting } from './hooks/useSorting';

// Components
import FilterSidebar from './ui/FilterSidebar';
import MetricsTab from './tabs/MetricsTab';
import IssuesTab from './tabs/IssuesTab';
import ChartsTab from './tabs/ChartsTab';

const JiraIssueReport = () => {
  const [activeTab, setActiveTab] = useState<'metrics' | 'issues' | 'charts'>('metrics');

  // Data management
  const { processedStories, loading, error, handleFileUpload } = useJiraData();

  // Filters
  const {
    filters,
    filteredStories,
    accordionStates,
    getFilterCounts,
    toggleIssueType,
    toggleSprint,
    toggleStoryPoint,
    toggleStatus,
    toggleProjectKey,
    setCreatedStartDate,
    setCreatedEndDate,
    setResolvedStartDate,
    setResolvedEndDate,
    clearAllFilters,
    hasActiveFilters,
    toggleAccordion
  } = useFilters(processedStories);

  // Sorting
  const { sortConfig, sortedStories, sortStories } = useSorting(filteredStories);

  // Metrics calculations
  const {
    calculateStoryPointsCorrelation,
    calculateQAChurnCorrelation,
    calculateFlowEfficiency,
    calculateFirstTimeThrough,
    calculateStageSkips,
    calculateBlockedTimeAnalysis,
    getCreatedResolvedData,
    getStageVariability
  } = useMetricsCalculations(filteredStories);

  // Calculate metrics for tabs
  const storyPointsCorrelation = calculateStoryPointsCorrelation();
  const qaChurnCorrelation = calculateQAChurnCorrelation();
  const flowEfficiency = calculateFlowEfficiency();
  const firstTimeThrough = calculateFirstTimeThrough();
  const stageSkips = calculateStageSkips();
  const blockedTimeAnalysis = calculateBlockedTimeAnalysis();
  const createdResolvedData = getCreatedResolvedData();
  const stageVariability = getStageVariability();

  // Filter counts for sidebar
  const filterCounts = getFilterCounts();

  return (
    <div className="flex min-h-screen bg-white">
      {/* Filter Sidebar - only show when there are stories */}
      {processedStories.length > 0 && (
        <FilterSidebar
          filters={filters}
          accordionStates={accordionStates}
          filterCounts={filterCounts}
          toggleIssueType={toggleIssueType}
          toggleSprint={toggleSprint}
          toggleStoryPoint={toggleStoryPoint}
          toggleStatus={toggleStatus}
          toggleProjectKey={toggleProjectKey}
          setCreatedStartDate={setCreatedStartDate}
          setCreatedEndDate={setCreatedEndDate}
          setResolvedStartDate={setResolvedStartDate}
          setResolvedEndDate={setResolvedEndDate}
          clearAllFilters={clearAllFilters}
          toggleAccordion={toggleAccordion}
          filteredStoriesCount={filteredStories.length}
          totalStoriesCount={processedStories.length}
          hasActiveFilters={hasActiveFilters}
        />
      )}
      
      {/* Main Content */}
      <div className="flex-1 p-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">JIRA Issue Report</h1>
            <p className="text-gray-600">Upload your JIRA JSON export to view all issues with cycle time analysis</p>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <div className="mb-4">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="text-lg font-medium text-gray-900">Upload JIRA JSON Export</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    accept=".json"
                    className="sr-only"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
              <p className="text-sm text-gray-500">
                Select the JSON file exported from JIRA. Supports issue tracking with cycle time analysis.
              </p>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Processing JIRA data...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}

          {/* Tab Navigation and Content */}
          {processedStories.length > 0 && (
            <div>
              {/* Tab Navigation */}
              <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('metrics')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'metrics'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Metrics
                  </button>
                  <button
                    onClick={() => setActiveTab('issues')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'issues'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Issues ({filteredStories.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('charts')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'charts'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Charts
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              {activeTab === 'metrics' && (
                <MetricsTab
                  filteredStories={filteredStories}
                  storyPointsCorrelation={storyPointsCorrelation}
                  qaChurnCorrelation={qaChurnCorrelation}
                  flowEfficiency={flowEfficiency}
                  firstTimeThrough={firstTimeThrough}
                  stageSkips={stageSkips}
                  blockedTimeAnalysis={blockedTimeAnalysis}
                  stageVariability={stageVariability}
                />
              )}

              {activeTab === 'issues' && (
                <IssuesTab
                  filteredStories={sortedStories}
                  totalStoriesCount={processedStories.length}
                  hasActiveFilters={hasActiveFilters}
                  sortConfig={sortConfig}
                  sortStories={sortStories}
                  clearAllFilters={clearAllFilters}
                />
              )}

              {activeTab === 'charts' && (
                <ChartsTab
                  filteredStories={filteredStories}
                  createdResolvedData={createdResolvedData}
                />
              )}
            </div>
          )}

          {processedStories.length === 0 && !loading && !error && (
            <div className="text-center py-8 text-gray-500">
              <FileText className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p>No issues found in the uploaded file.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JiraIssueReport;