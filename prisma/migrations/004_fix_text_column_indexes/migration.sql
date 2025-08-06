-- Fix indexes for large text columns in status_changes table

-- Drop the problematic composite index that includes the TEXT column
DROP INDEX IF EXISTS "status_changes_field_name_to_value_idx";

-- Create a more efficient index using a prefix of to_value for workflow lookups
-- This index supports queries like: WHERE field_name = 'status' AND to_value = 'Done'
-- but limits the indexed portion of to_value to first 100 characters
CREATE INDEX "idx_status_changes_workflow_lookup" 
ON "status_changes" ("field_name", LEFT("to_value", 100));