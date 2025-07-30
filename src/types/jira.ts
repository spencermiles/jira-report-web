// JIRA-specific type definitions

export interface JiraChangelog {
  field_name: string;
  from_string?: string;
  to_string?: string;
  created: string;
}

export interface JiraSprint {
  name: string;
  start_date?: string;
  end_date?: string;
}

export interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  issue_type: string;
  created: string;
  resolved?: string;
  story_points?: number;
  parent_key?: string;
  web_url?: string;
  changelogs: JiraChangelog[];
  sprint_info?: JiraSprint[];
}

export interface StoryMetrics {
  leadTime: number | null;
  cycleTime: number | null;
  groomingCycleTime: number | null;
  devCycleTime: number | null;
  qaCycleTime: number | null;
  blockers: number;
  reviewChurn: number;
  qaChurn: number;
  timestamps: {
    opened: Date | null;
    readyForDev: Date | null;
    readyForGrooming: Date | null;
    inProgress: Date | null;
    inReview: Date | null;
    inQA: Date | null;
    done: Date | null;
    readyForRelease: Date | null;
  };
}

export interface ProcessedStory {
  id: string;
  key: string;
  summary: string;
  issue_type: string;
  sprint: string;
  created: string;
  resolved?: string;
  story_points?: number;
  subIssueCount: number;
  web_url?: string;
  metrics: StoryMetrics;
}

export interface StatsResult {
  median: number;
  mean: number;
  min: number;
  max: number;
  stdDev: number;
  count: number;
}

export type TooltipType = 'leadTime' | 'cycleTime' | 'grooming' | 'dev' | 'qa' | null; 