#!/usr/bin/env tsx

import { Command } from 'commander';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import ora from 'ora';
import { PrismaClient } from '@prisma/client';
import { JiraIssue } from '../src/types/jira';
import { CanonicalStage } from '../src/lib/db';
import { WorkflowMappingService } from '../src/services/workflow-mapping.service';

const prisma = new PrismaClient();

// Default workflow mapping based on common JIRA statuses
const DEFAULT_WORKFLOW_MAPPINGS = [
  { jiraStatusName: 'to do', canonicalStage: CanonicalStage.BACKLOG },
  { jiraStatusName: 'backlog', canonicalStage: CanonicalStage.BACKLOG },
  { jiraStatusName: 'ready for grooming', canonicalStage: CanonicalStage.READY_FOR_GROOMING },
  { jiraStatusName: 'ready for dev', canonicalStage: CanonicalStage.READY_FOR_DEV },
  { jiraStatusName: 'in progress', canonicalStage: CanonicalStage.IN_PROGRESS },
  { jiraStatusName: 'dev in progress', canonicalStage: CanonicalStage.IN_PROGRESS },
  { jiraStatusName: 'in development', canonicalStage: CanonicalStage.IN_PROGRESS },
  { jiraStatusName: 'in review', canonicalStage: CanonicalStage.IN_REVIEW },
  { jiraStatusName: 'in code review', canonicalStage: CanonicalStage.IN_REVIEW },
  { jiraStatusName: 'in code review (pr submitted)', canonicalStage: CanonicalStage.IN_REVIEW },
  { jiraStatusName: 'code review', canonicalStage: CanonicalStage.IN_REVIEW },
  { jiraStatusName: 'in qa', canonicalStage: CanonicalStage.IN_QA },
  { jiraStatusName: 'dev test', canonicalStage: CanonicalStage.IN_QA },
  { jiraStatusName: 'in testing', canonicalStage: CanonicalStage.IN_QA },
  { jiraStatusName: 'qa', canonicalStage: CanonicalStage.IN_QA },
  { jiraStatusName: 'testing', canonicalStage: CanonicalStage.IN_QA },
  { jiraStatusName: 'ready for release', canonicalStage: CanonicalStage.READY_FOR_RELEASE },
  { jiraStatusName: 'ready for tranche 0', canonicalStage: CanonicalStage.READY_FOR_RELEASE },
  { jiraStatusName: 'ready to deploy', canonicalStage: CanonicalStage.READY_FOR_RELEASE },
  { jiraStatusName: 'blocked', canonicalStage: CanonicalStage.BLOCKED },
  { jiraStatusName: 'blocked / on hold', canonicalStage: CanonicalStage.BLOCKED },
  { jiraStatusName: 'on hold', canonicalStage: CanonicalStage.BLOCKED },
  { jiraStatusName: 'done', canonicalStage: CanonicalStage.DONE },
  { jiraStatusName: 'closed', canonicalStage: CanonicalStage.DONE },
  { jiraStatusName: 'completed', canonicalStage: CanonicalStage.DONE },
  { jiraStatusName: 'resolved', canonicalStage: CanonicalStage.DONE }
];

interface ImportOptions {
  file: string;
  project?: string;
  name?: string;
  workflowConfig?: string;
  aiWorkflow?: boolean;
  dryRun?: boolean;
  verbose?: boolean;
  multiProject?: boolean;
}

interface WorkflowConfig {
  [jiraStatusName: string]: CanonicalStage;
}

async function generateAIWorkflowConfig(
  jiraData: JiraIssue[], 
  projectKey: string, 
  projectName?: string,
  spinner?: any
): Promise<WorkflowConfig> {
  const workflowService = new WorkflowMappingService();
  
  if (spinner) spinner.text = 'Extracting status names from JIRA data...';
  
  // Convert JIRA issues to the format expected by the service
  const issuesForExtraction = jiraData.map(issue => ({
    changelogs: issue.changelogs
  }));
  
  const statusNames = workflowService.extractStatusNames(issuesForExtraction);
  
  if (statusNames.length === 0) {
    throw new Error('No status names found in the JIRA data');
  }
  
  if (spinner) spinner.text = `Analyzing ${statusNames.length} status names with AI...`;
  
  const mappingResponse = await workflowService.generateMappings({
    projectKey,
    projectName,
    statusNames
  });
  
  // Convert to WorkflowConfig format
  const config: WorkflowConfig = {};
  mappingResponse.mappings.forEach(mapping => {
    config[mapping.jiraStatusName.toLowerCase()] = mapping.canonicalStage as CanonicalStage;
  });
  
  return config;
}

async function loadWorkflowConfig(configPath?: string): Promise<WorkflowConfig> {
  if (!configPath) {
    // Return default mapping as object
    return DEFAULT_WORKFLOW_MAPPINGS.reduce((acc, mapping) => {
      acc[mapping.jiraStatusName] = mapping.canonicalStage as CanonicalStage;
      return acc;
    }, {} as WorkflowConfig);
  }

  if (!existsSync(resolve(configPath))) {
    throw new Error(`Workflow config file not found: ${configPath}`);
  }

  try {
    const configContent = readFileSync(resolve(configPath), 'utf-8');
    const config = JSON.parse(configContent);
    
    if (typeof config !== 'object') {
      throw new Error('Workflow config must be a JSON object');
    }

    // Validate that all values are valid canonical stages
    for (const [status, stage] of Object.entries(config)) {
      if (!Object.values(CanonicalStage).includes(stage as CanonicalStage)) {
        throw new Error(`Invalid canonical stage "${stage}" for status "${status}". Valid stages: ${Object.values(CanonicalStage).join(', ')}`);
      }
    }

    return config as WorkflowConfig;
  } catch (error) {
    throw new Error(`Failed to parse workflow config: ${error}`);
  }
}

function extractProjectKeys(issues: JiraIssue[]): string[] {
  if (issues.length === 0) {
    throw new Error('No issues found in the data file');
  }

  const projectKeys = [...new Set(issues.map(issue => issue.project_key).filter(Boolean))];
  
  if (projectKeys.length === 0) {
    throw new Error('No project keys found in the issues');
  }

  return projectKeys.sort();
}

function groupIssuesByProject(issues: JiraIssue[]): Record<string, JiraIssue[]> {
  return issues.reduce((groups, issue) => {
    const projectKey = issue.project_key;
    if (!groups[projectKey]) {
      groups[projectKey] = [];
    }
    groups[projectKey].push(issue);
    return groups;
  }, {} as Record<string, JiraIssue[]>);
}

async function importSingleProject(
  projectIssues: JiraIssue[], 
  projectKey: string, 
  projectName: string,
  workflowMappings: Array<{ jiraStatusName: string; canonicalStage: CanonicalStage }>,
  options: ImportOptions,
  spinner: any
): Promise<{
  projectKey: string;
  projectName: string;
  issuesCreated: number;
  issuesUpdated: number;
  sprintsCreated: number;
  totalIssues: number;
}> {
  return await prisma.$transaction(async (tx) => {
    // Create or update project
    const project = await tx.project.upsert({
      where: { key: projectKey },
      update: { name: projectName },
      create: {
        key: projectKey,
        name: projectName
      }
    });

    // Create workflow mappings
    await tx.workflowMapping.deleteMany({
      where: { projectId: project.id }
    });
    
    await tx.workflowMapping.createMany({
      data: workflowMappings.map(mapping => ({
        projectId: project.id,
        jiraStatusName: mapping.jiraStatusName,
        canonicalStage: mapping.canonicalStage
      }))
    });

    let issuesCreated = 0;
    let issuesUpdated = 0;
    let sprintsCreated = 0;
    const sprintCache = new Map<string, number>();

    // Process each issue in this project
    for (const [index, issue] of projectIssues.entries()) {
      if (options.verbose && index % 50 === 0) {
        spinner.text = `Processing ${projectKey}: ${index + 1}/${projectIssues.length} issues...`;
      }

      try {
        // Create sprints if they don't exist
        if (issue.sprint_info?.length) {
          for (const sprintInfo of issue.sprint_info) {
            if (sprintInfo.name && !sprintCache.has(sprintInfo.name)) {
              const sprint = await tx.sprint.upsert({
                where: {
                  projectId_name: {
                    projectId: project.id,
                    name: sprintInfo.name
                  }
                },
                update: {
                  startDate: sprintInfo.start_date ? new Date(sprintInfo.start_date) : null,
                  endDate: sprintInfo.end_date ? new Date(sprintInfo.end_date) : null
                },
                create: {
                  name: sprintInfo.name,
                  startDate: sprintInfo.start_date ? new Date(sprintInfo.start_date) : null,
                  endDate: sprintInfo.end_date ? new Date(sprintInfo.end_date) : null,
                  projectId: project.id
                }
              });
              sprintCache.set(sprintInfo.name, sprint.id);
              sprintsCreated++;
            }
          }
        }

        // Check if issue exists
        const existingIssue = await tx.issue.findUnique({
          where: { key: issue.key }
        });

        // Create or update issue
        const dbIssue = await tx.issue.upsert({
          where: { key: issue.key },
          update: {
            summary: issue.summary,
            issueType: issue.issue_type,
            priority: issue.priority,
            storyPoints: issue.story_points,
            parentKey: issue.parent_key,
            webUrl: issue.web_url,
            resolved: issue.resolved ? new Date(issue.resolved) : null,
            rawData: issue as any
          },
          create: {
            jiraId: issue.id,
            key: issue.key,
            summary: issue.summary,
            issueType: issue.issue_type,
            priority: issue.priority,
            projectId: project.id,
            storyPoints: issue.story_points,
            parentKey: issue.parent_key,
            webUrl: issue.web_url,
            created: new Date(issue.created),
            resolved: issue.resolved ? new Date(issue.resolved) : null,
            rawData: issue as any
          }
        });

        if (existingIssue) {
          issuesUpdated++;
        } else {
          issuesCreated++;
        }

        // Create status changes
        await tx.statusChange.deleteMany({
          where: { issueId: dbIssue.id }
        });

        if (issue.changelogs?.length) {
          const statusChanges = issue.changelogs
            .filter(cl => cl.field_name === 'status' && cl.created)
            .map(changelog => ({
              issueId: dbIssue.id,
              fieldName: changelog.field_name,
              fromValue: changelog.from_string,
              toValue: changelog.to_string,
              changed: new Date(changelog.created)
            }));

          if (statusChanges.length > 0) {
            await tx.statusChange.createMany({
              data: statusChanges
            });
          }
        }

        // Link to sprints
        await tx.issuesSprints.deleteMany({
          where: { issueId: dbIssue.id }
        });

        if (issue.sprint_info?.length) {
          for (const sprintInfo of issue.sprint_info) {
            if (sprintInfo.name) {
              const sprintId = sprintCache.get(sprintInfo.name);
              if (sprintId) {
                await tx.issuesSprints.create({
                  data: {
                    issueId: dbIssue.id,
                    sprintId: sprintId
                  }
                });
              }
            }
          }
        }

      } catch (error) {
        console.warn(`⚠️  Failed to process issue ${issue.key}: ${error}`);
        continue;
      }
    }

    return {
      projectKey,
      projectName,
      issuesCreated,
      issuesUpdated,
      sprintsCreated,
      totalIssues: issuesCreated + issuesUpdated
    };
  });
}

async function importData(options: ImportOptions): Promise<void> {
  const spinner = ora('Loading JIRA data file...').start();

  try {
    // Load and validate file
    if (!existsSync(resolve(options.file))) {
      throw new Error(`File not found: ${options.file}`);
    }

    const fileContent = readFileSync(resolve(options.file), 'utf-8');
    let jiraData: JiraIssue[];

    try {
      jiraData = JSON.parse(fileContent);
    } catch (error) {
      throw new Error(`Invalid JSON file: ${error}`);
    }

    if (!Array.isArray(jiraData)) {
      throw new Error('JIRA data must be an array of issues');
    }

    if (jiraData.length === 0) {
      throw new Error('No issues found in the file');
    }

    spinner.text = `Loaded ${jiraData.length} issues`;

    // Detect projects in the data
    const projectKeys = extractProjectKeys(jiraData);
    const isMultiProject = projectKeys.length > 1;

    // Handle single project override
    if (options.project && !isMultiProject) {
      // Single project specified, use it
      projectKeys.length = 0;
      projectKeys.push(options.project);
    } else if (options.project && isMultiProject) {
      // Multi-project data but user specified single project
      if (!projectKeys.includes(options.project)) {
        throw new Error(`Specified project '${options.project}' not found in data. Available projects: ${projectKeys.join(', ')}`);
      }
      // Filter to only the specified project
      jiraData = jiraData.filter(issue => issue.project_key === options.project);
      projectKeys.length = 0;
      projectKeys.push(options.project);
    }

    spinner.text = 'Loading workflow configuration...';

    // Load or generate workflow configuration
    let workflowConfig: WorkflowConfig;
    
    if (options.aiWorkflow) {
      if (options.workflowConfig) {
        throw new Error('Cannot use both --ai-workflow and --workflow-config options together');
      }
      
      try {
        workflowConfig = await generateAIWorkflowConfig(
          jiraData, 
          projectKeys[0], // Use first project key for AI context
          options.name, 
          spinner
        );
      } catch (error) {
        console.warn(`⚠️  AI workflow generation failed: ${error}`);
        console.warn('   Falling back to default workflow configuration...');
        workflowConfig = await loadWorkflowConfig();
      }
    } else {
      workflowConfig = await loadWorkflowConfig(options.workflowConfig);
    }
    
    const workflowMappings = Object.entries(workflowConfig).map(([jiraStatusName, canonicalStage]) => ({
      jiraStatusName: jiraStatusName.toLowerCase(),
      canonicalStage
    }));

    if (options.verbose) {
      console.log(`\n📊 Import Summary:`);
      console.log(`   File: ${options.file}`);
      console.log(`   Issues: ${jiraData.length}`);
      console.log(`   Projects: ${projectKeys.length} (${projectKeys.join(', ')})`);
      console.log(`   Multi-project mode: ${isMultiProject ? 'Yes' : 'No'}`);
      console.log(`   Workflow source: ${options.aiWorkflow ? 'AI-generated' : (options.workflowConfig ? 'Custom config file' : 'Default mappings')}`);
      console.log(`   Workflow mappings: ${workflowMappings.length}`);
      
      if (options.dryRun) {
        console.log(`\n🔄 Workflow Mappings:`);
        workflowMappings.forEach(mapping => {
          console.log(`   "${mapping.jiraStatusName}" → ${mapping.canonicalStage}`);
        });

        if (isMultiProject) {
          const projectGroups = groupIssuesByProject(jiraData);
          console.log(`\n📂 Projects to be created/updated:`);
          projectKeys.forEach(projectKey => {
            const issueCount = projectGroups[projectKey]?.length || 0;
            console.log(`   ${projectKey}: ${issueCount} issues`);
          });
        }
      }
    }

    if (options.dryRun) {
      spinner.succeed('✅ Dry run completed - no data was imported');
      return;
    }

    spinner.text = 'Importing data to database...';

    // Group issues by project
    const projectGroups = groupIssuesByProject(jiraData);
    const results = [];

    // Import each project
    for (const [index, projectKey] of projectKeys.entries()) {
      const projectIssues = projectGroups[projectKey] || [];
      const projectName = options.name || projectKey;

      if (projectKeys.length > 1) {
        spinner.text = `Importing project ${index + 1}/${projectKeys.length}: ${projectKey}...`;
      }

      try {
        const result = await importSingleProject(
          projectIssues,
          projectKey, 
          projectName,
          workflowMappings,
          options,
          spinner
        );
        results.push(result);
      } catch (error) {
        console.warn(`⚠️  Failed to import project ${projectKey}: ${error}`);
        continue;
      }
    }

    spinner.succeed(`✅ Import completed successfully!`);
    
    // Display results
    const totals = results.reduce((acc, result) => ({
      issuesCreated: acc.issuesCreated + result.issuesCreated,
      issuesUpdated: acc.issuesUpdated + result.issuesUpdated,
      sprintsCreated: acc.sprintsCreated + result.sprintsCreated,
      totalIssues: acc.totalIssues + result.totalIssues
    }), { issuesCreated: 0, issuesUpdated: 0, sprintsCreated: 0, totalIssues: 0 });

    console.log(`\n📈 Overall Results:`);
    console.log(`   Projects processed: ${results.length}`);
    console.log(`   Issues created: ${totals.issuesCreated}`);
    console.log(`   Issues updated: ${totals.issuesUpdated}`);
    console.log(`   Sprints created: ${totals.sprintsCreated}`);
    console.log(`   Total issues: ${totals.totalIssues}`);

    if (options.verbose && results.length > 1) {
      console.log(`\n📊 Per-Project Breakdown:`);
      results.forEach(result => {
        console.log(`   ${result.projectKey}: ${result.totalIssues} issues (${result.issuesCreated} new, ${result.issuesUpdated} updated)`);
      });
    }

  } catch (error) {
    spinner.fail(`❌ Import failed: ${error}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// CLI Setup
const program = new Command();

program
  .name('import-jira-data')
  .description('Import JIRA data from JSON file to database')
  .version('1.0.0');

program
  .argument('<file>', 'Path to JIRA JSON data file')
  .option('-p, --project <key>', 'Import only this project key (useful for multi-project files)')
  .option('-n, --name <name>', 'Project name (uses project key if not provided)')
  .option('-w, --workflow-config <file>', 'Path to workflow mapping JSON file')
  .option('-a, --ai-workflow', 'Use AI to automatically generate workflow mappings from status names')
  .option('-d, --dry-run', 'Show what would be imported without making changes')
  .option('-v, --verbose', 'Verbose output')
  .action(async (file: string, options: Omit<ImportOptions, 'file'>) => {
    await importData({ ...options, file });
  });

program
  .command('generate-workflow-config')
  .description('Generate a sample workflow configuration file')
  .option('-o, --output <file>', 'Output file path', 'workflow-config.json')
  .action((options) => {
    const { writeFileSync } = require('fs');
    
    const sampleConfig = DEFAULT_WORKFLOW_MAPPINGS.reduce((acc, mapping) => {
      acc[mapping.jiraStatusName] = mapping.canonicalStage;
      return acc;
    }, {} as Record<string, string>);

    writeFileSync(options.output, JSON.stringify(sampleConfig, null, 2));
    console.log(`✅ Sample workflow config generated: ${options.output}`);
    console.log(`\n📝 Edit this file to customize status mappings for your project.`);
    console.log(`   Available canonical stages: ${Object.values(CanonicalStage).join(', ')}`);
  });

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled Rejection:', error);
  process.exit(1);
});

program.parse();