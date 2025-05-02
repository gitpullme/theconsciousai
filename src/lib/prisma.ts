// Import the generated Prisma client directly from the generated directory
import { PrismaClient } from '../generated/prisma';
import { withAccelerate } from '@prisma/extension-accelerate';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

// Create a single instance of Prisma Client
const prismaClientSingleton = () => {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    console.log('Initializing Prisma Client with DATABASE_URL:', databaseUrl?.substring(0, 20) + '...');

    // Create a new PrismaClient instance with explicit log levels
    const client = new PrismaClient({
      log: ['query', 'error', 'warn'],
    });
    
    // Only use Accelerate extension if DATABASE_URL starts with postgres:// or postgresql://
    if (databaseUrl && /^postgres(ql)?:\/\/accelerate\.prisma-data\.net/.test(databaseUrl)) {
      console.log('Using Prisma Accelerate extension');
      try {
        return client.$extends(withAccelerate());
      } catch (accelerateError) {
        console.error('Failed to extend with Accelerate, using basic client:', accelerateError);
        return client;
      }
    } else {
      console.log('Using regular Prisma client without Accelerate');
      return client;
    }
  } catch (error) {
    console.error('Failed to initialize Prisma client:', error);
    throw error; // Rethrow to make startup failures visible
  }
};

// Create a global variable to store the Prisma Client instance
type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

// Export the Prisma Client singleton instance
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

// Also export as default for compatibility with "import prisma from '@/lib/prisma'"
export default prisma;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma; 