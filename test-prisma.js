// Test script to check if Prisma client initializes correctly
const { PrismaClient } = require('./src/generated/prisma');

async function main() {
  try {
    const prisma = new PrismaClient();
    console.log('Prisma client initialized successfully!');
    
    // Try a simple query
    const users = await prisma.user.findMany({ take: 5 });
    console.log(`Found ${users.length} users`);
    
    await prisma.$disconnect();
    console.log('Prisma client disconnected successfully!');
  } catch (error) {
    console.error('Error initializing Prisma client:', error);
  }
}

main(); 