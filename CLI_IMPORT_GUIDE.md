# JIRA Data Import CLI Guide

A command-line tool to import JIRA JSON data directly into your PostgreSQL database.

## Quick Start

```bash
# Import JIRA data from a JSON file
npm run import path/to/your/jira-export.json

# See all available options
npm run import:help
```

## Installation

Make sure you have all dependencies installed:

```bash
npm install
```

Ensure your database is set up (see DEPLOYMENT.md for Vercel Postgres setup):

```bash
npm run db:push
```

## Usage

### Basic Import

```bash
# Single project file
npm run import data/jira-export.json

# Multi-project file (imports all projects)
npm run import data/multi-project-export.json
```

This will:
- Auto-detect all project keys from the data
- Use project keys as project names
- Apply default workflow status mappings to all projects
- Import all issues, sprints, and status changes

### Advanced Options

```bash
# Single project with custom settings
npm run import data/jira-export.json \
  --project "MYPROJ" \
  --name "My Project Name" \
  --workflow-config workflow.json \
  --verbose

# Multi-project: import only specific project
npm run import data/multi-project-export.json \
  --project "API" \
  --verbose

# Multi-project: import all with custom workflow
npm run import data/multi-project-export.json \
  --workflow-config custom-workflow.json \
  --verbose
```

### Available Options

- `--project <key>` - Import only this project key (useful for multi-project files)
- `--name <name>` - Set project display name (uses project key if not provided)  
- `--workflow-config <file>` - Custom workflow status mappings (see below)
- `--dry-run` - Preview what would be imported without making changes
- `--verbose` - Show detailed progress and information

### Multi-Project Support

The CLI automatically detects multiple projects in your JSON file and imports them all. Each project gets its own:
- Project record in the database
- Workflow mappings (same config applied to all)
- Sprints (scoped to each project)
- Issues and status changes

## Workflow Configuration

### Default Mappings

The CLI includes sensible defaults for common JIRA statuses:

```json
{
  "to do": "BACKLOG",
  "ready for grooming": "READY_FOR_GROOMING", 
  "ready for dev": "READY_FOR_DEV",
  "in progress": "IN_PROGRESS",
  "in review": "IN_REVIEW",
  "in qa": "IN_QA", 
  "ready for release": "READY_FOR_RELEASE",
  "blocked": "BLOCKED",
  "done": "DONE"
}
```

### Custom Workflow Config

Generate a sample workflow configuration:

```bash
npm run import generate-workflow-config --output my-workflow.json
```

Edit the generated file to match your JIRA project's statuses:

```json
{
  "todo": "BACKLOG",
  "backlog": "BACKLOG",
  "grooming": "READY_FOR_GROOMING",
  "ready": "READY_FOR_DEV", 
  "development": "IN_PROGRESS",
  "dev complete": "IN_REVIEW",
  "testing": "IN_QA",
  "deployment ready": "READY_FOR_RELEASE",
  "on hold": "BLOCKED",
  "complete": "DONE",
  "closed": "DONE"
}
```

Available canonical stages:
- `BACKLOG` - Initial state, not yet started
- `READY_FOR_GROOMING` - Ready for requirements analysis
- `READY_FOR_DEV` - Ready for development
- `IN_PROGRESS` - Actively being developed
- `IN_REVIEW` - Code review, PR review
- `IN_QA` - Testing, quality assurance
- `READY_FOR_RELEASE` - Ready for deployment
- `BLOCKED` - Blocked, on hold
- `DONE` - Completed, closed

## JIRA Data Format

Your JSON file should contain an array of JIRA issues with this structure:

```json
[
  {
    "id": "12345",
    "key": "PROJ-123", 
    "summary": "Fix login bug",
    "issue_type": "Bug",
    "priority": "P1",
    "project_key": "PROJ",
    "story_points": 3,
    "parent_key": "PROJ-100",
    "web_url": "https://company.atlassian.net/browse/PROJ-123",
    "created": "2024-01-15T10:00:00Z",
    "resolved": "2024-01-20T16:30:00Z",
    "changelogs": [
      {
        "field_name": "status",
        "from_string": "To Do", 
        "to_string": "In Progress",
        "created": "2024-01-15T14:00:00Z"
      }
    ],
    "sprint_info": [
      {
        "name": "Sprint 24.1",
        "start_date": "2024-01-15T00:00:00Z",
        "end_date": "2024-01-28T23:59:59Z" 
      }
    ]
  }
]
```

### Required Fields
- `id` - JIRA issue ID
- `key` - JIRA issue key (e.g., "PROJ-123")
- `summary` - Issue title/summary
- `issue_type` - Type of issue (Bug, Story, Task, etc.)
- `project_key` - JIRA project key
- `created` - Creation timestamp

### Optional Fields
- `priority` - Issue priority (P1, P2, High, Medium, etc.)
- `story_points` - Story point estimate
- `parent_key` - Parent issue key (for subtasks)
- `web_url` - Link to JIRA issue
- `resolved` - Resolution timestamp
- `changelogs` - Array of status/field changes
- `sprint_info` - Array of sprint assignments

## Examples

### Basic Import with Dry Run

```bash
# Preview what will be imported
npm run import data/sprint-24-1.json --dry-run --verbose
```

Output:
```
📊 Import Summary:
   File: data/sprint-24-1.json
   Issues: 45
   Project: WEBAPP (WEBAPP)
   Workflow mappings: 15

🔄 Workflow Mappings:
   "to do" → BACKLOG
   "in progress" → IN_PROGRESS
   "in review" → IN_REVIEW
   ...

✅ Dry run completed - no data was imported
```

### Import with Custom Project Info

```bash
npm run import data/jira-dump.json \
  --project "WEBAPP" \
  --name "Web Application Project" \
  --workflow-config custom-workflow.json
```

### Multi-Project Import Examples

```bash
# Import all projects from a multi-project file
npm run import examples/multi-project-jira-data.json --verbose
```

Output:
```
📊 Import Summary:
   File: examples/multi-project-jira-data.json
   Issues: 6
   Projects: 3 (API, MOBILE, WEBAPP)
   Multi-project mode: Yes
   Workflow mappings: 15

📈 Overall Results:
   Projects processed: 3
   Issues created: 6
   Issues updated: 0
   Sprints created: 5
   Total issues: 6

📊 Per-Project Breakdown:
   API: 2 issues (2 new, 0 updated)
   MOBILE: 2 issues (2 new, 0 updated)
   WEBAPP: 2 issues (2 new, 0 updated)
```

```bash
# Import only specific project from multi-project file
npm run import examples/multi-project-jira-data.json --project "API" --verbose
```

### Import Multiple Files

```bash
# Import multiple exports (each will update the same project)
npm run import data/sprint-1.json --project "WEBAPP"
npm run import data/sprint-2.json --project "WEBAPP" 
npm run import data/sprint-3.json --project "WEBAPP"
```

## Troubleshooting

### Common Issues

1. **File not found**
   ```
   ❌ Import failed: File not found: data/export.json
   ```
   - Check the file path is correct
   - Use absolute paths if needed: `/full/path/to/file.json`

2. **Invalid JSON**
   ```
   ❌ Import failed: Invalid JSON file: Unexpected token
   ```
   - Validate your JSON file with a JSON validator
   - Check for trailing commas or syntax errors

3. **Database connection error**
   ```
   ❌ Import failed: Can't reach database server
   ```
   - Ensure your database is running
   - Check environment variables (see DEPLOYMENT.md)
   - Verify connection with: `npm run db:generate`

4. **Workflow mapping errors**
   ```
   ❌ Import failed: Invalid canonical stage "INVALID_STAGE"
   ```
   - Check your workflow config file
   - Use only valid canonical stages (see list above)
   - Generate a sample config: `npm run import generate-workflow-config`

### Verbose Output

Use `--verbose` to see detailed progress:

```bash
npm run import data/large-export.json --verbose
```

This shows:
- File and project information
- Workflow mappings being applied
- Progress through large datasets
- Issues that couldn't be processed

### Data Validation

The CLI validates:
- ✅ File exists and is readable
- ✅ Valid JSON format
- ✅ Array of issues
- ✅ Required fields present
- ✅ Valid workflow mappings
- ✅ Date formats

Issues with invalid data are skipped with warnings, but the import continues.

## Performance

- **Small datasets** (<1000 issues): ~1-2 seconds
- **Medium datasets** (<10,000 issues): ~30-60 seconds  
- **Large datasets** (>10,000 issues): Several minutes

All operations are performed in database transactions for consistency and can be safely interrupted.

## Integration

The CLI can be integrated into automated workflows:

```bash
#!/bin/bash
# automated-import.sh

# Download latest export
curl -o latest-export.json "https://api.example.com/jira/export"

# Import to database  
npm run import latest-export.json --project "PROD" --name "Production Issues"

# Clean up
rm latest-export.json
```