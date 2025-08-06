-- Create a function to get company metrics with optional filtering
-- This replaces the duplicate aggregation logic in projectSummaries resolver

CREATE OR REPLACE FUNCTION get_company_aggregated_metrics(
  company_id_param TEXT,
  project_keys_filter TEXT[] DEFAULT NULL,
  issue_types_filter TEXT[] DEFAULT NULL,
  priorities_filter TEXT[] DEFAULT NULL
) RETURNS TABLE (
  total_projects BIGINT,
  total_issues BIGINT,
  total_resolved_issues BIGINT,
  overall_median_lead_time NUMERIC,
  overall_median_cycle_time NUMERIC,
  overall_flow_efficiency NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT p.id)::BIGINT as total_projects,
    SUM(COALESCE(ps.total_issues, 0))::BIGINT as total_issues,
    SUM(COALESCE(ps.resolved_issues, 0))::BIGINT as total_resolved_issues,
    -- Use medians for consistency with individual project displays
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
    -- Flow efficiency calculated using medians
    CASE 
      WHEN PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY im.lead_time) > 0 
           AND PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY im.cycle_time) IS NOT NULL
      THEN ROUND(CAST((PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY im.cycle_time) / 
                       PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY im.lead_time)) * 100 AS NUMERIC), 1)
      ELSE NULL 
    END as overall_flow_efficiency
  FROM projects p
  LEFT JOIN project_summary ps ON p.id = ps.id
  LEFT JOIN issues i ON p.id = i.project_id 
  LEFT JOIN issue_metrics im ON i.id = im.id AND i.resolved IS NOT NULL
  WHERE p.company_id = company_id_param
    AND (project_keys_filter IS NULL OR p.key = ANY(project_keys_filter))
    AND (issue_types_filter IS NULL OR i.issue_type = ANY(issue_types_filter))  
    AND (priorities_filter IS NULL OR i.priority = ANY(priorities_filter));
END;
$$ LANGUAGE plpgsql;