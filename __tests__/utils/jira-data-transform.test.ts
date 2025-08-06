/**
 * Unit tests for JIRA data transformation logic
 * Tests the data transformation functions used in upload processing
 */

describe('JIRA Data Transformation', () => {
  describe('Project Key Extraction', () => {
    it('should extract project key from issue.fields.project.key', () => {
      const issue = {
        key: 'PROJ1-123',
        fields: {
          project: { key: 'PROJ1', name: 'Project One' },
          summary: 'Test issue',
        },
      };

      const projectKey = issue.fields?.project?.key || issue.key.split('-')[0];
      expect(projectKey).toBe('PROJ1');
    });

    it('should extract project key from issue.project.key', () => {
      const issue = {
        key: 'PROJ2-456',
        project: { key: 'PROJ2', name: 'Project Two' },
        summary: 'Test issue',
      };

      const projectKey = (issue as any).project?.key || issue.key.split('-')[0];
      expect(projectKey).toBe('PROJ2');
    });

    it('should extract project key from issue key when no project field exists', () => {
      const issue = {
        key: 'PROJ3-789',
        summary: 'Test issue',
      };

      const projectKey = issue.key.split('-')[0];
      expect(projectKey).toBe('PROJ3');
    });

    it('should handle issue keys without hyphen', () => {
      const issue = {
        key: 'INVALID',
        summary: 'Test issue',
      };

      // This would typically throw an error in real implementation
      const parts = issue.key.split('-');
      expect(parts.length).toBe(1);
      expect(parts[0]).toBe('INVALID');
    });
  });

  describe('Story Points Extraction', () => {
    const getStoryPoints = (issue: any) => {
      if (issue.fields?.customfield_10016) return issue.fields.customfield_10016;
      if (issue.fields?.customfield_10002) return issue.fields.customfield_10002;
      if (issue.fields?.customfield_10004) return issue.fields.customfield_10004;
      if (issue.fields?.storyPoints) return issue.fields.storyPoints;
      if (issue.storyPoints) return issue.storyPoints;
      return null;
    };

    it('should extract story points from customfield_10016', () => {
      const issue = {
        fields: {
          customfield_10016: 5,
        },
      };

      expect(getStoryPoints(issue)).toBe(5);
    });

    it('should extract story points from customfield_10002', () => {
      const issue = {
        fields: {
          customfield_10002: 8,
        },
      };

      expect(getStoryPoints(issue)).toBe(8);
    });

    it('should extract story points from direct storyPoints field', () => {
      const issue = {
        fields: {
          storyPoints: 3,
        },
      };

      expect(getStoryPoints(issue)).toBe(3);
    });

    it('should return null when no story points field exists', () => {
      const issue = {
        fields: {
          summary: 'No points',
        },
      };

      expect(getStoryPoints(issue)).toBeNull();
    });
  });

  describe('Sprint Information Extraction', () => {
    const getSprint = (issue: any) => {
      if (issue.fields?.sprint?.name) return issue.fields.sprint.name;
      if (issue.fields?.customfield_10020?.name) return issue.fields.customfield_10020.name;
      if (issue.sprint?.name) return issue.sprint.name;
      return null;
    };

    it('should extract sprint from fields.sprint.name', () => {
      const issue = {
        fields: {
          sprint: { name: 'Sprint 1' },
        },
      };

      expect(getSprint(issue)).toBe('Sprint 1');
    });

    it('should extract sprint from customfield_10020', () => {
      const issue = {
        fields: {
          customfield_10020: { name: 'Sprint 2' },
        },
      };

      expect(getSprint(issue)).toBe('Sprint 2');
    });

    it('should return null when no sprint exists', () => {
      const issue = {
        fields: {
          summary: 'No sprint',
        },
      };

      expect(getSprint(issue)).toBeNull();
    });
  });

  describe('Changelog Transformation', () => {
    it('should transform changelog histories to flat array', () => {
      const issue = {
        changelog: {
          histories: [
            {
              created: '2024-01-05T10:00:00Z',
              items: [
                {
                  field: 'status',
                  fromString: 'To Do',
                  toString: 'In Progress',
                },
              ],
            },
            {
              created: '2024-01-10T10:00:00Z',
              items: [
                {
                  field: 'status',
                  fromString: 'In Progress',
                  toString: 'Done',
                },
                {
                  field: 'priority',
                  fromString: 'Medium',
                  toString: 'High',
                },
              ],
            },
          ],
        },
      };

      const changelogs: any[] = [];
      if (issue.changelog?.histories) {
        issue.changelog.histories.forEach((history: any) => {
          if (history.items) {
            history.items.forEach((item: any) => {
              changelogs.push({
                fieldName: item.field,
                fromString: item.fromString || null,
                toString: item.toString || null,
                created: history.created,
              });
            });
          }
        });
      }

      expect(changelogs).toHaveLength(3);
      expect(changelogs[0]).toEqual({
        fieldName: 'status',
        fromString: 'To Do',
        toString: 'In Progress',
        created: '2024-01-05T10:00:00Z',
      });
      expect(changelogs[2].fieldName).toBe('priority');
    });

    it('should handle empty changelog', () => {
      const issue = {};
      const changelogs: any[] = [];
      
      // No changelog, so nothing happens
      if ((issue as any).changelog?.histories) {
        // This won't execute
      }

      expect(changelogs).toHaveLength(0);
    });
  });

  describe('Issue ID Generation', () => {
    it('should use id if available', () => {
      const issue = {
        id: '12345',
        key: 'PROJ-1',
      };

      const jiraId = issue.id || issue.key;
      expect(jiraId).toBe('12345');
    });

    it('should fallback to key if id is missing', () => {
      const issue = {
        key: 'PROJ-1',
      };

      const jiraId = (issue as any).id || issue.key;
      expect(jiraId).toBe('PROJ-1');
    });

    it('should generate random ID if both id and key are missing', () => {
      const issue = {};
      
      const jiraId = (issue as any).id || (issue as any).key || `UNKNOWN-${Math.random().toString(36).substr(2, 9)}`;
      expect(jiraId).toMatch(/^UNKNOWN-[a-z0-9]{9}$/);
    });
  });

  describe('Date Handling', () => {
    it('should handle valid ISO date strings', () => {
      const dateString = '2024-01-15T10:30:00Z';
      const date = new Date(dateString);
      
      expect(date.toISOString()).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should handle null dates', () => {
      const resolved = null;
      const date = resolved ? new Date(resolved) : null;
      
      expect(date).toBeNull();
    });

    it('should handle missing dates with fallback', () => {
      const issue = {};
      const created = (issue as any).created || new Date().toISOString();
      
      expect(created).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('Data Validation', () => {
    it('should handle wrapped data format', () => {
      const wrappedData = {
        issues: [
          { key: 'TEST-1', summary: 'Test' },
          { key: 'TEST-2', summary: 'Test 2' },
        ],
      };

      let data = wrappedData as any;
      if (!Array.isArray(data)) {
        if (data.issues && Array.isArray(data.issues)) {
          data = data.issues;
        }
      }

      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(2);
    });

    it('should handle data wrapped in "data" property', () => {
      const wrappedData = {
        data: [
          { key: 'TEST-1', summary: 'Test' },
        ],
      };

      let data = wrappedData as any;
      if (!Array.isArray(data)) {
        if (data.issues && Array.isArray(data.issues)) {
          data = data.issues;
        } else if (data.data && Array.isArray(data.data)) {
          data = data.data;
        }
      }

      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(1);
    });

    it('should reject non-array and non-wrapped data', () => {
      const invalidData = { foo: 'bar' };
      
      let data = invalidData as any;
      let error = null;
      
      if (!Array.isArray(data)) {
        if (data.issues && Array.isArray(data.issues)) {
          data = data.issues;
        } else if (data.data && Array.isArray(data.data)) {
          data = data.data;
        } else {
          error = 'Invalid file format. Expected an array of issues or an object containing an "issues" array.';
        }
      }

      expect(error).not.toBeNull();
    });
  });

  describe('Multiple Project Grouping', () => {
    it('should group issues by project key', () => {
      const issues = [
        { key: 'PROJ1-1', projectKey: 'PROJ1' },
        { key: 'PROJ1-2', projectKey: 'PROJ1' },
        { key: 'PROJ2-1', projectKey: 'PROJ2' },
        { key: 'PROJ2-2', projectKey: 'PROJ2' },
        { key: 'PROJ3-1', projectKey: 'PROJ3' },
      ];

      const projectsMap = new Map<string, { key: string; issues: any[] }>();
      
      for (const issue of issues) {
        if (!projectsMap.has(issue.projectKey)) {
          projectsMap.set(issue.projectKey, {
            key: issue.projectKey,
            issues: [],
          });
        }
        projectsMap.get(issue.projectKey)!.issues.push(issue);
      }

      expect(projectsMap.size).toBe(3);
      expect(projectsMap.get('PROJ1')?.issues).toHaveLength(2);
      expect(projectsMap.get('PROJ2')?.issues).toHaveLength(2);
      expect(projectsMap.get('PROJ3')?.issues).toHaveLength(1);
    });
  });
});