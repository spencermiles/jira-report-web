import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface AccordionHeaderProps {
  title: string;
  icon?: React.ReactNode;
  isOpen: boolean;
  onClick: () => void;
  activeCount?: number;
}

const AccordionHeader: React.FC<AccordionHeaderProps> = ({ 
  title, 
  icon, 
  isOpen, 
  onClick, 
  activeCount = 0 
}) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between py-3 px-0 text-left hover:bg-gray-100 rounded-md transition-colors"
  >
    <div className="flex items-center space-x-2">
      {icon}
      <span className="font-medium text-gray-700 text-sm">{title}</span>
      {activeCount > 0 && (
        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">
          {activeCount}
        </span>
      )}
    </div>
    {isOpen ? (
      <ChevronDown className="h-4 w-4 text-gray-500" />
    ) : (
      <ChevronRight className="h-4 w-4 text-gray-500" />
    )}
  </button>
);

interface FilterCount {
  value: string | number | 'none';
  count: number;
}

interface AccordionState {
  createdDate: boolean;
  resolvedDate: boolean;
  issueType: boolean;
  sprint: boolean;
  storyPoints: boolean;
  status: boolean;
  projectKey: boolean;
}

interface FilterSidebarProps {
  // Filter state
  filters: {
    issueTypes: string[];
    sprints: string[];
    storyPoints: (number | 'none')[];
    statuses: string[];
    projectKeys: string[];
    createdStartDate: string;
    createdEndDate: string;
    resolvedStartDate: string;
    resolvedEndDate: string;
  };
  
  // Accordion state
  accordionStates: AccordionState;
  
  // Filter counts
  filterCounts: {
    issueTypeCounts: FilterCount[];
    sprintCounts: FilterCount[];
    storyPointCounts: FilterCount[];
    statusCounts: FilterCount[];
    projectKeyCounts: FilterCount[];
  };
  
  // Filter actions
  toggleIssueType: (issueType: string) => void;
  toggleSprint: (sprint: string) => void;
  toggleStoryPoint: (points: number | 'none') => void;
  toggleStatus: (status: string) => void;
  toggleProjectKey: (projectKey: string) => void;
  setCreatedStartDate: (date: string) => void;
  setCreatedEndDate: (date: string) => void;
  setResolvedStartDate: (date: string) => void;
  setResolvedEndDate: (date: string) => void;
  clearAllFilters: () => void;
  toggleAccordion: (section: keyof AccordionState) => void;
  
  // Data
  filteredStoriesCount: number;
  totalStoriesCount: number;
  hasActiveFilters: boolean;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  accordionStates,
  filterCounts,
  toggleIssueType,
  toggleSprint,
  toggleStoryPoint,
  toggleStatus,
  toggleProjectKey,
  setCreatedStartDate,
  setCreatedEndDate,
  setResolvedStartDate,
  setResolvedEndDate,
  clearAllFilters,
  toggleAccordion,
  filteredStoriesCount,
  totalStoriesCount,
  hasActiveFilters
}) => {
  const { issueTypeCounts, sprintCounts, storyPointCounts, statusCounts, projectKeyCounts } = filterCounts;

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 space-y-4 overflow-y-auto h-screen sticky top-0" style={{ minWidth: '256px' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-xs text-blue-600 hover:text-blue-800 underline font-medium"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Created Date Range Filter */}
      <div>
        <AccordionHeader
          title="Created Date"
          isOpen={accordionStates.createdDate}
          onClick={() => toggleAccordion('createdDate')}
          activeCount={filters.createdStartDate || filters.createdEndDate ? 1 : 0}
        />
        {accordionStates.createdDate && (
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
              <input
                type="date"
                value={filters.createdStartDate}
                onChange={(e) => setCreatedStartDate(e.target.value)}
                className="w-full text-sm font-medium text-gray-900 border border-gray-300 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                style={{ colorScheme: 'light' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
              <input
                type="date"
                value={filters.createdEndDate}
                onChange={(e) => setCreatedEndDate(e.target.value)}
                className="w-full text-sm font-medium text-gray-900 border border-gray-300 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                style={{ colorScheme: 'light' }}
              />
            </div>
            {(filters.createdStartDate || filters.createdEndDate) && (
              <button
                onClick={() => {
                  setCreatedStartDate('');
                  setCreatedEndDate('');
                }}
                className="text-sm text-gray-500 hover:text-gray-700 underline font-medium"
              >
                Clear created dates
              </button>
            )}
          </div>
        )}
      </div>

      {/* Resolved Date Range Filter */}
      <div>
        <AccordionHeader
          title="Resolved Date"
          isOpen={accordionStates.resolvedDate}
          onClick={() => toggleAccordion('resolvedDate')}
          activeCount={filters.resolvedStartDate || filters.resolvedEndDate ? 1 : 0}
        />
        {accordionStates.resolvedDate && (
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
              <input
                type="date"
                value={filters.resolvedStartDate}
                onChange={(e) => setResolvedStartDate(e.target.value)}
                className="w-full text-sm font-medium text-gray-900 border border-gray-300 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                style={{ colorScheme: 'light' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
              <input
                type="date"
                value={filters.resolvedEndDate}
                onChange={(e) => setResolvedEndDate(e.target.value)}
                className="w-full text-sm font-medium text-gray-900 border border-gray-300 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                style={{ colorScheme: 'light' }}
              />
            </div>
            {(filters.resolvedStartDate || filters.resolvedEndDate) && (
              <button
                onClick={() => {
                  setResolvedStartDate('');
                  setResolvedEndDate('');
                }}
                className="text-sm text-gray-500 hover:text-gray-700 underline font-medium"
              >
                Clear resolved dates
              </button>
            )}
          </div>
        )}
      </div>

      {/* Issue Type Filter */}
      <div>
        <AccordionHeader
          title="Issue Type"
          isOpen={accordionStates.issueType}
          onClick={() => toggleAccordion('issueType')}
          activeCount={filters.issueTypes.length}
        />
        {accordionStates.issueType && (
          <div className="mt-3 space-y-2">
            {issueTypeCounts.map(({ value, count }) => (
              <label key={value} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                <input
                  type="checkbox"
                  checked={filters.issueTypes.includes(value as string)}
                  onChange={() => toggleIssueType(value as string)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 flex-1">{value}</span>
                <span className="text-xs text-gray-500">({count})</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Sprint Filter */}
      <div>
        <AccordionHeader
          title="Sprint"
          isOpen={accordionStates.sprint}
          onClick={() => toggleAccordion('sprint')}
          activeCount={filters.sprints.length}
        />
        {accordionStates.sprint && (
          <div className="mt-3 space-y-2">
            {sprintCounts.map(({ value, count }) => (
              <label key={value} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                <input
                  type="checkbox"
                  checked={filters.sprints.includes(value as string)}
                  onChange={() => toggleSprint(value as string)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 flex-1 truncate" title={value as string}>{value}</span>
                <span className="text-xs text-gray-500">({count})</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Story Points Filter */}
      <div>
        <AccordionHeader
          title="Story Points"
          isOpen={accordionStates.storyPoints}
          onClick={() => toggleAccordion('storyPoints')}
          activeCount={filters.storyPoints.length}
        />
        {accordionStates.storyPoints && (
          <div className="mt-3 space-y-2">
            {storyPointCounts.map(({ value, count }) => (
              <label key={value} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                <input
                  type="checkbox"
                  checked={filters.storyPoints.includes(value as number | 'none')}
                  onChange={() => toggleStoryPoint(value as number | 'none')}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 flex-1">
                  {value === 'none' ? 'No Points' : `${value} points`}
                </span>
                <span className="text-xs text-gray-500">({count})</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Status Filter */}
      <div>
        <AccordionHeader
          title="Status"
          isOpen={accordionStates.status}
          onClick={() => toggleAccordion('status')}
          activeCount={filters.statuses.length}
        />
        {accordionStates.status && (
          <div className="mt-3 space-y-2">
            {statusCounts.map(({ value, count }) => (
              <label key={value} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                <input
                  type="checkbox"
                  checked={filters.statuses.includes(value as string)}
                  onChange={() => toggleStatus(value as string)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 flex-1">
                  {value === 'resolved' ? 'Resolved' : 'Unresolved'}
                </span>
                <span className="text-xs text-gray-500">({count})</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Project Key Filter */}
      <div>
        <AccordionHeader
          title="Project Key"
          isOpen={accordionStates.projectKey}
          onClick={() => toggleAccordion('projectKey')}
          activeCount={filters.projectKeys.length}
        />
        {accordionStates.projectKey && (
          <div className="mt-3 space-y-2">
            {projectKeyCounts.map(({ value, count }) => (
              <label key={value} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                <input
                  type="checkbox"
                  checked={filters.projectKeys.includes(value as string)}
                  onChange={() => toggleProjectKey(value as string)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 flex-1">{value}</span>
                <span className="text-xs text-gray-500">({count})</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="pt-4 border-t border-gray-200">
          <h4 className="font-medium text-gray-700 text-sm mb-2">Active Filters</h4>
          <div className="text-xs text-gray-600">
            <div>Filtered: {filteredStoriesCount}</div>
            <div>Total: {totalStoriesCount}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterSidebar;