-- Remove old global unique constraints that conflict with company-scoped uniqueness

-- Drop old global unique constraint on projects.key (if it still exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'projects_key_key' 
        AND table_name = 'projects'
        AND constraint_type = 'UNIQUE'
    ) THEN
        ALTER TABLE "projects" DROP CONSTRAINT "projects_key_key";
    END IF;
END $$;

-- Drop old global unique constraint on issues.key (if it still exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'issues_key_key' 
        AND table_name = 'issues'
        AND constraint_type = 'UNIQUE'
    ) THEN
        ALTER TABLE "issues" DROP CONSTRAINT "issues_key_key";
    END IF;
END $$;

-- The company-scoped unique constraints should already exist from the previous migration:
-- - projects_company_key_unique on (company_id, key)
-- - issues_company_key_unique on (company_id, key) 
-- - sprints_company_name_unique on (company_id, name)

-- Verify the company-scoped constraints exist (create if missing)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'projects_company_key_unique' 
        AND table_name = 'projects'
        AND constraint_type = 'UNIQUE'
    ) THEN
        ALTER TABLE "projects" ADD CONSTRAINT "projects_company_key_unique" 
            UNIQUE ("company_id", "key");
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'issues_company_key_unique' 
        AND table_name = 'issues'
        AND constraint_type = 'UNIQUE'
    ) THEN
        ALTER TABLE "issues" ADD CONSTRAINT "issues_company_key_unique" 
            UNIQUE ("company_id", "key");
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sprints_company_name_unique' 
        AND table_name = 'sprints'
        AND constraint_type = 'UNIQUE'
    ) THEN
        ALTER TABLE "sprints" ADD CONSTRAINT "sprints_company_name_unique" 
            UNIQUE ("company_id", "name");
    END IF;
END $$;