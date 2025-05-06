// Simplified PrismaClient singleton with improved connection retry logic
import { PrismaClient } from '../generated/prisma';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
//
// Learn more:
// https://pris.ly/d/help/next-js-best-practices

// Prevent multiple instances of Prisma Client in development
const globalAny: any = global;

// Configure retry mechanism with increased values
const MAX_RETRIES = 7; // Increased from 5 to 7
const RETRY_DELAY_MS = 2000; // Increased from 1500ms to 2000ms

// Log connection details at startup for debugging
console.log('Database connection info:');
console.log('- DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 70) + '...');
console.log('- DIRECT_URL:', process.env.DIRECT_URL?.substring(0, 70) + '...');

// Function to create a new PrismaClient with enhanced retry logic
function createPrismaClient() {
  const client = new PrismaClient({
    log: [
      { level: 'error', emit: 'stdout' },
      { level: 'warn', emit: 'stdout' },
      { level: 'info', emit: 'stdout' }, // Added info level for more verbose logging
    ],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  // Add middleware to handle connection errors with improved retry logic
  client.$use(async (params, next) => {
    let retries = 0;
    let lastError = null;

    while (retries < MAX_RETRIES) {
      try {
        // Attempt to execute the query
        return await next(params);
      } catch (error: any) {
        lastError = error;
        
        // Enhanced error handling with more connection error codes
        if (
          error.code === 'P1001' || // Can't reach database server
          error.code === 'P1002' || // Database connection timed out
          error.code === 'P1017' || // Server closed the connection
          error.code === 'P1008' || // Operations timed out
          error.code === 'P1011' || // Error opening a transaction
          error.code === 'P1012' || // Missing required field
          error.code === 'P1013' || // The provided database string is invalid
          error.code === 'P1014' || // Underlying resource error
          error.code === 'P1015'    // Your Prisma schema is using features that are not supported by the version of the database
        ) {
          console.warn(`Database connection error (attempt ${retries + 1}/${MAX_RETRIES}):`, {
            code: error.code,
            message: error.message,
            action: params.action,
            model: params.model
          });
          
          retries++;
          
          // Exponential backoff for retry delays with some randomization
          const jitter = Math.random() * 500; // Random jitter between 0-500ms
          const backoffDelay = RETRY_DELAY_MS * Math.pow(1.5, retries - 1) + jitter;
          console.log(`Retrying in ${Math.round(backoffDelay)}ms...`);
          
          // Wait before retrying with exponential backoff
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
          continue;
        }
        
        // For other errors, throw immediately
        console.error(`Non-connection Prisma error:`, {
          code: error.code,
          message: error.message,
          action: params.action,
          model: params.model
        });
        throw error;
      }
    }
    
    // All retries failed
    console.error(`All database connection attempts failed after ${MAX_RETRIES} retries:`, {
      error: lastError,
      code: lastError?.code,
      message: lastError?.message,
      action: params.action,
      model: params.model
    });
    throw lastError;
  });

  return client;
}

// Ensure PrismaClient is only instantiated once per server
export const prisma = globalAny.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalAny.prisma = prisma;
}

// Initialize a test connection to check if the database is accessible
(async () => {
  if (process.env.NODE_ENV !== 'test') { // Skip in test environment
    try {
      // Test the connection by running a simple query
      console.log('Testing database connection...');
      const result = await prisma.$queryRaw`SELECT 1 as connection_test`;
      console.log('✅ Database connection successful:', result);
    } catch (error: any) {
      console.error('❌ Database connection failed:', {
        code: error?.code,
        message: error?.message,
        meta: error?.meta
      });
      console.error('Please check your database credentials and ensure the database is running.');
    }
  }
})();

export default prisma;