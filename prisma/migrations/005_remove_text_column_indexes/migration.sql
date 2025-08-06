-- Remove all indexes that include TEXT columns (from_value, to_value) to prevent size errors

-- Drop indexes that include TEXT columns
DROP INDEX IF EXISTS "idx_status_changes_value_transitions";

-- Note: We keep the workflow lookup index we created in previous migration
-- CREATE INDEX "idx_status_changes_workflow_lookup" ON "status_changes" ("field_name", LEFT("to_value", 100));
-- This index already exists from migration 004