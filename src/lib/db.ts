import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// Vercel-optimized Prisma client with connection pooling
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create log directory if it doesn't exist
const logDir = path.join(process.cwd(), 'log');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'stdout',
      level: 'error',
    },
    {
      emit: 'stdout',
      level: 'warn',
    },
  ],
});

// Log SQL queries to file in development
if (process.env.NODE_ENV === 'development') {
  const sqlLogPath = path.join(logDir, 'sql.log');
  
  prisma.$on('query', (e) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] Query: ${e.query}\nParams: ${e.params}\nDuration: ${e.duration}ms\n\n`;
    
    fs.appendFile(sqlLogPath, logEntry, (err) => {
      if (err) console.error('Failed to write to SQL log:', err);
    });
  });
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Canonical stages enum for workflow mapping
export enum CanonicalStage {
  BACKLOG = 'BACKLOG',
  READY_FOR_GROOMING = 'READY_FOR_GROOMING',
  READY_FOR_DEV = 'READY_FOR_DEV',
  IN_PROGRESS = 'IN_PROGRESS',
  IN_REVIEW = 'IN_REVIEW',
  IN_QA = 'IN_QA', 
  READY_FOR_RELEASE = 'READY_FOR_RELEASE',
  DONE = 'DONE',
  BLOCKED = 'BLOCKED'
}