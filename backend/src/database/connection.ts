import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';

let prisma: PrismaClient;

declare global {
  var __prisma: PrismaClient | undefined;
}

export async function connectDatabase(): Promise<void> {
  try {
    if (process.env.NODE_ENV === 'production') {
      prisma = new PrismaClient({
        log: ['error'],
        errorFormat: 'minimal',
      });
    } else {
      // In development, use a global variable to prevent multiple instances
      if (!global.__prisma) {
        global.__prisma = new PrismaClient({
          log: ['query', 'info', 'warn', 'error'],
          errorFormat: 'pretty',
        });
      }
      prisma = global.__prisma;
    }

    await prisma.$connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
}

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  return prisma;
}

export async function disconnectDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    logger.info('Database disconnected');
  }
}

// Database health check
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
}

// Transaction helper
export async function withTransaction<T>(
  callback: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return await prisma.$transaction(callback);
}

export default prisma;

