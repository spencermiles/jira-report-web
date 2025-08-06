-- Update project_summary view to include median cycle times for consistency

DROP VIEW IF EXISTS project_summary;

CREATE VIEW project_summary AS
SELECT 
  p.id,
  p.key,
  p.name,
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
GROUP BY p.id, p.key, p.name, p.created_at, p.updated_at;