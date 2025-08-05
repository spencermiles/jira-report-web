import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function setupTestDatabase() {
  // Clear all tables in reverse dependency order to avoid foreign key constraints
  await prisma.statusChange.deleteMany();
  await prisma.issuesSprints.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.sprint.deleteMany();
  await prisma.workflowMapping.deleteMany();
  await prisma.project.deleteMany();
}

export async function teardownTestDatabase() {
  await setupTestDatabase(); // Same cleanup
  await prisma.$disconnect();
}

export { prisma };