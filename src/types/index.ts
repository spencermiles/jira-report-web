// Global type definitions

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Time period types for chart grouping
export type TimePeriod = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly';

export interface TimePeriodOption {
  value: TimePeriod;
  label: string;
  shortLabel: string;
} 