'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, Upload, FileText } from 'lucide-react';
import { useJiraDataContext } from '@/contexts/jira-data-context';
import { ProcessedStory, StatsResult } from '@/types/jira';
import { paths } from '@/lib/paths';
import { calculateStats } from '@/components/jira-report/utils/calculations';
import StatCard from '@/components/jira-report/ui/StatCard';
import CycleTimeCard from '@/components/jira-report/ui/CycleTimeCard';

interface ProjectSummary {
  projectKey: string;
  storyCount: number;
  cycleTimeStats: StatsResult;
  leadTimeStats: StatsResult;
  resolvedStories: number;
}

const Projects: React.FC = () => {
  const { processedStories, loading, error, handleFileUpload } = useJiraDataContext();



  const projectSummaries = useMemo(() => {
    if (processedStories.length === 0) return [];

    const projectGroups: Record<string, ProcessedStory[]> = {};
    
    // Group stories by project key
    processedStories.forEach(story => {
      if (!projectGroups[story.project_key]) {
        projectGroups[story.project_key] = [];
      }
      projectGroups[story.project_key].push(story);
    });

    // Calculate metrics for each project
    const summaries: ProjectSummary[] = Object.entries(projectGroups).map(([projectKey, stories]) => {
      // Filter separately for cycle time and lead time to align with MetricsTab.tsx
      const resolvedStoriesWithCycleTime = stories.filter(story => story.resolved && story.metrics.cycleTime);
      const resolvedStoriesWithLeadTime = stories.filter(story => story.resolved && story.metrics.leadTime);
      
      // Extract cycle times and lead times as arrays
      const cycleTimeValues = resolvedStoriesWithCycleTime
        .map(story => story.metrics.cycleTime)
        .filter((time): time is number => time !== null && time !== undefined);
      
      const leadTimeValues = resolvedStoriesWithLeadTime
        .map(story => story.metrics.leadTime)
        .filter((time): time is number => time !== null && time !== undefined);
      
      // Calculate full statistics
      const cycleTimeStats = calculateStats(cycleTimeValues);
      const leadTimeStats = calculateStats(leadTimeValues);

      // Count stories that are resolved and have at least some metrics (cycle time or lead time)
      const resolvedStoriesWithMetrics = stories.filter(story => 
        story.resolved && (story.metrics.cycleTime || story.metrics.leadTime)
      );

      return {
        projectKey,
        storyCount: stories.length,
        cycleTimeStats,
        leadTimeStats,
        resolvedStories: resolvedStoriesWithMetrics.length,
      };
    });

    // Sort by story count descending
    return summaries.sort((a, b) => b.storyCount - a.storyCount);
  }, [processedStories]);



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Processing JIRA data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (processedStories.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">JIRA Project Analytics</h1>
            <p className="text-lg text-gray-600">
              Upload your JIRA data to view project summaries and detailed analytics
            </p>
          </div>

          {/* Upload Section */}
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Get Started</h2>
            <p className="text-gray-600 mb-6">
              Upload your JIRA export file to analyze project metrics, cycle times, and team performance.
            </p>
            
            <label className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer transition-colors">
              <Upload className="h-5 w-5 mr-2" />
              Choose JIRA File
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            
            <p className="text-sm text-gray-500 mt-4">
              Supports JSON format exports from JIRA
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Project Overview</h1>
          <p className="text-gray-600">
            Summary of {projectSummaries.length} projects with {processedStories.length} total issues
          </p>
        </div>

        {/* Upload New Data */}
        <div className="mb-6">
          <label className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors">
            <Upload className="h-4 w-4 mr-2" />
            Upload New Data
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Projects Grid */}
        <div className="grid gap-6">
          {projectSummaries.map((project) => (
            <Link
              key={project.projectKey}
              href={paths.project(project.projectKey)}
              className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200 hover:border-gray-300"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 mr-3">
                      {project.projectKey}
                    </h2>
                    <span className="bg-gray-100 text-gray-700 text-sm px-2 py-1 rounded-full">
                      {project.storyCount} issues
                    </span>
                    {project.resolvedStories > 0 && (
                      <span className="bg-green-100 text-green-700 text-sm px-2 py-1 rounded-full ml-2">
                        {project.resolvedStories} resolved
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Cycle Time */}
                    <CycleTimeCard
                      value={project.cycleTimeStats.median}
                      details={[
                        { label: "Median", value: `${project.cycleTimeStats.median} days` },
                        { label: "Count", value: project.cycleTimeStats.count }
                      ]}
                    />

                    {/* Lead Time */}
                    <StatCard
                      title="Lead Time" 
                      stats={project.leadTimeStats}
                      unit=" days"
                    />
                  </div>
                </div>

                <div className="ml-6 flex items-center text-gray-400 hover:text-gray-600">
                  <ArrowRight className="h-6 w-6" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {projectSummaries.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No projects found in the uploaded data.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Projects;