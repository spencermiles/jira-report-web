-- Add indexes to optimize expensive view queries

-- Optimize status_changes queries (used heavily in issue_metrics view)
CREATE INDEX IF NOT EXISTS idx_status_changes_issue_id_field_name ON status_changes(issue_id, field_name);
CREATE INDEX IF NOT EXISTS idx_status_changes_field_name_issue_id ON status_changes(field_name, issue_id);
CREATE INDEX IF NOT EXISTS idx_status_changes_from_value ON status_changes(from_value);
CREATE INDEX IF NOT EXISTS idx_status_changes_to_value ON status_changes(to_value);

-- Optimize workflow_mappings queries (used in joins)
CREATE INDEX IF NOT EXISTS idx_workflow_mappings_project_status ON workflow_mappings(project_id, jira_status_name);

-- Optimize issues queries
CREATE INDEX IF NOT EXISTS idx_issues_project_resolved ON issues(project_id, resolved);
CREATE INDEX IF NOT EXISTS idx_issues_resolved_created ON issues(resolved, created) WHERE resolved IS NOT NULL;

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_issues_project_type_priority ON issues(project_id, issue_type, priority);
CREATE INDEX IF NOT EXISTS idx_issues_created_resolved ON issues(created, resolved);