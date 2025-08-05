import { GraphQLError } from 'graphql';

// Custom error types for better error handling
export class DatabaseError extends GraphQLError {
  constructor(message: string, originalError?: Error) {
    super(message, {
      extensions: {
        code: 'DATABASE_ERROR',
        originalError: originalError?.message
      }
    });
  }
}

export class ValidationError extends GraphQLError {
  constructor(message: string, field?: string) {
    super(message, {
      extensions: {
        code: 'VALIDATION_ERROR',
        field
      }
    });
  }
}

export class NotFoundError extends GraphQLError {
  constructor(resource: string, identifier: string) {
    super(`${resource} with identifier ${identifier} not found`, {
      extensions: {
        code: 'NOT_FOUND',
        resource,
        identifier
      }
    });
  }
}

export class UnauthorizedError extends GraphQLError {
  constructor(message: string = 'Unauthorized') {
    super(message, {
      extensions: {
        code: 'UNAUTHORIZED'
      }
    });
  }
}

export class RateLimitError extends GraphQLError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, {
      extensions: {
        code: 'RATE_LIMIT_EXCEEDED'
      }
    });
  }
}

// Logging utility
export class Logger {
  private static formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
  }

  static info(message: string, meta?: any) {
    console.log(this.formatMessage('info', message, meta));
  }

  static warn(message: string, meta?: any) {
    console.warn(this.formatMessage('warn', message, meta));
  }

  static error(message: string, error?: Error, meta?: any) {
    const errorMeta = {
      ...meta,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : undefined
    };
    console.error(this.formatMessage('error', message, errorMeta));
  }

  static debug(message: string, meta?: any) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }

  static query(operation: string, duration: number, meta?: any) {
    this.debug(`GraphQL ${operation}`, {
      duration: `${duration}ms`,
      ...meta
    });
  }
}

// Error handling wrapper for resolvers
export function withErrorHandling<T extends any[], R>(
  resolver: (...args: T) => Promise<R>,
  operationName: string
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    
    try {
      Logger.debug(`Starting ${operationName}`, { 
        args: args.length > 1 ? args[1] : undefined // Log arguments (skip parent)
      });
      
      const result = await resolver(...args);
      const duration = Date.now() - startTime;
      
      Logger.query(operationName, duration);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log the error with context
      Logger.error(`Error in ${operationName}`, error as Error, {
        duration: `${duration}ms`,
        args: args.length > 1 ? args[1] : undefined
      });
      
      // Transform database errors to GraphQL errors
      if (error instanceof Error) {
        // Prisma errors
        if (error.message.includes('Prisma')) {
          throw new DatabaseError(`Database operation failed in ${operationName}`, error);
        }
        
        // Timeout errors
        if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
          throw new DatabaseError('Database query timeout', error);
        }
        
        // Connection errors
        if (error.message.includes('connection') || error.message.includes('ECONNREFUSED')) {
          throw new DatabaseError('Database connection failed', error);
        }
      }
      
      // Re-throw GraphQL errors as-is
      if (error instanceof GraphQLError) {
        throw error;
      }
      
      // Wrap unknown errors
      throw new GraphQLError(`Internal error in ${operationName}`, {
        extensions: {
          code: 'INTERNAL_ERROR',
          originalError: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  };
}

// Validation helpers
export function validatePagination(pagination?: { limit?: number; offset?: number }) {
  const { limit = 50, offset = 0 } = pagination || {};
  
  if (limit < 1 || limit > 1000) {
    throw new ValidationError('Limit must be between 1 and 1000', 'limit');
  }
  
  if (offset < 0) {
    throw new ValidationError('Offset must be non-negative', 'offset');
  }
  
  return { limit, offset };
}

export function validateProjectKeys(projectKeys?: string[]) {
  if (projectKeys && projectKeys.length > 100) {
    throw new ValidationError('Too many project keys (max 100)', 'projectKeys');
  }
  
  if (projectKeys) {
    const invalidKeys = projectKeys.filter(key => !key || key.length > 50);
    if (invalidKeys.length > 0) {
      throw new ValidationError('Invalid project keys found', 'projectKeys');
    }
  }
  
  return projectKeys;
}

export function validateDateRange(startDate?: string, endDate?: string) {
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new ValidationError('Invalid date format', 'dateRange');
    }
    
    if (start > end) {
      throw new ValidationError('Start date must be before end date', 'dateRange');
    }
    
    // Prevent overly large date ranges (more than 5 years)
    const maxRange = 5 * 365 * 24 * 60 * 60 * 1000; // 5 years in milliseconds
    if (end.getTime() - start.getTime() > maxRange) {
      throw new ValidationError('Date range too large (max 5 years)', 'dateRange');
    }
  }
  
  return { startDate, endDate };
}

// Performance monitoring
export class PerformanceMonitor {
  private static slowQueryThreshold = 1000; // 1 second
  private static queries: Array<{ operation: string; duration: number; timestamp: Date }> = [];
  
  static recordQuery(operation: string, duration: number) {
    this.queries.push({
      operation,
      duration,
      timestamp: new Date()
    });
    
    // Keep only last 1000 queries
    if (this.queries.length > 1000) {
      this.queries = this.queries.slice(-1000);
    }
    
    // Log slow queries
    if (duration > this.slowQueryThreshold) {
      Logger.warn(`Slow query detected: ${operation}`, { duration: `${duration}ms` });
    }
  }
  
  static getStats() {
    if (this.queries.length === 0) return null;
    
    const durations = this.queries.map(q => q.duration);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const max = Math.max(...durations);
    const min = Math.min(...durations);
    
    return {
      totalQueries: this.queries.length,
      averageDuration: Math.round(avg * 100) / 100,
      maxDuration: max,
      minDuration: min,
      slowQueries: this.queries.filter(q => q.duration > this.slowQueryThreshold).length
    };
  }
}

// Rate limiting (simple in-memory implementation)
export class RateLimiter {
  private static requests = new Map<string, { count: number; resetTime: number }>();
  private static maxRequests = 1000; // per hour
  private static windowMs = 60 * 60 * 1000; // 1 hour
  
  static checkLimit(identifier: string): boolean {
    const now = Date.now();
    const record = this.requests.get(identifier);
    
    if (!record || now > record.resetTime) {
      this.requests.set(identifier, { count: 1, resetTime: now + this.windowMs });
      return true;
    }
    
    if (record.count >= this.maxRequests) {
      Logger.warn(`Rate limit exceeded for ${identifier}`, { count: record.count });
      return false;
    }
    
    record.count++;
    return true;
  }
  
  static cleanup() {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

// Cleanup old rate limit records every hour
setInterval(() => RateLimiter.cleanup(), 60 * 60 * 1000);