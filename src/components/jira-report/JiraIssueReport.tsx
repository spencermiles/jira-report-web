'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { FileText, AlertCircle, ArrowLeft } from 'lucide-react';
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
import { useJiraDataContext } from '@/contexts/jira-data-context';
import { useFilters } from './hooks/useFilters';
import { useMetricsCalculations } from './hooks/useMetricsCalculations';
import { useSorting } from './hooks/useSorting';

// Components
import FilterSidebar from './ui/FilterSidebar';
import MetricsTab from './tabs/MetricsTab';
import IssuesTab from './tabs/IssuesTab';
import ChartsTab from './tabs/ChartsTab';

// Utils
import { paths } from '@/lib/paths';

interface JiraIssueReportProps {
  preselectedProjectKey?: string;
}

const JiraIssueReport: React.FC<JiraIssueReportProps> = ({ preselectedProjectKey }) => {
  const [activeTab, setActiveTab] = useState<'metrics' | 'issues' | 'charts'>('metrics');

  // Data management
  const { processedStories, loading, error, isHydrated } = useJiraDataContext();
  

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
    togglePriority,
    selectAllIssueTypes,
    deselectAllIssueTypes,
    setCreatedStartDate,
    setCreatedEndDate,
    setResolvedStartDate,
    setResolvedEndDate,
    clearAllFilters,
    hasActiveFilters,
    toggleAccordion
  } = useFilters(processedStories, preselectedProjectKey);

  // Sorting
  const { sortConfig, sortedStories, sortStories } = useSorting(filteredStories);

  // Handler for viewing defect issues by priority
  const handleViewDefectIssues = (priority: string) => {
    // Clear all current filters and set priority filter
    clearAllFilters();
    // Set the priority filter after clearing
    setTimeout(() => {
      togglePriority(priority);
    }, 0);
    // Switch to issues tab
    setActiveTab('issues');
  };

  // Metrics calculations
  const {
    calculateStoryPointsCorrelation,
    calculateQAChurnCorrelation,
    calculateFlowEfficiency,
    calculateFirstTimeThrough,
    calculateStageSkips,
    calculateBlockedTimeAnalysis,
    getStageVariability,
    calculateDefectResolutionTime
  } = useMetricsCalculations(filteredStories);

  // Calculate metrics for tabs
  const storyPointsCorrelation = calculateStoryPointsCorrelation();
  const qaChurnCorrelation = calculateQAChurnCorrelation();
  const flowEfficiency = calculateFlowEfficiency();
  const firstTimeThrough = calculateFirstTimeThrough();
  const stageSkips = calculateStageSkips();
  const blockedTimeAnalysis = calculateBlockedTimeAnalysis();
  const stageVariability = getStageVariability();
  const defectResolutionStats = calculateDefectResolutionTime();

  // Filter counts for sidebar
  const filterCounts = getFilterCounts();

  return (
    <div className="flex min-h-screen bg-white">
      {/* Filter Sidebar - only show when there are stories and hydrated */}
      {processedStories.length > 0 && isHydrated && (
        <FilterSidebar
          filters={filters}
          accordionStates={accordionStates}
          filterCounts={filterCounts}
          toggleIssueType={toggleIssueType}
          toggleSprint={toggleSprint}
          toggleStoryPoint={toggleStoryPoint}
          toggleStatus={toggleStatus}
          toggleProjectKey={toggleProjectKey}
          togglePriority={togglePriority}
          selectAllIssueTypes={selectAllIssueTypes}
          deselectAllIssueTypes={deselectAllIssueTypes}
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
          {/* Navigation breadcrumb when viewing specific project */}
          {preselectedProjectKey && (
            <div className="mb-6">
              <Link 
                href={paths.projects}
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Projects
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 mt-2">
                {preselectedProjectKey} - Project Analysis
              </h1>
            </div>
          )}
          {!preselectedProjectKey && (
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">JIRA Issue Report</h1>
              <p className="text-gray-600">Analyze your JIRA issues with cycle time analysis and performance metrics</p>
            </div>
          )}


          {/* Loading State */}
          {(loading || !isHydrated) && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">{loading ? 'Processing JIRA data...' : 'Loading...'}</p>
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
          {processedStories.length > 0 && isHydrated && (
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
                  defectResolutionStats={defectResolutionStats}
                  onViewDefectIssues={handleViewDefectIssues}
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
                />
              )}
            </div>
          )}

          {processedStories.length === 0 && !loading && !error && isHydrated && (
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