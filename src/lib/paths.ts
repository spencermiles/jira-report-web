/**
 * Centralized path definitions for the application
 * Use these constants when constructing URLs/routes
 */

export const paths = {
  home: '/',
  projects: '/',
  project: (projectKey: string) => {
    // Ensure proper URL encoding for project keys
    const encodedKey = encodeURIComponent(projectKey);
    return `/project/${encodedKey}`;
  },
  dashboard: '/dashboard',
  reports: '/reports', 
  settings: '/settings',
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
  },
  api: {
    reports: '/api/reports',
    auth: '/api/auth',
  },
} as const;

export type AppPath = typeof paths; 