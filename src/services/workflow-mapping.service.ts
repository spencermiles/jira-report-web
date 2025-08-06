import OpenAI from 'openai';
import { prisma } from '@/lib/db';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

export interface StatusMapping {
  jiraStatusName: string;
  canonicalStage: CanonicalStage;
  confidence: number;
}

export type CanonicalStage = 
  | 'BACKLOG'
  | 'IN_PROGRESS' 
  | 'IN_REVIEW'
  | 'IN_QA'
  | 'READY_FOR_RELEASE'
  | 'DONE'
  | 'BLOCKED';

export interface WorkflowMappingRequest {
  projectKey: string;
  projectName?: string;
  statusNames: string[];
}

export interface WorkflowMappingResponse {
  mappings: StatusMapping[];
  confidence: number;
  reasoning?: string;
}

export class WorkflowMappingService {
  private openai: OpenAI | null = null;

  constructor() {
    // Don't initialize OpenAI immediately - wait for first use
    // This allows the service to be imported without throwing errors
  }

  private initializeOpenAI(): OpenAI {
    if (this.openai) {
      return this.openai;
    }

    // Ensure we're on the server side
    if (typeof window !== 'undefined') {
      throw new Error('WorkflowMappingService can only be used on the server side');
    }

    // Reload environment variables to be safe
    dotenv.config();
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      console.error('Environment variables containing OPENAI:', Object.keys(process.env).filter(key => key.includes('OPENAI')));
      console.error('Current working directory:', process.cwd());
      console.error('NODE_ENV:', process.env.NODE_ENV);
      throw new Error(
        'OPENAI_API_KEY environment variable is required. ' +
        'Please ensure your .env file contains OPENAI_API_KEY=your-api-key. ' +
        'This service can only be used on the server side.'
      );
    }
    
    try {
      this.openai = new OpenAI({
        apiKey: apiKey,
      });
    } catch (error) {
      throw new Error(`Failed to initialize OpenAI client: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return this.openai;
  }

  /**
   * Generate workflow mappings using LLM analysis of status names
   */
  async generateMappings(request: WorkflowMappingRequest): Promise<WorkflowMappingResponse> {
    const openai = this.initializeOpenAI();
    const prompt = this.createMappingPrompt(request);
    
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in software development workflows and JIRA status mappings. Analyze status names and map them to canonical workflow stages with confidence scores.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1, // Low temperature for consistent results
        response_format: { type: 'json_object' }
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      return this.parseLLMResponse(response);
    } catch (error) {
      console.error('Error generating workflow mappings:', error);
      throw new Error(`Failed to generate workflow mappings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save workflow mappings to the database
   */
  async saveMappings(projectId: number, mappings: StatusMapping[]): Promise<void> {
    try {
      // Remove existing mappings for this project
      await prisma.workflowMapping.deleteMany({
        where: { projectId }
      });

      // Insert new mappings
      await prisma.workflowMapping.createMany({
        data: mappings.map(mapping => ({
          projectId,
          jiraStatusName: mapping.jiraStatusName,
          canonicalStage: mapping.canonicalStage,
        }))
      });
    } catch (error) {
      console.error('Error saving workflow mappings:', error);
      throw new Error(`Failed to save workflow mappings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate and save workflow mappings for a project
   */
  async generateAndSaveMappings(
    projectId: number, 
    request: WorkflowMappingRequest
  ): Promise<WorkflowMappingResponse> {
    const response = await this.generateMappings(request);
    await this.saveMappings(projectId, response.mappings);
    return response;
  }

  /**
   * Extract unique status names from issue data
   */
  extractStatusNames(issues: any[]): string[] {
    const statusNames = new Set<string>();
    
    issues.forEach(issue => {
      // Handle standard JIRA API format (issue.changelog.histories)
      if (issue.changelog?.histories) {
        issue.changelog.histories.forEach((history: any) => {
          if (history.items) {
            history.items.forEach((item: any) => {
              if (item.field === 'status') {
                if (item.fromString) statusNames.add(item.fromString);
                if (item.toString) statusNames.add(item.toString);
              }
            });
          }
        });
      }
      // Handle user's data format (issue.changelogs as direct array)
      else if (issue.changelogs && Array.isArray(issue.changelogs)) {
        issue.changelogs.forEach((changelog: any) => {
          // Handle both camelCase (fieldName) and snake_case (field_name) formats
          const fieldName = changelog.fieldName || changelog.field_name;
          if (fieldName === 'status') {
            // Handle both camelCase and snake_case value fields
            const fromValue = changelog.fromString || changelog.from_string;
            const toValue = changelog.toString || changelog.to_string;
            if (fromValue) statusNames.add(fromValue);
            if (toValue) statusNames.add(toValue);
          }
        });
      }
    });

    return Array.from(statusNames).sort();
  }

  private createMappingPrompt(request: WorkflowMappingRequest): string {
    return `Analyze these JIRA status names and map them to canonical workflow stages.

Project: ${request.projectKey}${request.projectName ? ` (${request.projectName})` : ''}
Status names: ${JSON.stringify(request.statusNames)}

Map each status to one of these canonical stages:
- BACKLOG: Items not yet started (To Do, Open, New, Backlog, etc.)
- IN_PROGRESS: Active development work (In Progress, In Development, Development, Working, etc.)
- IN_REVIEW: Code review phase (In Review, Review, Code Review, PR Review, etc.)
- IN_QA: Testing and quality assurance (Testing, QA, In QA, QA Testing, UAT, etc.)
- READY_FOR_RELEASE: Ready for deployment (Ready to Deploy, Ready for Release, Ready for Prod, etc.)
- DONE: Completed work (Done, Resolved, Closed, Completed, Deployed, etc.)
- BLOCKED: Work stopped due to impediments (Blocked, On Hold, Waiting, etc.)

Consider:
- Common software development workflow patterns
- Semantic meaning of status names
- Typical JIRA workflow progressions
- Status names that might be project-specific but follow standard patterns

Return a JSON object with:
{
  "mappings": [
    {
      "jiraStatusName": "status_name",
      "canonicalStage": "CANONICAL_STAGE",
      "confidence": 0.95
    }
  ],
  "confidence": 0.92,
  "reasoning": "Brief explanation of mapping decisions"
}

Confidence scores:
- 0.95-1.0: Very confident (exact matches like "Done" -> "DONE")
- 0.8-0.94: Confident (clear semantic matches like "In Development" -> "IN_PROGRESS")  
- 0.6-0.79: Moderately confident (contextual matches)
- 0.3-0.59: Low confidence (ambiguous or unusual status names)
- 0.0-0.29: Very low confidence (unclear or contradictory status names)

Overall confidence should be the average of individual mapping confidences.`;
  }

  private parseLLMResponse(response: string): WorkflowMappingResponse {
    try {
      const parsed = JSON.parse(response);
      
      // Validate response structure
      if (!parsed.mappings || !Array.isArray(parsed.mappings)) {
        throw new Error('Invalid response: missing or invalid mappings array');
      }

      // Validate each mapping
      parsed.mappings.forEach((mapping: any, index: number) => {
        if (!mapping.jiraStatusName || typeof mapping.jiraStatusName !== 'string') {
          throw new Error(`Invalid mapping at index ${index}: missing or invalid jiraStatusName`);
        }
        if (!mapping.canonicalStage || !this.isValidCanonicalStage(mapping.canonicalStage)) {
          throw new Error(`Invalid mapping at index ${index}: invalid canonicalStage "${mapping.canonicalStage}"`);
        }
        if (typeof mapping.confidence !== 'number' || mapping.confidence < 0 || mapping.confidence > 1) {
          throw new Error(`Invalid mapping at index ${index}: invalid confidence score`);
        }
      });

      return {
        mappings: parsed.mappings,
        confidence: parsed.confidence || 0,
        reasoning: parsed.reasoning
      };
    } catch (error) {
      console.error('Error parsing LLM response:', response, error);
      throw new Error(`Failed to parse LLM response: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
    }
  }

  private isValidCanonicalStage(stage: string): stage is CanonicalStage {
    return ['BACKLOG', 'IN_PROGRESS', 'IN_REVIEW', 'IN_QA', 'READY_FOR_RELEASE', 'DONE', 'BLOCKED']
      .includes(stage);
  }
}