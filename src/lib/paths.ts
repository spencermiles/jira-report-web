/**
 * Centralized path definitions for the application
 * Use these constants when constructing URLs/routes
 */

export const paths = {
  home: '/',
  
  // Multi-tenant company routes
  companies: '/companies',
  company: (slug: string) => {
    const encodedSlug = encodeURIComponent(slug);
    return `/company/${encodedSlug}`;
  },
  companyProject: (companySlug: string, projectKey: string) => {
    const encodedSlug = encodeURIComponent(companySlug);
    const encodedKey = encodeURIComponent(projectKey);
    return `/company/${encodedSlug}/project/${encodedKey}`;
  },
  
  // Legacy routes (redirects)
  projects: '/companies', // Redirect to companies list
  project: (projectKey: string) => {
    // Legacy route - will need company context to redirect properly
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
    graphql: '/api/graphql',
  },
} as const;

export type AppPath = typeof paths; 