-- CreateTable
CREATE TABLE "projects" (
    "id" SERIAL NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_mappings" (
    "id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "jira_status_name" VARCHAR(200) NOT NULL,
    "canonical_stage" VARCHAR(50) NOT NULL,

    CONSTRAINT "workflow_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sprints" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "start_date" TIMESTAMPTZ,
    "end_date" TIMESTAMPTZ,
    "project_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sprints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issues" (
    "id" SERIAL NOT NULL,
    "jira_id" VARCHAR(50) NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "summary" TEXT NOT NULL,
    "issue_type" VARCHAR(100) NOT NULL,
    "priority" VARCHAR(50),
    "project_id" INTEGER NOT NULL,
    "story_points" INTEGER,
    "parent_key" VARCHAR(50),
    "web_url" TEXT,
    "created" TIMESTAMPTZ NOT NULL,
    "resolved" TIMESTAMPTZ,
    "raw_data" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_changes" (
    "id" SERIAL NOT NULL,
    "issue_id" INTEGER NOT NULL,
    "field_name" VARCHAR(50) NOT NULL,
    "from_value" VARCHAR(200),
    "to_value" VARCHAR(200),
    "changed" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "status_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issues_sprints" (
    "issue_id" INTEGER NOT NULL,
    "sprint_id" INTEGER NOT NULL,

    CONSTRAINT "issues_sprints_pkey" PRIMARY KEY ("issue_id","sprint_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_key_key" ON "projects"("key");

-- CreateIndex
CREATE INDEX "workflow_mappings_project_id_idx" ON "workflow_mappings"("project_id");

-- CreateIndex
CREATE INDEX "workflow_mappings_canonical_stage_idx" ON "workflow_mappings"("canonical_stage");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_mappings_project_id_jira_status_name_key" ON "workflow_mappings"("project_id", "jira_status_name");

-- CreateIndex
CREATE INDEX "sprints_project_id_idx" ON "sprints"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "issues_jira_id_key" ON "issues"("jira_id");

-- CreateIndex
CREATE UNIQUE INDEX "issues_key_key" ON "issues"("key");

-- CreateIndex
CREATE INDEX "issues_project_id_idx" ON "issues"("project_id");

-- CreateIndex
CREATE INDEX "issues_issue_type_idx" ON "issues"("issue_type");

-- CreateIndex
CREATE INDEX "issues_priority_idx" ON "issues"("priority");

-- CreateIndex
CREATE INDEX "issues_created_idx" ON "issues"("created");

-- CreateIndex
CREATE INDEX "issues_resolved_idx" ON "issues"("resolved");

-- CreateIndex
CREATE INDEX "issues_story_points_idx" ON "issues"("story_points");

-- CreateIndex
CREATE INDEX "issues_parent_key_idx" ON "issues"("parent_key");

-- CreateIndex
CREATE INDEX "status_changes_issue_id_idx" ON "status_changes"("issue_id");

-- CreateIndex
CREATE INDEX "status_changes_field_name_idx" ON "status_changes"("field_name");

-- CreateIndex
CREATE INDEX "status_changes_changed_idx" ON "status_changes"("changed");

-- CreateIndex
CREATE INDEX "status_changes_field_name_to_value_idx" ON "status_changes"("field_name", "to_value");

-- AddForeignKey
ALTER TABLE "workflow_mappings" ADD CONSTRAINT "workflow_mappings_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_parent_key_fkey" FOREIGN KEY ("parent_key") REFERENCES "issues"("key") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_changes" ADD CONSTRAINT "status_changes_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues_sprints" ADD CONSTRAINT "issues_sprints_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issues_sprints" ADD CONSTRAINT "issues_sprints_sprint_id_fkey" FOREIGN KEY ("sprint_id") REFERENCES "sprints"("id") ON DELETE CASCADE ON UPDATE CASCADE;