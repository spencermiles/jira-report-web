-- Update database views to support multi-tenant architecture with company_id

-- First, drop existing views
DROP VIEW IF EXISTS project_summary;
DROP VIEW IF EXISTS issue_metrics;

-- Recreate issue_metrics view with company_id support
CREATE VIEW issue_metrics AS
WITH workflow_mapped_changes AS (
  SELECT 
    sc.*,
    wm_from.canonical_stage as from_canonical_stage,
    wm_to.canonical_stage as to_canonical_stage
  FROM status_changes sc
  JOIN issues i ON sc.issue_id = i.id
  LEFT JOIN workflow_mappings wm_from ON i.project_id = wm_from.project_id 
    AND sc.from_value = wm_from.jira_status_name
  LEFT JOIN workflow_mappings wm_to ON i.project_id = wm_to.project_id 
    AND sc.to_value = wm_to.jira_status_name
  WHERE sc.field_name = 'status'
),
stage_timestamps AS (
  SELECT 
    issue_id,
    MIN(CASE WHEN to_canonical_stage = 'READY_FOR_GROOMING' THEN changed END) as ready_for_grooming,
    MIN(CASE WHEN to_canonical_stage = 'READY_FOR_DEV' THEN changed END) as ready_for_dev,
    MIN(CASE WHEN to_canonical_stage = 'IN_PROGRESS' THEN changed END) as in_progress,
    MIN(CASE WHEN to_canonical_stage = 'IN_REVIEW' THEN changed END) as in_review,
    MIN(CASE WHEN to_canonical_stage = 'IN_QA' THEN changed END) as in_qa,
    MIN(CASE WHEN to_canonical_stage = 'READY_FOR_RELEASE' THEN changed END) as ready_for_release,
    MIN(CASE WHEN to_canonical_stage = 'DONE' THEN changed END) as done,
    COUNT(CASE WHEN to_canonical_stage = 'BLOCKED' THEN 1 END) as blockers,
    COUNT(CASE WHEN to_canonical_stage = 'IN_PROGRESS' AND from_canonical_stage = 'IN_REVIEW' THEN 1 END) as review_churn,
    COUNT(CASE WHEN to_canonical_stage = 'IN_PROGRESS' AND from_canonical_stage = 'IN_QA' THEN 1 END) as qa_churn
  FROM workflow_mapped_changes
  GROUP BY issue_id
)
SELECT 
  i.id,
  i.key,
  i.jira_id,
  i.summary,
  i.issue_type,
  i.priority,
  i.project_id,
  i.company_id,  -- Add company_id field
  i.story_points,
  i.created,
  i.resolved,
  -- Calculate cycle times in days, rounded to 1 decimal place
  CASE 
    WHEN i.resolved IS NOT NULL AND st.in_progress IS NOT NULL 
    THEN ROUND(CAST(EXTRACT(EPOCH FROM (COALESCE(i.resolved, st.done) - st.in_progress)) / 86400.0 AS NUMERIC), 1)
  END as cycle_time,
  CASE 
    WHEN i.resolved IS NOT NULL 
    THEN ROUND(CAST(EXTRACT(EPOCH FROM (i.resolved - i.created)) / 86400.0 AS NUMERIC), 1)
  END as lead_time,
  CASE 
    WHEN st.ready_for_dev IS NOT NULL AND st.ready_for_grooming IS NOT NULL
    THEN ROUND(CAST(EXTRACT(EPOCH FROM (st.ready_for_dev - st.ready_for_grooming)) / 86400.0 AS NUMERIC), 1)
  END as grooming_cycle_time,
  CASE 
    WHEN st.in_review IS NOT NULL AND st.in_progress IS NOT NULL
    THEN ROUND(CAST(EXTRACT(EPOCH FROM (st.in_review - st.in_progress)) / 86400.0 AS NUMERIC), 1)
  END as dev_cycle_time,
  CASE 
    WHEN st.done IS NOT NULL AND st.in_qa IS NOT NULL
    THEN ROUND(CAST(EXTRACT(EPOCH FROM (st.done - st.in_qa)) / 86400.0 AS NUMERIC), 1)
  END as qa_cycle_time,
  COALESCE(st.blockers, 0) as blockers,
  COALESCE(st.review_churn, 0) as review_churn,
  COALESCE(st.qa_churn, 0) as qa_churn,
  -- Stage timestamps as JSON for easy access
  jsonb_build_object(
    'opened', i.created,
    'readyForGrooming', st.ready_for_grooming,
    'readyForDev', st.ready_for_dev,
    'inProgress', st.in_progress,
    'inReview', st.in_review,
    'inQA', st.in_qa,
    'done', COALESCE(st.done, i.resolved),
    'readyForRelease', st.ready_for_release
  ) as stage_timestamps
FROM issues i
LEFT JOIN stage_timestamps st ON i.id = st.issue_id;

-- Recreate project_summary view with company_id support and latest median calculations
CREATE VIEW project_summary AS
SELECT 
  p.id,
  p.key,
  p.name,
  p.company_id,  -- Add company_id field
  p.created_at,
  p.updated_at,
  COUNT(i.id) as total_issues,
  COUNT(CASE WHEN i.resolved IS NOT NULL THEN 1 END) as resolved_issues,
  -- Keep existing mean calculations for compatibility
  ROUND(CAST(AVG(CASE WHEN i.resolved IS NOT NULL THEN im.lead_time END) AS NUMERIC), 1) as avg_lead_time,
  ROUND(CAST(AVG(CASE WHEN i.resolved IS NOT NULL THEN im.cycle_time END) AS NUMERIC), 1) as avg_cycle_time,
  -- Add median calculations for consistency with individual project screen
  ROUND(CAST(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY CASE WHEN i.resolved IS NOT NULL THEN im.lead_time END) AS NUMERIC), 1) as median_lead_time,
  ROUND(CAST(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY CASE WHEN i.resolved IS NOT NULL THEN im.cycle_time END) AS NUMERIC), 1) as median_cycle_time,
  -- Flow efficiency calculation
  CASE 
    WHEN AVG(CASE WHEN i.resolved IS NOT NULL THEN im.lead_time END) > 0 
    THEN ROUND(
      CAST((AVG(CASE WHEN i.resolved IS NOT NULL THEN 
        COALESCE(im.grooming_cycle_time, 0) + 
        COALESCE(im.dev_cycle_time, 0) + 
        COALESCE(im.qa_cycle_time, 0) 
      END) / AVG(CASE WHEN i.resolved IS NOT NULL THEN im.lead_time END)) * 100 AS NUMERIC), 1
    )
    ELSE 0 
  END as flow_efficiency,
  -- First time through percentage
  CASE 
    WHEN COUNT(CASE WHEN i.resolved IS NOT NULL THEN 1 END) > 0
    THEN ROUND(
      CAST((COUNT(CASE WHEN i.resolved IS NOT NULL AND im.review_churn = 0 AND im.qa_churn = 0 THEN 1 END)::FLOAT / 
       COUNT(CASE WHEN i.resolved IS NOT NULL THEN 1 END)::FLOAT) * 100 AS NUMERIC), 1
    )
    ELSE 0
  END as first_time_through
FROM projects p
LEFT JOIN issues i ON p.id = i.project_id
LEFT JOIN issue_metrics im ON i.id = im.id
GROUP BY p.id, p.key, p.name, p.company_id, p.created_at, p.updated_at;

-- Create indexes to optimize queries by company_id
CREATE INDEX IF NOT EXISTS idx_issue_metrics_company_id ON issues(company_id);
CREATE INDEX IF NOT EXISTS idx_project_summary_company_id ON projects(company_id);