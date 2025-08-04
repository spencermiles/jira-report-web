import React from 'react';
import { ProcessedStory, StatsResult, DefectResolutionStats } from '@/types/jira';
import { calculateStats } from '../utils/calculations';
import StatCard from '../ui/StatCard';
import CorrelationCard from '../ui/CorrelationCard';
import FlowMetricCard from '../ui/FlowMetricCard';
import CycleTimeCard from '../ui/CycleTimeCard';
import DefectResolutionCard from '../ui/DefectResolutionCard';

interface MetricsTabProps {
  filteredStories: ProcessedStory[];
  storyPointsCorrelation: { correlation: number; count: number };
  qaChurnCorrelation: { correlation: number; count: number };
  flowEfficiency: { efficiency: number; activeTime: number; waitTime: number; count: number };
  firstTimeThrough: { percentage: number; firstTimeCount: number; totalStories: number };
  stageSkips: { groomingSkipPercentage: number; reviewSkipPercentage: number; skippedGrooming: number; skippedReview: number; totalStories: number };
  blockedTimeAnalysis: { blockedTimeRatio: number; avgBlockedTime: number; storiesBlocked: number; totalStories: number };
  stageVariability: Array<{ stage: string; stats: StatsResult; coefficient: number }>;
  defectResolutionStats: DefectResolutionStats[];
  onViewDefectIssues?: (priority: string) => void;
}

const MetricsTab: React.FC<MetricsTabProps> = ({
  filteredStories,
  storyPointsCorrelation,
  qaChurnCorrelation,
  flowEfficiency,
  firstTimeThrough,
  stageSkips,
  blockedTimeAnalysis,
  stageVariability,
  defectResolutionStats,
  onViewDefectIssues
}) => {
  // Calculate cycle time statistics
  const leadTimes = filteredStories
    .filter(story => story.resolved && story.metrics.leadTime)
    .map(story => story.metrics.leadTime!);
    
  const cycleTimes = filteredStories
    .filter(story => story.resolved && story.metrics.cycleTime)
    .map(story => story.metrics.cycleTime!);
    
  const groomingTimes = filteredStories
    .filter(story => story.resolved && story.metrics.groomingCycleTime)
    .map(story => story.metrics.groomingCycleTime!);
    
  const devTimes = filteredStories
    .filter(story => story.resolved && story.metrics.devCycleTime)
    .map(story => story.metrics.devCycleTime!);
    
  const qaTimes = filteredStories
    .filter(story => story.resolved && story.metrics.qaCycleTime)
    .map(story => story.metrics.qaCycleTime!);

  const leadTimeStats = calculateStats(leadTimes);
  const cycleTimeStats = calculateStats(cycleTimes);
  const groomingTimeStats = calculateStats(groomingTimes);
  const devTimeStats = calculateStats(devTimes);
  const qaTimeStats = calculateStats(qaTimes);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Metrics Dashboard</h2>
        <p className="text-gray-600">Key performance indicators and cycle time analysis</p>
      </div>

      {/* Cycle Time Metrics */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Cycle Time Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CycleTimeCard
            value={cycleTimeStats.median}
            details={[
              { label: "Median", value: `${cycleTimeStats.median} days` },
              { label: "Mean", value: `${cycleTimeStats.mean} days` },
              { label: "Min", value: `${cycleTimeStats.min} days` },
              { label: "Max", value: `${cycleTimeStats.max} days` },
              { label: "Count", value: cycleTimeStats.count }
            ]}
          />
          <StatCard
            title="Lead Time"
            stats={leadTimeStats}
            unit=" days"
          />
          <StatCard
            title="Grooming Time"
            stats={groomingTimeStats}
            unit=" days"
          />
          <StatCard
            title="Development Time"
            stats={devTimeStats}
            unit=" days"
          />
          <StatCard
            title="QA Time"
            stats={qaTimeStats}
            unit=" days"
          />
        </div>
      </div>

      {/* Flow Metrics */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Flow Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FlowMetricCard
            title="Flow Efficiency"
            value={flowEfficiency.efficiency}
            unit="%"
            description="Percentage of lead time spent actively working vs waiting"
            color="text-green-600"
            details={[
              { label: "Active Time", value: `${flowEfficiency.activeTime} days` },
              { label: "Wait Time", value: `${flowEfficiency.waitTime} days` },
              { label: "Stories", value: flowEfficiency.count }
            ]}
            helpContent={{
              title: "Flow Efficiency",
              description: "The ratio of active work time to total lead time, expressed as a percentage.",
              calculation: "Flow Efficiency = (Active Time / Lead Time) × 100",
              interpretation: "Higher percentages indicate less waiting time and more efficient flow. Industry average is typically 15-25%."
            }}
          />
          
          <FlowMetricCard
            title="First Time Through"
            value={firstTimeThrough.percentage}
            unit="%"
            description="Stories completed without rework (no review or QA churn)"
            color="text-blue-600"
            details={[
              { label: "First Time", value: firstTimeThrough.firstTimeCount },
              { label: "Total Stories", value: firstTimeThrough.totalStories }
            ]}
            helpContent={{
              title: "First Time Through Rate",
              description: "The percentage of stories that are completed without requiring rework in review or QA.",
              calculation: "First Time Through = (Stories with 0 review churn AND 0 QA churn) / Total Stories × 100",
              interpretation: "Higher percentages indicate better quality and less rework. Target 70%+ for mature teams."
            }}
          />
          
          <FlowMetricCard
            title="Blocked Time Impact"
            value={blockedTimeAnalysis.blockedTimeRatio}
            unit="%"
            description="Estimated impact of blocked time on lead time"
            color="text-red-600"
            details={[
              { label: "Avg Blocked Time", value: `${blockedTimeAnalysis.avgBlockedTime} days` },
              { label: "Stories Blocked", value: blockedTimeAnalysis.storiesBlocked },
              { label: "Total Stories", value: blockedTimeAnalysis.totalStories }
            ]}
            helpContent={{
              title: "Blocked Time Analysis",
              description: "Estimates the impact of blocked time on overall lead time by comparing blocked vs unblocked stories.",
              calculation: "Blocked Impact = (Avg Lead Time Blocked - Avg Lead Time Unblocked) / Avg Lead Time Blocked × 100",
              interpretation: "Lower percentages are better. High values indicate blocking is significantly impacting delivery time."
            }}
          />
          
          <FlowMetricCard
            title="Stage Skips"
            value={`${stageSkips.groomingSkipPercentage}% / ${stageSkips.reviewSkipPercentage}%`}
            description="Grooming skips / Review skips"
            color="text-yellow-600"
            details={[
              { label: "Grooming Skipped", value: stageSkips.skippedGrooming },
              { label: "Review Skipped", value: stageSkips.skippedReview },
              { label: "Total Stories", value: stageSkips.totalStories }
            ]}
            helpContent={{
              title: "Stage Skip Analysis",
              description: "The percentage of stories that skip key process stages like grooming or code review.",
              calculation: "Stage Skip % = (Stories skipping stage / Total Stories) × 100",
              interpretation: "Some skipping may be acceptable for small changes, but high percentages may indicate process issues."
            }}
          />
        </div>
      </div>

      {/* Correlation Analysis */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Correlation Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CorrelationCard
            title="Story Points vs Dev Time"
            correlation={storyPointsCorrelation.correlation}
            count={storyPointsCorrelation.count}
            description="story points and development cycle time"
            helpContent={{
              title: "Story Points vs Development Time Correlation",
              description: "Measures how well story points predict development cycle time.",
              calculation: "Pearson correlation coefficient between story point estimates and actual development days.",
              interpretation: "Higher correlation (closer to 1.0) indicates story points are good predictors of development time. Values above 0.5 suggest reasonable estimation accuracy."
            }}
          />
          
          <CorrelationCard
            title="QA Churn vs QA Time"
            correlation={qaChurnCorrelation.correlation}
            count={qaChurnCorrelation.count}
            description="QA churn and QA cycle time"
            helpContent={{
              title: "QA Churn vs QA Time Correlation",
              description: "Measures the relationship between the number of times a story returns to QA and the total time spent in QA.",
              calculation: "Pearson correlation coefficient between QA churn count and QA cycle time in days.",
              interpretation: "Positive correlation indicates that stories requiring more QA rounds take longer to complete. This helps identify quality issues."
            }}
          />
        </div>
      </div>

      {/* Stage Variability */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Stage Variability</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stageVariability.map((stage) => (
            <FlowMetricCard
              key={stage.stage}
              title={`${stage.stage} Variability`}
              value={stage.coefficient}
              unit="%"
              description={`Coefficient of variation for ${stage.stage.toLowerCase()} cycle time`}
              color="text-purple-600"
              details={[
                { label: "Mean", value: `${stage.stats.mean} days` },
                { label: "Std Dev", value: `${stage.stats.stdDev} days` },
                { label: "Count", value: stage.stats.count }
              ]}
              helpContent={{
                title: `${stage.stage} Stage Variability`,
                description: "Measures how consistent cycle times are within this stage using coefficient of variation.",
                calculation: "Coefficient of Variation = (Standard Deviation / Mean) × 100",
                interpretation: "Lower percentages indicate more predictable cycle times. Values above 50% suggest high variability and potential process issues."
              }}
            />
          ))}
        </div>
      </div>

      {/* Defect Resolution Time */}
      {defectResolutionStats.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Defect Resolution Time</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {defectResolutionStats.map((defectStat) => (
              <DefectResolutionCard
                key={defectStat.priority}
                defectStats={defectStat}
                onViewIssues={onViewDefectIssues}
              />
            ))}
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Total Stories Analyzed</h4>
            <div className="text-2xl font-bold text-blue-600">{filteredStories.length}</div>
          </div>
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Resolved Stories</h4>
            <div className="text-2xl font-bold text-green-600">
              {filteredStories.filter(s => s.resolved).length}
            </div>
          </div>
          <div className="bg-white rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">In Progress</h4>
            <div className="text-2xl font-bold text-yellow-600">
              {filteredStories.filter(s => !s.resolved).length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsTab;