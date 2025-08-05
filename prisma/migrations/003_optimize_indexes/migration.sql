-- Optimization indexes for common query patterns
-- Note: Using regular CREATE INDEX instead of CONCURRENTLY for migration compatibility

-- Index for project filtering and sorting
CREATE INDEX IF NOT EXISTS idx_projects_key_updated_at ON projects(key, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_name_updated_at ON projects(name, updated_at DESC);

-- Indexes for issue filtering and metrics queries
CREATE INDEX IF NOT EXISTS idx_issues_project_created ON issues(project_id, created DESC);
CREATE INDEX IF NOT EXISTS idx_issues_project_resolved ON issues(project_id, resolved DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_issues_project_type ON issues(project_id, issue_type);
CREATE INDEX IF NOT EXISTS idx_issues_project_priority ON issues(project_id, priority);
CREATE INDEX IF NOT EXISTS idx_issues_parent_key ON issues(parent_key) WHERE parent_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_issues_key_lookup ON issues(key);

-- Composite indexes for complex filtering
CREATE INDEX IF NOT EXISTS idx_issues_project_type_priority ON issues(project_id, issue_type, priority);
CREATE INDEX IF NOT EXISTS idx_issues_created_resolved_project ON issues(created, resolved, project_id);
CREATE INDEX IF NOT EXISTS idx_issues_story_points_project ON issues(story_points, project_id) WHERE story_points IS NOT NULL;

-- Indexes for status changes (workflow analysis)
CREATE INDEX IF NOT EXISTS idx_status_changes_issue_changed ON status_changes(issue_id, changed ASC);
CREATE INDEX IF NOT EXISTS idx_status_changes_field_changed ON status_changes(field_name, changed);
CREATE INDEX IF NOT EXISTS idx_status_changes_value_transitions ON status_changes(from_value, to_value, changed);

-- Indexes for sprint relationships
CREATE INDEX IF NOT EXISTS idx_sprints_project_start_date ON sprints(project_id, start_date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_sprints_project_name ON sprints(project_id, name);
CREATE INDEX IF NOT EXISTS idx_issues_sprints_sprint_issue ON issues_sprints(sprint_id, issue_id);
CREATE INDEX IF NOT EXISTS idx_issues_sprints_issue_sprint ON issues_sprints(issue_id, sprint_id);

-- Indexes for workflow mappings
CREATE INDEX IF NOT EXISTS idx_workflow_mappings_project_status ON workflow_mappings(project_id, jira_status_name);
CREATE INDEX IF NOT EXISTS idx_workflow_mappings_canonical ON workflow_mappings(canonical_stage, project_id);

-- Partial indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_issues_resolved_not_null ON issues(project_id, resolved) WHERE resolved IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_issues_unresolved ON issues(project_id, created) WHERE resolved IS NULL;

-- Text search indexes for summary and key searches
CREATE INDEX IF NOT EXISTS idx_issues_summary_text ON issues USING gin(to_tsvector('english', summary));
CREATE INDEX IF NOT EXISTS idx_issues_key_text ON issues USING gin(to_tsvector('english', key));

-- Indexes for issue metrics view (on underlying tables to speed up view queries)
CREATE INDEX IF NOT EXISTS idx_issues_resolved_created_metrics ON issues(resolved, created, project_id) WHERE resolved IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_status_changes_metrics_workflow ON status_changes(issue_id, field_name, changed) WHERE field_name = 'status';

-- Statistics for query planner optimization
-- Update table statistics to help PostgreSQL choose better query plans
ANALYZE projects;
ANALYZE issues;
ANALYZE status_changes;
ANALYZE sprints;
ANALYZE issues_sprints;
ANALYZE workflow_mappings;

-- Add comments for documentation
COMMENT ON INDEX idx_projects_key_updated_at IS 'Optimizes project lookups by key and sorting by update time';
COMMENT ON INDEX idx_issues_project_created IS 'Optimizes issue listing by project with creation date sorting';
COMMENT ON INDEX idx_issues_project_resolved IS 'Optimizes resolved issue queries by project';
COMMENT ON INDEX idx_status_changes_issue_changed IS 'Optimizes status change timeline queries';
COMMENT ON INDEX idx_issues_summary_text IS 'Enables full-text search on issue summaries';
COMMENT ON INDEX idx_issues_key_text IS 'Enables full-text search on issue keys';