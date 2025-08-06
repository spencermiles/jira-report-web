import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetDatabase() {
  console.log('Dropping views...');
  
  try {
    // Drop views first (they depend on tables)
    await prisma.$executeRaw`DROP VIEW IF EXISTS project_summary CASCADE`;
    await prisma.$executeRaw`DROP VIEW IF EXISTS issue_metrics CASCADE`;
    
    console.log('Views dropped successfully');
  } catch (error) {
    console.error('Error dropping views:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabase().catch(console.error);