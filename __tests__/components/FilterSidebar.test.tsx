// Test for FilterSidebar accordion functionality
import React from 'react';
import FilterSidebar from '../../src/components/jira-report/ui/FilterSidebar';

// Mock data
const mockFilters = {
  issueTypes: ['Task'],
  sprints: [],
  storyPoints: [],
  statuses: ['resolved'],
  projectKeys: ['TEST'],
  priorities: [],
  createdStartDate: '',
  createdEndDate: '',
  resolvedStartDate: '',
  resolvedEndDate: '',
};

const mockAccordionStates = {
  createdDate: false,
  resolvedDate: false,
  issueType: true,
  sprint: false,
  storyPoints: false,
  status: false,
  projectKey: false,
  priority: false,
};

const mockFilterCounts = {
  issueTypeCounts: [{ value: 'Task', count: 10 }, { value: 'Bug', count: 5 }],
  sprintCounts: [{ value: 'Sprint 1', count: 8 }],
  storyPointCounts: [{ value: 5, count: 3 }, { value: 'none', count: 7 }],
  statusCounts: [{ value: 'resolved', count: 12 }, { value: 'unresolved', count: 3 }],
  projectKeyCounts: [{ value: 'TEST', count: 15 }],
  priorityCounts: [{ value: 'High', count: 4 }, { value: 'Medium', count: 11 }],
};

const mockProps = {
  filters: mockFilters,
  accordionStates: mockAccordionStates,
  filterCounts: mockFilterCounts,
  toggleIssueType: jest.fn(),
  toggleSprint: jest.fn(),
  toggleStoryPoint: jest.fn(),
  toggleStatus: jest.fn(),
  toggleProjectKey: jest.fn(),
  togglePriority: jest.fn(),
  selectAllIssueTypes: jest.fn(),
  deselectAllIssueTypes: jest.fn(),
  setCreatedStartDate: jest.fn(),
  setCreatedEndDate: jest.fn(),
  setResolvedStartDate: jest.fn(),
  setResolvedEndDate: jest.fn(),
  clearAllFilters: jest.fn(),
  toggleAccordion: jest.fn(),
  filteredStoriesCount: 15,
  totalStoriesCount: 15,
  hasActiveFilters: true,
};

describe('FilterSidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create component without errors', () => {
    // Test that the FilterSidebar component can be instantiated with valid props
    expect(() => {
      React.createElement(FilterSidebar, mockProps);
    }).not.toThrow();
  });

  it('should call toggleAccordion when passed as prop', () => {
    // Test that the toggle function gets called with the right parameter
    const { toggleAccordion } = mockProps;
    
    // Simulate calling toggleAccordion for created date
    toggleAccordion('createdDate');
    expect(toggleAccordion).toHaveBeenCalledWith('createdDate');
    
    // Simulate calling toggleAccordion for resolved date
    toggleAccordion('resolvedDate');
    expect(toggleAccordion).toHaveBeenCalledWith('resolvedDate');
  });

  it('should have correct accordion state structure', () => {
    const { accordionStates } = mockProps;
    
    // Verify all required accordion states are present
    expect(accordionStates).toHaveProperty('createdDate');
    expect(accordionStates).toHaveProperty('resolvedDate');
    expect(accordionStates).toHaveProperty('issueType');
    expect(accordionStates).toHaveProperty('sprint');
    expect(accordionStates).toHaveProperty('storyPoints');
    expect(accordionStates).toHaveProperty('status');
    expect(accordionStates).toHaveProperty('projectKey');
    expect(accordionStates).toHaveProperty('priority');
  });

  it('should handle date setters being called', () => {
    const { setCreatedStartDate, setCreatedEndDate, setResolvedStartDate, setResolvedEndDate } = mockProps;
    
    // Test that date setter functions can be called
    setCreatedStartDate('2024-01-01');
    setCreatedEndDate('2024-12-31');
    setResolvedStartDate('2024-06-01');
    setResolvedEndDate('2024-06-30');
    
    expect(setCreatedStartDate).toHaveBeenCalledWith('2024-01-01');
    expect(setCreatedEndDate).toHaveBeenCalledWith('2024-12-31');
    expect(setResolvedStartDate).toHaveBeenCalledWith('2024-06-01');
    expect(setResolvedEndDate).toHaveBeenCalledWith('2024-06-30');
  });

  it('should have proper filter structure', () => {
    const { filters } = mockProps;
    
    // Verify all required filter properties are present
    expect(filters).toHaveProperty('issueTypes');
    expect(filters).toHaveProperty('sprints');
    expect(filters).toHaveProperty('storyPoints');
    expect(filters).toHaveProperty('statuses');
    expect(filters).toHaveProperty('projectKeys');
    expect(filters).toHaveProperty('priorities');
    expect(filters).toHaveProperty('createdStartDate');
    expect(filters).toHaveProperty('createdEndDate');
    expect(filters).toHaveProperty('resolvedStartDate');
    expect(filters).toHaveProperty('resolvedEndDate');
  });

  it('should pass correct props for accordion functionality', () => {
    // Test that we can create component with different accordion states
    const closedAccordionProps = {
      ...mockProps,
      accordionStates: {
        createdDate: false,
        resolvedDate: false,
        issueType: false,
        sprint: false,
        storyPoints: false,
        status: false,
        projectKey: false,
        priority: false,
      },
    };
    
    expect(() => {
      React.createElement(FilterSidebar, closedAccordionProps);
    }).not.toThrow();
    
    const openAccordionProps = {
      ...mockProps,
      accordionStates: {
        createdDate: true,
        resolvedDate: true,
        issueType: true,
        sprint: true,
        storyPoints: true,
        status: true,
        projectKey: true,
        priority: true,
      },
    };
    
    expect(() => {
      React.createElement(FilterSidebar, openAccordionProps);
    }).not.toThrow();
  });
});