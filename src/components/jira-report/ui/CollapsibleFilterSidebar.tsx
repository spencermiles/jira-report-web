'use client';

import React, { useState } from 'react';
import { Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import FilterSidebar from './FilterSidebar';

interface CollapsibleFilterSidebarProps {
  // All the same props as FilterSidebar
  filters: {
    issueTypes: string[];
    sprints: string[];
    storyPoints: (number | 'none')[];
    statuses: string[];
    priorities: string[];
    createdStartDate: string;
    createdEndDate: string;
    resolvedStartDate: string;
    resolvedEndDate: string;
  };
  
  accordionStates: {
    createdDate: boolean;
    resolvedDate: boolean;
    issueType: boolean;
    sprint: boolean;
    storyPoints: boolean;
    status: boolean;
    priority: boolean;
  };
  
  filterCounts: {
    issueTypeCounts: Array<{ value: string | number | 'none'; count: number }>;
    sprintCounts: Array<{ value: string | number | 'none'; count: number }>;
    storyPointCounts: Array<{ value: string | number | 'none'; count: number }>;
    statusCounts: Array<{ value: string | number | 'none'; count: number }>;
    priorityCounts: Array<{ value: string | number | 'none'; count: number }>;
  };
  
  toggleIssueType: (issueType: string) => void;
  toggleSprint: (sprint: string) => void;
  toggleStoryPoint: (points: number | 'none') => void;
  toggleStatus: (status: string) => void;
  togglePriority: (priority: string) => void;
  selectAllIssueTypes: () => void;
  deselectAllIssueTypes: () => void;
  setCreatedStartDate: (date: string) => void;
  setCreatedEndDate: (date: string) => void;
  setResolvedStartDate: (date: string) => void;
  setResolvedEndDate: (date: string) => void;
  clearAllFilters: () => void;
  toggleAccordion: (section: keyof CollapsibleFilterSidebarProps['accordionStates']) => void;
  
  filteredStoriesCount: number;
  totalStoriesCount: number;
  hasActiveFilters: boolean;
  
  // New prop for collapse state callback
  onDesktopCollapseChange?: (collapsed: boolean) => void;
}

export const CollapsibleFilterSidebar: React.FC<CollapsibleFilterSidebarProps> = (props) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  // Notify parent when desktop collapse state changes
  const handleDesktopCollapseChange = (collapsed: boolean) => {
    setDesktopCollapsed(collapsed);
    props.onDesktopCollapseChange?.(collapsed);
  };

  // Count active filters for badge
  const activeFilterCount = [
    props.filters.issueTypes?.length || 0,
    props.filters.priorities?.length || 0,
    props.filters.statuses?.length || 0,
    props.filters.sprints?.length || 0,
    props.filters.storyPoints?.length || 0,
    props.filters.createdStartDate ? 1 : 0,
    props.filters.createdEndDate ? 1 : 0,
    props.filters.resolvedStartDate ? 1 : 0,
    props.filters.resolvedEndDate ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <>
      {/* Desktop: Fixed overlay sidebar */}
      <div className="hidden lg:block">
        {/* Toggle button - always visible */}
        <div className="fixed left-4 top-4 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDesktopCollapseChange(!desktopCollapsed)}
            className="bg-white shadow-md"
          >
            {desktopCollapsed ? (
              <>
                <ChevronRight className="h-4 w-4 mr-2" />
                Filters
                {props.hasActiveFilters && (
                  <span className="ml-2 bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">
                    {activeFilterCount}
                  </span>
                )}
              </>
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Hide
              </>
            )}
          </Button>
        </div>
        
        {/* Sidebar overlay */}
        {!desktopCollapsed && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/20 z-40"
              onClick={() => handleDesktopCollapseChange(true)}
            />
            {/* Sidebar */}
            <div className="fixed left-0 top-0 z-50 h-screen">
              <FilterSidebar 
                {...props} 
                className="w-64 bg-white shadow-xl h-full p-4 space-y-4 overflow-y-auto border-r border-gray-200"
              />
            </div>
          </>
        )}
      </div>

      {/* Mobile/Tablet: Sheet-based collapsible sidebar */}
      <div className="lg:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="fixed top-4 left-4 z-50 bg-white shadow-md"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {props.hasActiveFilters && (
                <span className="ml-2 bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            <SheetHeader className="p-4 border-b">
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>
                Filter your issues by type, priority, status and more
              </SheetDescription>
            </SheetHeader>
            <div className="overflow-y-auto h-[calc(100vh-120px)]">
              <FilterSidebar 
                {...props} 
                className="p-4 space-y-4"
                showHeader={false}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
};

export default CollapsibleFilterSidebar;