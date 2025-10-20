import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { join } from 'path';

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST || 'postgresql://username:password@localhost:5432/acord_intake_test_db';
  
  // Initialize test database
  try {
    execSync('npx prisma migrate reset --force', { 
      stdio: 'inherit',
      cwd: join(__dirname, '..')
    });
  } catch (error) {
    console.warn('Database reset failed, continuing with tests:', (error as Error).message);
  }
});

// Global test teardown
afterAll(async () => {
  // Clean up test database
  try {
    const prisma = new PrismaClient();
    await prisma.$disconnect();
  } catch (error) {
    console.warn('Database cleanup failed:', (error as Error).message);
  }
});

// Increase timeout for database operations
jest.setTimeout(30000);
