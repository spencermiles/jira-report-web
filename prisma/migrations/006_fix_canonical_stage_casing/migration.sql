-- Fix canonical stage casing to match database view expectations
-- The issue_metrics view expects uppercase canonical stages like 'IN_PROGRESS', 'DONE'
-- but our data has lowercase values like 'in_progress', 'done'

UPDATE workflow_mappings 
SET canonical_stage = CASE 
  WHEN canonical_stage = 'backlog' THEN 'BACKLOG'
  WHEN canonical_stage = 'in_progress' THEN 'IN_PROGRESS' 
  WHEN canonical_stage = 'review' THEN 'IN_REVIEW'
  WHEN canonical_stage = 'done' THEN 'DONE'
  WHEN canonical_stage = 'blocked' THEN 'BLOCKED'
  WHEN canonical_stage = 'ready_for_grooming' THEN 'READY_FOR_GROOMING'
  WHEN canonical_stage = 'ready_for_dev' THEN 'READY_FOR_DEV'
  WHEN canonical_stage = 'in_review' THEN 'IN_REVIEW'
  WHEN canonical_stage = 'in_qa' THEN 'IN_QA'
  WHEN canonical_stage = 'ready_for_release' THEN 'READY_FOR_RELEASE'
  ELSE canonical_stage -- Keep any other values as-is
END
WHERE canonical_stage IN ('backlog', 'in_progress', 'review', 'done', 'blocked', 'ready_for_grooming', 'ready_for_dev', 'in_review', 'in_qa', 'ready_for_release');