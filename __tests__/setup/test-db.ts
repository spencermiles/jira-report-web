import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function setupTestDatabase() {
  // Clear all tables in reverse dependency order to avoid foreign key constraints
  await prisma.$transaction([
    prisma.statusChange.deleteMany(),
    prisma.issuesSprints.deleteMany(),
    prisma.issue.deleteMany(),
    prisma.sprint.deleteMany(),
    prisma.workflowMapping.deleteMany(),
    prisma.project.deleteMany(),
  ]);
}

export async function teardownTestDatabase() {
  await setupTestDatabase(); // Same cleanup
  await prisma.$disconnect();
}

export { prisma };