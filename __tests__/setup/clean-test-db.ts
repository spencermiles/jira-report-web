import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log('Cleaning test database...');
  
  try {
    // Clear all tables in reverse dependency order
    // Don't touch the views - they should remain as created by migrations
    await prisma.$transaction([
      prisma.statusChange.deleteMany(),
      prisma.issuesSprints.deleteMany(),
      prisma.issue.deleteMany(),
      prisma.sprint.deleteMany(),
      prisma.workflowMapping.deleteMany(),
      prisma.project.deleteMany(),
    ]);
    
    console.log('Database cleaned successfully');
  } catch (error) {
    console.error('Error cleaning database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  cleanDatabase().catch(console.error);
}

export { cleanDatabase };