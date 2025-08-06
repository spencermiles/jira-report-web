-- Drop the global unique constraint on jira_id
DROP INDEX IF EXISTS "Issue_jira_id_key";

-- Create a company-scoped unique constraint on jira_id
CREATE UNIQUE INDEX "issues_company_jira_id_unique" ON "issues"("company_id", "jira_id");