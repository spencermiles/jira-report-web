-- Fix company_summary view to correctly count issues
-- The previous version was multiplying project counts by the number of issues due to incorrect join

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