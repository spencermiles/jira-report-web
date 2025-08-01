// Debug utility for persistent logging across page reloads
const DEBUG_KEY = 'jira-debug-log';

export const debugLog = (message: string, data?: unknown) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    message,
    data: data ? JSON.stringify(data) : undefined,
    url: typeof window !== 'undefined' ? window.location.href : 'server'
  };
  
  // Console log for immediate debugging
  console.log(`[DEBUG] ${message}`, data);
  
  // Persist to localStorage
  if (typeof window !== 'undefined') {
    try {
      const existingLogs = JSON.parse(localStorage.getItem(DEBUG_KEY) || '[]');
      existingLogs.push(logEntry);
      // Keep only last 20 entries
      const recentLogs = existingLogs.slice(-20);
      localStorage.setItem(DEBUG_KEY, JSON.stringify(recentLogs));
    } catch (error) {
      console.error('Failed to save debug log:', error);
    }
  }
};

export const getDebugLogs = () => {
  if (typeof window !== 'undefined') {
    try {
      return JSON.parse(localStorage.getItem(DEBUG_KEY) || '[]');
    } catch (error) {
      console.error('Failed to load debug logs:', error);
      return [];
    }
  }
  return [];
};

export const clearDebugLogs = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(DEBUG_KEY);
  }
};