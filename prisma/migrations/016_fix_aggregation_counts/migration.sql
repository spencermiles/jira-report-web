-- Fix all aggregation functions and views to correctly count issues without multiplication
-- Problem: When joining projects -> project_summary -> issues, each issue row causes the 
-- project_summary totals to be counted multiple times

-- 1. First, fix the get_company_aggregated_metrics function
DROP FUNCTION IF EXISTS get_company_aggregated_metrics;

CREATE OR REPLACE FUNCTION get_company_aggregated_metrics(
  company_id_param TEXT,
  project_keys_filter TEXT[] DEFAULT NULL,
  issue_types_filter TEXT[] DEFAULT NULL,
  priorities_filter TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  total_projects BIGINT,
  total_issues BIGINT,
  total_resolved_issues BIGINT,
  overall_median_lead_time NUMERIC,
  overall_median_cycle_time NUMERIC,
  overall_flow_efficiency NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH project_counts AS (
    -- Get accurate counts from project_summary without multiplication
    SELECT 
      COUNT(DISTINCT p.id)::BIGINT as total_projects,
      COALESCE(SUM(ps.total_issues), 0)::BIGINT as total_issues,
      COALESCE(SUM(ps.resolved_issues), 0)::BIGINT as total_resolved_issues
    FROM projects p
    LEFT JOIN project_summary ps ON p.id = ps.id
    WHERE p.company_id = company_id_param
      AND (project_keys_filter IS NULL OR p.key = ANY(project_keys_filter))
  ),
  issue_metrics_agg AS (
    -- Calculate metrics from actual issues
    SELECT 
      CASE 
        WHEN COUNT(CASE WHEN im.lead_time IS NOT NULL THEN 1 END) > 0 
        THEN ROUND(CAST(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY im.lead_time) AS NUMERIC), 1)
        ELSE NULL 
      END as overall_median_lead_time,
      CASE 
        WHEN COUNT(CASE WHEN im.cycle_time IS NOT NULL THEN 1 END) > 0 
        THEN ROUND(CAST(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY im.cycle_time) AS NUMERIC), 1)
        ELSE NULL 
      END as overall_median_cycle_time,
      CASE 
        WHEN PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY im.lead_time) > 0 
             AND PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY im.cycle_time) IS NOT NULL
        THEN ROUND(CAST((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY im.cycle_time) / 
                         PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY im.lead_time)) * 100 AS NUMERIC), 1)
        ELSE NULL 
      END as overall_flow_efficiency
    FROM issues i
    INNER JOIN issue_metrics im ON i.id = im.id AND i.resolved IS NOT NULL
    INNER JOIN projects p ON i.project_id = p.id
    WHERE p.company_id = company_id_param
      AND (project_keys_filter IS NULL OR p.key = ANY(project_keys_filter))
      AND (issue_types_filter IS NULL OR i.issue_type = ANY(issue_types_filter))
      AND (priorities_filter IS NULL OR i.priority = ANY(priorities_filter))
  )
  SELECT 
    pc.total_projects,
    pc.total_issues,
    pc.total_resolved_issues,
    ima.overall_median_lead_time,
    ima.overall_median_cycle_time,
    ima.overall_flow_efficiency
  FROM project_counts pc
  CROSS JOIN issue_metrics_agg ima;
END;
$$;

-- 2. Recreate project_summary view to ensure it's correct
-- (This view should already be correct, but let's ensure it is)
DROP VIEW IF EXISTS project_summary CASCADE;

CREATE VIEW project_summary AS
SELECT 
  p.id,
  p.key,
  p.name,
  p.company_id,
  p.created_at,
  p.updated_at,
  COUNT(DISTINCT i.id) as total_issues,
  COUNT(DISTINCT CASE WHEN i.resolved IS NOT NULL THEN i.id END) as resolved_issues,
  -- Average-based calculations
  ROUND(AVG(im.lead_time), 1) as avg_lead_time,
  ROUND(AVG(im.cycle_time), 1) as avg_cycle_time,
  -- Median-based calculations for consistency
  CASE 
    WHEN COUNT(CASE WHEN im.lead_time IS NOT NULL THEN 1 END) > 0 
    THEN ROUND(CAST(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY im.lead_time) AS NUMERIC), 1)
    ELSE NULL 
  END as median_lead_time,
  CASE 
    WHEN COUNT(CASE WHEN im.cycle_time IS NOT NULL THEN 1 END) > 0 
    THEN ROUND(CAST(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY im.cycle_time) AS NUMERIC), 1)
    ELSE NULL 
  END as median_cycle_time,
  -- Flow efficiency using medians
  CASE 
    WHEN PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY im.lead_time) > 0 
         AND PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY im.cycle_time) IS NOT NULL
    THEN ROUND(CAST((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY im.cycle_time) / 
                     PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY im.lead_time)) * 100 AS NUMERIC), 1)
    ELSE NULL 
  END as flow_efficiency,
  -- First time through (no churn)
  CASE
    WHEN COUNT(CASE WHEN i.resolved IS NOT NULL THEN 1 END) > 0
    THEN ROUND(CAST(
      (COUNT(CASE WHEN im.review_churn = 0 AND im.qa_churn = 0 AND i.resolved IS NOT NULL THEN 1 END)::FLOAT / 
       COUNT(CASE WHEN i.resolved IS NOT NULL THEN 1 END)::FLOAT * 100) AS NUMERIC), 1)
    ELSE NULL
  END as first_time_through
FROM projects p
LEFT JOIN issues i ON p.id = i.project_id
LEFT JOIN issue_metrics im ON i.id = im.id AND i.resolved IS NOT NULL
GROUP BY p.id, p.key, p.name, p.company_id, p.created_at, p.updated_at;

-- 3. Recreate company_summary view with the fix already applied
-- (We already fixed this in migration 015, but let's ensure it's correct)
DROP VIEW IF EXISTS company_summary;

CREATE VIEW company_summary AS
SELECT 
  c.id,
  c.name,
  c.slug,
  c.description,
  c.logo_url,
  c.website,
  c.is_active,
  c.created_at,
  c.updated_at,
  -- Basic counts from subquery to avoid multiplication
  COALESCE(project_stats.total_projects, 0) as total_projects,
  COALESCE(project_stats.total_issues, 0) as total_issues,
  COALESCE(project_stats.total_resolved_issues, 0) as total_resolved_issues,
  -- Median-based calculations for all issues in company
  CASE 
    WHEN COUNT(CASE WHEN im.lead_time IS NOT NULL THEN 1 END) > 0 
    THEN ROUND(CAST(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY im.lead_time) AS NUMERIC), 1)
    ELSE NULL 
  END as median_lead_time,
  CASE 
    WHEN COUNT(CASE WHEN im.cycle_time IS NOT NULL THEN 1 END) > 0 
    THEN ROUND(CAST(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY im.cycle_time) AS NUMERIC), 1)
    ELSE NULL 
  END as median_cycle_time,
  -- Flow efficiency calculated from medians
  CASE 
    WHEN PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY im.lead_time) > 0 
         AND PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY im.cycle_time) IS NOT NULL
    THEN ROUND(CAST((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY im.cycle_time) / 
                     PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY im.lead_time)) AS NUMERIC), 1)
    ELSE NULL 
  END as flow_efficiency,
  -- First time through calculation (issues with no churn)
  CASE
    WHEN COUNT(CASE WHEN i.resolved IS NOT NULL THEN 1 END) > 0
    THEN ROUND(CAST(
      (COUNT(CASE WHEN im.review_churn = 0 AND im.qa_churn = 0 AND i.resolved IS NOT NULL THEN 1 END)::FLOAT / 
       COUNT(CASE WHEN i.resolved IS NOT NULL THEN 1 END)::FLOAT * 100) AS NUMERIC), 1)
    ELSE NULL
  END as first_time_through,
  -- Average story points for resolved issues
  ROUND(AVG(CASE WHEN i.resolved IS NOT NULL THEN i.story_points END), 1) as avg_story_points
FROM companies c
-- Subquery to get project and issue counts without multiplication
LEFT JOIN LATERAL (
  SELECT 
    COUNT(DISTINCT p.id) as total_projects,
    COUNT(DISTINCT i.id) as total_issues,
    COUNT(DISTINCT CASE WHEN i.resolved IS NOT NULL THEN i.id END) as total_resolved_issues
  FROM projects p
  LEFT JOIN issues i ON p.id = i.project_id
  WHERE p.company_id = c.id
) project_stats ON true
-- Join issues for metrics calculations
LEFT JOIN issues i ON i.company_id = c.id
LEFT JOIN issue_metrics im ON i.id = im.id AND i.resolved IS NOT NULL
WHERE c.is_active = true
GROUP BY c.id, c.name, c.slug, c.description, c.logo_url, c.website, c.is_active, 
         c.created_at, c.updated_at, project_stats.total_projects, 
         project_stats.total_issues, project_stats.total_resolved_issues;