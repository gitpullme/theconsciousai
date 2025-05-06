/**
 * Optimized Prisma Client Singleton
 * 
 * This module creates a performant singleton instance of the Prisma Client
 * with proper connection pooling for PostgreSQL/Supabase.
 */

import { PrismaClient } from '../generated/prisma';

// Connection configuration
const TRANSACTION_TIMEOUT = 10000; // Reduced from 15s to 10s for faster timeout detection
const QUERY_ENGINE_CONFIG = {
  poolSize: 10, // Increased connection pool size
  connection_limit: 20, // Maximum number of connections
  query_timeout: 8000, // Query timeout in ms
  idle_timeout: 30000, // How long a connection can remain idle before being closed
};

/**
 * Create an optimized PrismaClient instance with proper connection handling
 */
const createPrismaClient = () => {
  console.log('Initializing optimized Prisma client...');

  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['error', 'warn'] 
      : ['error'],
    
    // Set extended timeout for transactions
    transactionOptions: {
      maxWait: TRANSACTION_TIMEOUT,
      timeout: TRANSACTION_TIMEOUT,
    },
    
    // Additional performance config
    __internal: {
      engine: {
        // These configs help optimize connection pool and query performance
        queryEngineConfig: QUERY_ENGINE_CONFIG,
      }
    }
  });

  // Add event listeners for connection issues and performance tracking
  prisma.$on('query', (e) => {
    // Log slow queries in all environments
    if (e.duration > 500) { // Log queries that take more than 500ms
      console.warn(`Slow query detected (${e.duration}ms): ${e.query}`);
    }
    
    // Debug logging in development
    if (process.env.NODE_ENV === 'development' && process.env.DEBUG_PRISMA === 'true') {
      console.log('Query: ' + e.query);
      console.log('Duration: ' + e.duration + 'ms');
    }
  });

  // Connection error handler
  prisma.$on('error', (e) => {
    console.error('Prisma Client Error:', e.message);
  });

  // Graceful shutdown handler with timeout
  const cleanup = async () => {
    console.log('Shutting down Prisma client...');
    const timeoutPromise = new Promise(resolve => setTimeout(resolve, 5000));
    try {
      await Promise.race([prisma.$disconnect(), timeoutPromise]);
    } catch (e) {
      console.error('Error during Prisma client shutdown:', e);
    }
  };

  // Register cleanup handlers
  process.on('beforeExit', cleanup);
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  return prisma;
};

// Create global instance with connection management
const globalForPrisma = globalThis as unknown as { 
  prisma: PrismaClient | undefined 
};

// Export the Prisma singleton
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma; 