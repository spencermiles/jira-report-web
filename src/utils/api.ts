import { ApiResponse } from '@/types';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: Response
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);
    
    if (!response.ok) {
      throw new ApiError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        response
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(
      error instanceof Error ? error.message : 'An unknown error occurred',
      0
    );
  }
}

export const api = {
  get: <T = unknown>(url: string, options?: RequestInit) =>
    apiRequest<T>(url, { method: 'GET', ...options }),
  
  post: <T = unknown>(url: string, data?: unknown, options?: RequestInit) =>
    apiRequest<T>(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    }),
  
  put: <T = unknown>(url: string, data?: unknown, options?: RequestInit) =>
    apiRequest<T>(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    }),
  
  delete: <T = unknown>(url: string, options?: RequestInit) =>
    apiRequest<T>(url, { method: 'DELETE', ...options }),
}; 