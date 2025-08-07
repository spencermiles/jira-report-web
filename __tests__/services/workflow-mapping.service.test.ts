import { WorkflowMappingService } from '../../src/services/workflow-mapping.service';
import { prisma } from '../../src/lib/db';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai');
const mockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

// Mock Prisma
jest.mock('../../src/lib/db', () => ({
  prisma: {
    workflowMapping: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    }
  }
}));

describe('WorkflowMappingService', () => {
  let service: WorkflowMappingService;
  let mockOpenAIInstance: jest.Mocked<OpenAI>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock OpenAI instance
    mockOpenAIInstance = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    } as any;
    
    mockOpenAI.mockImplementation(() => mockOpenAIInstance);
    
    // Set environment variable
    process.env.OPENAI_API_KEY = 'test-api-key';
    
    service = new WorkflowMappingService();
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  describe('constructor', () => {
    it('should create instance without throwing', () => {
      delete process.env.OPENAI_API_KEY;
      expect(() => new WorkflowMappingService()).not.toThrow();
    });

    it('should initialize OpenAI client lazily when needed', async () => {
      process.env.OPENAI_API_KEY = 'test-key';
      
      const mockResponse = {
        mappings: [
          { jiraStatusName: 'Test', canonicalStage: 'IN_PROGRESS', confidence: 0.95 },
        ],
        confidence: 0.95,
        reasoning: 'Test mapping'
      };

      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }]
      } as any);

      const service = new WorkflowMappingService();
      await service.generateMappings({ projectKey: 'TEST', statusNames: ['Test'] });
      
      expect(mockOpenAI).toHaveBeenCalledWith({ apiKey: 'test-key' });
    });

    it('should throw error when no API key is available during use', async () => {
      // Create a fresh service instance without API key
      const originalApiKey = process.env.OPENAI_API_KEY;
      
      // Clear all mocks to reset the OpenAI mock behavior
      jest.clearAllMocks();
      
      // Mock the environment to be server-side but with no API key  
      Object.defineProperty(global, 'window', { value: undefined });
      delete process.env.OPENAI_API_KEY;
      
      // Mock OpenAI to throw an error when no API key
      mockOpenAI.mockImplementation(() => {
        throw new Error('API key is required');
      });
      
      try {
        const service = new WorkflowMappingService();
        
        await expect(service.generateMappings({ 
          projectKey: 'TEST', 
          statusNames: ['Test'] 
        })).rejects.toThrow('Failed to initialize OpenAI client');
      } finally {
        // Restore the API key and mock
        if (originalApiKey) {
          process.env.OPENAI_API_KEY = originalApiKey;
        }
        // Restore the normal mock behavior
        mockOpenAI.mockImplementation(() => mockOpenAIInstance);
      }
    });
  });

  describe('generateMappings', () => {
    it('should generate workflow mappings using OpenAI', async () => {
      const mockResponse = {
        mappings: [
          { jiraStatusName: 'In Development', canonicalStage: 'IN_PROGRESS', confidence: 0.95 },
          { jiraStatusName: 'Done', canonicalStage: 'DONE', confidence: 1.0 },
        ],
        confidence: 0.975,
        reasoning: 'Clear semantic mapping'
      };

      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }]
      } as any);

      const request = {
        projectKey: 'TEST',
        projectName: 'Test Project',
        statusNames: ['In Development', 'Done']
      };

      const result = await service.generateMappings(request);

      expect(mockOpenAIInstance.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' })
        ]),
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      expect(result).toEqual(mockResponse);
    });

    it('should handle OpenAI API errors', async () => {
      mockOpenAIInstance.chat.completions.create.mockRejectedValue(new Error('API Error'));

      const request = {
        projectKey: 'TEST',
        statusNames: ['In Progress']
      };

      await expect(service.generateMappings(request)).rejects.toThrow('Failed to generate workflow mappings: API Error');
    });

    it('should handle invalid JSON response', async () => {
      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'invalid json' } }]
      } as any);

      const request = {
        projectKey: 'TEST',
        statusNames: ['In Progress']
      };

      await expect(service.generateMappings(request)).rejects.toThrow('Failed to generate workflow mappings');
    });

    it('should validate canonical stages', async () => {
      const invalidResponse = {
        mappings: [
          { jiraStatusName: 'Test', canonicalStage: 'INVALID_STAGE', confidence: 0.9 }
        ],
        confidence: 0.9
      };

      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(invalidResponse) } }]
      } as any);

      const request = {
        projectKey: 'TEST',
        statusNames: ['Test']
      };

      await expect(service.generateMappings(request)).rejects.toThrow('invalid canonicalStage');
    });
  });

  describe('saveMappings', () => {
    it('should save mappings to database', async () => {
      const mappings = [
        { jiraStatusName: 'In Development', canonicalStage: 'IN_PROGRESS' as const, confidence: 0.95 },
        { jiraStatusName: 'Done', canonicalStage: 'DONE' as const, confidence: 1.0 },
      ];

      (prisma.workflowMapping.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });
      (prisma.workflowMapping.createMany as jest.Mock).mockResolvedValue({ count: 2 });

      await service.saveMappings(123, mappings);

      expect(prisma.workflowMapping.deleteMany).toHaveBeenCalledWith({
        where: { projectId: 123 }
      });

      expect(prisma.workflowMapping.createMany).toHaveBeenCalledWith({
        data: [
          { projectId: 123, jiraStatusName: 'In Development', canonicalStage: 'IN_PROGRESS' },
          { projectId: 123, jiraStatusName: 'Done', canonicalStage: 'DONE' },
        ]
      });
    });

    it('should handle database errors', async () => {
      const mappings = [
        { jiraStatusName: 'Test', canonicalStage: 'IN_PROGRESS' as const, confidence: 0.9 }
      ];

      (prisma.workflowMapping.deleteMany as jest.Mock).mockRejectedValue(new Error('DB Error'));

      await expect(service.saveMappings(123, mappings)).rejects.toThrow('Failed to save workflow mappings: DB Error');
    });
  });

  describe('extractStatusNames', () => {
    it('should extract status names from standard JIRA format', () => {
      const issues = [
        {
          changelog: {
            histories: [
              {
                items: [
                  { field: 'status', fromString: 'To Do', toString: 'In Progress' },
                  { field: 'assignee', fromString: null, toString: 'john' } // Should be ignored
                ]
              },
              {
                items: [
                  { field: 'status', fromString: 'In Progress', toString: 'Done' }
                ]
              }
            ]
          }
        }
      ];

      const statusNames = service.extractStatusNames(issues);
      expect(statusNames).toEqual(['Done', 'In Progress', 'To Do']);
    });

    it('should extract status names from user data format', () => {
      const issues = [
        {
          changelogs: [
            { field_name: 'status', from_string: 'Backlog', to_string: 'In Development' },
            { field_name: 'priority', from_string: 'Low', to_string: 'High' } // Should be ignored
          ]
        }
      ];

      const statusNames = service.extractStatusNames(issues);
      expect(statusNames).toEqual(['Backlog', 'In Development']);
    });

    it('should handle mixed data formats', () => {
      const issues = [
        {
          changelog: {
            histories: [
              { items: [{ field: 'status', fromString: null, toString: 'To Do' }] }
            ]
          }
        },
        {
          changelogs: [
            { field_name: 'status', from_string: 'To Do', to_string: 'In Progress' }
          ]
        }
      ];

      const statusNames = service.extractStatusNames(issues);
      expect(statusNames).toEqual(['In Progress', 'To Do']);
    });

    it('should handle empty data', () => {
      expect(service.extractStatusNames([])).toEqual([]);
      expect(service.extractStatusNames([{}])).toEqual([]);
    });

    it('should deduplicate status names', () => {
      const issues = [
        {
          changelog: {
            histories: [
              { items: [{ field: 'status', fromString: 'To Do', toString: 'In Progress' }] },
              { items: [{ field: 'status', fromString: 'To Do', toString: 'Done' }] }
            ]
          }
        }
      ];

      const statusNames = service.extractStatusNames(issues);
      expect(statusNames).toEqual(['Done', 'In Progress', 'To Do']);
    });
  });

  describe('generateAndSaveMappings', () => {
    it('should generate and save mappings in one call', async () => {
      const mockResponse = {
        mappings: [
          { jiraStatusName: 'In Development', canonicalStage: 'IN_PROGRESS' as const, confidence: 0.95 }
        ],
        confidence: 0.95,
        reasoning: 'Test mapping'
      };

      mockOpenAIInstance.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockResponse) } }]
      } as any);

      (prisma.workflowMapping.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (prisma.workflowMapping.createMany as jest.Mock).mockResolvedValue({ count: 1 });

      const request = {
        projectKey: 'TEST',
        statusNames: ['In Development']
      };

      const result = await service.generateAndSaveMappings(123, request);

      expect(result).toEqual(mockResponse);
      expect(prisma.workflowMapping.createMany).toHaveBeenCalled();
    });
  });
});