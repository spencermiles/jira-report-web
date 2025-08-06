// Test file for JIRA upload data transformation logic
// Tests the issue type extraction from various data formats

describe('JIRA Upload Data Transformation', () => {
  // This mimics the transformation logic from use-jira-upload.ts line 256
  const extractIssueType = (issue: any) => {
    return issue.fields?.issuetype?.name || issue.issue_type || issue.issueType || issue.type || 'Unknown';
  };

  describe('Issue Type Extraction', () => {
    it('should correctly extract issue_type from snake_case format', () => {
      const issue = {
        "id": "38267",
        "key": "HR360M-1767",
        "summary": "Marketing Outreach | Test Task", 
        "issue_type": "Task", // Snake case format - this is the user's actual data format
        "status": "Done",
        "priority": "Medium"
      };

      const result = extractIssueType(issue);
      expect(result).toBe('Task');
    });

    it('should handle standard JIRA API format with fields structure', () => {
      const issue = {
        "id": "1",
        "key": "PROJ-1", 
        "fields": {
          "issuetype": { "name": "Epic" },
          "project": { "key": "PROJ", "name": "Test Project" }
        }
      };

      const result = extractIssueType(issue);
      expect(result).toBe('Epic');
    });

    it('should handle camelCase issueType field', () => {
      const issue = {
        "id": "3",
        "key": "PROJ-3",
        "issueType": "Story" // CamelCase format
      };

      const result = extractIssueType(issue);
      expect(result).toBe('Story');
    });

    it('should handle alternative type field', () => {
      const issue = {
        "id": "4", 
        "key": "PROJ-4",
        "type": "Bug" // Alternative field name
      };

      const result = extractIssueType(issue);
      expect(result).toBe('Bug');
    });

    it('should default to Unknown when no issue type field is found', () => {
      const issue = {
        "id": "5",
        "key": "PROJ-5",
        "summary": "Missing type field"
        // No issue type field at all
      };

      const result = extractIssueType(issue);
      expect(result).toBe('Unknown');
    });

    it('should prioritize fields.issuetype.name over other formats', () => {
      const issue = {
        "fields": {
          "issuetype": { "name": "Epic" }
        },
        "issue_type": "Task", // Should not be used
        "issueType": "Story", // Should not be used
        "type": "Bug" // Should not be used
      };

      const result = extractIssueType(issue);
      expect(result).toBe('Epic');
    });

    it('should prioritize snake_case over camelCase when both exist', () => {
      const issue = {
        "issue_type": "Task", // Should be used (second priority)
        "issueType": "Story", // Should not be used
        "type": "Bug" // Should not be used
      };

      const result = extractIssueType(issue);
      expect(result).toBe('Task');
    });

    it('should handle all user data scenarios correctly', () => {
      // Test cases based on the user's actual data format
      const userDataCases = [
        {
          "id": "38267",
          "key": "HR360M-1767", 
          "issue_type": "Task",
          "expected": "Task"
        },
        {
          "id": "38254",
          "key": "INT-1589",
          "issue_type": "Bug", 
          "expected": "Bug"
        },
        {
          "id": "38210",
          "key": "HR360M-1761",
          "issue_type": "Story",
          "expected": "Story"
        }
      ];

      userDataCases.forEach(testCase => {
        const result = extractIssueType(testCase);
        expect(result).toBe(testCase.expected);
      });
    });
  });

  describe('Fallback Priority Order', () => {
    it('should follow correct priority order for issue type extraction', () => {
      // Priority: fields.issuetype.name > issue_type > issueType > type > 'Unknown'
      
      // Test case 1: Only snake_case exists
      expect(extractIssueType({ issue_type: 'Task' })).toBe('Task');
      
      // Test case 2: Both snake_case and camelCase exist
      expect(extractIssueType({ 
        issue_type: 'Task', 
        issueType: 'Story' 
      })).toBe('Task');
      
      // Test case 3: snake_case, camelCase, and type exist
      expect(extractIssueType({
        issue_type: 'Task',
        issueType: 'Story', 
        type: 'Bug'
      })).toBe('Task');
      
      // Test case 4: Only camelCase exists
      expect(extractIssueType({ issueType: 'Story' })).toBe('Story');
      
      // Test case 5: Only type exists
      expect(extractIssueType({ type: 'Bug' })).toBe('Bug');
      
      // Test case 6: Fields structure takes highest priority
      expect(extractIssueType({
        fields: { issuetype: { name: 'Epic' } },
        issue_type: 'Task',
        issueType: 'Story',
        type: 'Bug'
      })).toBe('Epic');
    });
  });
});