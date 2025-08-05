import { PrismaClient } from '@prisma/client';

// Vercel-optimized Prisma client with connection pooling
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

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