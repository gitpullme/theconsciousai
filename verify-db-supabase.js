// Test script to verify Supabase database connection
const { PrismaClient } = require('./src/generated/prisma');

// Explicitly set environment variables
process.env.DATABASE_URL = "postgresql://postgres.fqnkpvsmezumndmyncmi:dikshant%2395@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true";
process.env.DIRECT_URL = "postgresql://postgres.fqnkpvsmezumndmyncmi:dikshant%2395@aws-0-us-east-2.pooler.supabase.com:5432/postgres";

async function main() {
  // Create Prisma client with verbose logging
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

  try {
    console.log('Testing Supabase database connection...');
    console.log('Using DATABASE_URL:', process.env.DATABASE_URL);
    console.log('Using DIRECT_URL:', process.env.DIRECT_URL);
    
    // First try to execute a simple query
    const result = await prisma.$queryRaw`SELECT current_database(), current_schema()`;
    console.log('Database connection successful!');
    console.log('Current database and schema:', result);
    
    // Check if User table exists
    try {
      console.log('Checking if User table exists...');
      const tableCheck = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'User'
        ) as exists
      `;
      console.log('User table check result:', tableCheck);
      
      if (!tableCheck[0].exists) {
        console.log('User table does not exist. Running introspection to see available tables...');
        const tables = await prisma.$queryRaw`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
        `;
        console.log('Available tables:', tables);
      }
    } catch (tableError) {
      console.error('Error checking for User table:', tableError);
    }
    
    // Attempt to create a test user
    try {
      console.log('Attempting to create a test user...');
      const user = await prisma.user.create({
        data: {
          name: 'Test User',
          email: 'test-' + Date.now() + '@example.com',
          role: 'USER',
        },
      });
      console.log('Test user created successfully:', user);
    } catch (createError) {
      console.error('Error creating test user:', createError);
    }
    
  } catch (error) {
    console.error('Database connection error:', error);
  } finally {
    await prisma.$disconnect();
    console.log('Prisma client disconnected');
  }
}

main(); 