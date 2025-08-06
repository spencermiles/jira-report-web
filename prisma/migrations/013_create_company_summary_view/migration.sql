-- Create company_summary view to consolidate company-level metrics calculations
-- This replaces the duplicate SQL logic scattered across GraphQL resolvers

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
  -- Basic counts
  COUNT(DISTINCT p.id) as total_projects,
  SUM(COALESCE(ps.total_issues, 0)) as total_issues,
  SUM(COALESCE(ps.resolved_issues, 0)) as total_resolved_issues,
  -- Median-based calculations for consistency with project_summary view
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
                     PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY im.lead_time)) * 100 AS NUMERIC), 1)
    ELSE NULL 
  END as flow_efficiency,
  -- First time through calculation (issues with no churn)
  CASE
    WHEN SUM(COALESCE(ps.resolved_issues, 0)) > 0
    THEN ROUND(CAST(
      (COUNT(CASE WHEN im.review_churn = 0 AND im.qa_churn = 0 AND i.resolved IS NOT NULL THEN 1 END)::FLOAT / 
       SUM(COALESCE(ps.resolved_issues, 0))::FLOAT * 100) AS NUMERIC), 1)
    ELSE NULL
  END as first_time_through,
  -- Average story points for resolved issues
  ROUND(AVG(CASE WHEN i.resolved IS NOT NULL THEN i.story_points END), 1) as avg_story_points
FROM companies c
LEFT JOIN projects p ON c.id = p.company_id
LEFT JOIN project_summary ps ON p.id = ps.id  
LEFT JOIN issues i ON p.id = i.project_id
LEFT JOIN issue_metrics im ON i.id = im.id AND i.resolved IS NOT NULL
WHERE c.is_active = true
GROUP BY c.id, c.name, c.slug, c.description, c.logo_url, c.website, c.is_active, c.created_at, c.updated_at;