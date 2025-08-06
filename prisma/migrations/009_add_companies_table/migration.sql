-- CreateTable: companies
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "logo_url" TEXT,
    "website" TEXT,
    "settings" JSONB DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique company name and slug
CREATE UNIQUE INDEX "companies_name_key" ON "companies"("name");
CREATE UNIQUE INDEX "companies_slug_key" ON "companies"("slug");
CREATE INDEX "companies_is_active_idx" ON "companies"("is_active");
CREATE INDEX "companies_created_at_idx" ON "companies"("created_at");

-- Add company_id columns to existing tables (nullable initially for migration)
ALTER TABLE "projects" ADD COLUMN "company_id" TEXT;
ALTER TABLE "issues" ADD COLUMN "company_id" TEXT;
ALTER TABLE "status_changes" ADD COLUMN "company_id" TEXT;
ALTER TABLE "sprints" ADD COLUMN "company_id" TEXT;
ALTER TABLE "workflow_mappings" ADD COLUMN "company_id" TEXT;

-- Create default company for existing data
INSERT INTO "companies" (
    "id", 
    "name", 
    "slug", 
    "description", 
    "is_active",
    "created_at",
    "updated_at"
) VALUES (
    gen_random_uuid()::text,
    'Default Organization',
    'default-organization',
    'Default company for existing projects and data',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Get the default company ID for data migration
-- Update existing records with default company_id
UPDATE "projects" SET "company_id" = (
    SELECT "id" FROM "companies" WHERE "slug" = 'default-organization'
);

UPDATE "issues" SET "company_id" = (
    SELECT "id" FROM "companies" WHERE "slug" = 'default-organization'
);

UPDATE "status_changes" SET "company_id" = (
    SELECT "id" FROM "companies" WHERE "slug" = 'default-organization'
);

UPDATE "sprints" SET "company_id" = (
    SELECT "id" FROM "companies" WHERE "slug" = 'default-organization'
);

UPDATE "workflow_mappings" SET "company_id" = (
    SELECT "id" FROM "companies" WHERE "slug" = 'default-organization'
);

-- Now make company_id NOT NULL and add foreign key constraints
ALTER TABLE "projects" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "issues" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "status_changes" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "sprints" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "workflow_mappings" ALTER COLUMN "company_id" SET NOT NULL;

-- Add foreign key constraints
ALTER TABLE "projects" ADD CONSTRAINT "projects_company_id_fkey" 
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;

ALTER TABLE "issues" ADD CONSTRAINT "issues_company_id_fkey" 
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;

ALTER TABLE "status_changes" ADD CONSTRAINT "status_changes_company_id_fkey" 
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;

ALTER TABLE "sprints" ADD CONSTRAINT "sprints_company_id_fkey" 
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;

ALTER TABLE "workflow_mappings" ADD CONSTRAINT "workflow_mappings_company_id_fkey" 
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE;

-- Update unique constraints to be scoped to company
-- Drop existing unique constraint (if it exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'projects_key_key' 
        AND table_name = 'projects'
    ) THEN
        ALTER TABLE "projects" DROP CONSTRAINT "projects_key_key";
    END IF;
END $$;

ALTER TABLE "projects" ADD CONSTRAINT "projects_company_key_unique" 
    UNIQUE ("company_id", "key");

-- Drop existing unique constraint for issues (if it exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'issues_key_key' 
        AND table_name = 'issues'
    ) THEN
        ALTER TABLE "issues" DROP CONSTRAINT "issues_key_key";
    END IF;
END $$;

ALTER TABLE "issues" ADD CONSTRAINT "issues_company_key_unique" 
    UNIQUE ("company_id", "key");

-- Update sprint name uniqueness to be scoped to company
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'projectId_name' 
        AND table_name = 'sprints'
    ) THEN
        ALTER TABLE "sprints" DROP CONSTRAINT "projectId_name";
    END IF;
END $$;

-- Note: Sprint names should be unique within company, not just project
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_company_name_unique" 
    UNIQUE ("company_id", "name");

-- Add performance indexes for company_id filtering
CREATE INDEX "projects_company_id_idx" ON "projects"("company_id");
CREATE INDEX "projects_company_created_idx" ON "projects"("company_id", "created_at");

CREATE INDEX "issues_company_id_idx" ON "issues"("company_id");
CREATE INDEX "issues_company_created_idx" ON "issues"("company_id", "created");
CREATE INDEX "issues_company_resolved_idx" ON "issues"("company_id", "resolved");
CREATE INDEX "issues_company_type_idx" ON "issues"("company_id", "issue_type");
CREATE INDEX "issues_company_priority_idx" ON "issues"("company_id", "priority");

CREATE INDEX "status_changes_company_id_idx" ON "status_changes"("company_id");
CREATE INDEX "status_changes_company_changed_idx" ON "status_changes"("company_id", "changed");

CREATE INDEX "sprints_company_id_idx" ON "sprints"("company_id");
CREATE INDEX "sprints_company_start_idx" ON "sprints"("company_id", "start_date");

CREATE INDEX "workflow_mappings_company_id_idx" ON "workflow_mappings"("company_id");
CREATE INDEX "workflow_mappings_company_stage_idx" ON "workflow_mappings"("company_id", "canonical_stage");

-- Create updated_at trigger for companies table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_companies_updated_at 
    BEFORE UPDATE ON "companies"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();