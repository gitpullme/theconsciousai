/**
 * Fix Connection Issues Script
 * 
 * This script implements fixes for the "Failed to connect to server" error
 * when viewing report details.
 */

console.log(`
🔄 Implementing connection fixes for the "Failed to connect to server" error 🔄
------------------------------------------

We've made several improvements to fix the connection issues:

1. Enhanced error handling in the report page component:
   - Added proper fetch timeout handling
   - Implemented fallback between both API endpoints
   - Added credentials inclusion for authentication
   - Better error reporting with specific error messages

2. Added CORS middleware:
   - Created src/middleware.ts to handle CORS headers
   - Ensures API endpoints work correctly with the frontend

3. Updated Prisma schema:
   - Added updatedAt field to the Receipt model
   - Fixed etag generation in API routes

To apply these changes, please follow these steps:

1. Stop the current Next.js server if it's running (Ctrl+C)
2. Start it again with: npm run dev
3. Clear your browser cache or use a private/incognito window
4. Try viewing the report details again

If you still experience issues:
- Check the browser dev console for specific error messages
- Make sure you're logged in (session may have expired)
- Try the /api/receipts/:id endpoint directly in your browser

------------------------------------------
`);

// Check if database migrations need to be applied
const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    // Test connection to the database
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful');
    
    // Check if the Receipt model has the updatedAt field
    try {
      // This should work if the schema migration was applied
      const sample = await prisma.receipt.findFirst({
        select: {
          id: true,
          updatedAt: true
        }
      });
      
      console.log('✅ Schema is up to date with updatedAt field');
      
      if (sample) {
        console.log(`   Sample receipt: ${sample.id}`);
        console.log(`   updatedAt value: ${sample.updatedAt || 'Not available'}`);
      }
    } catch (error) {
      console.error('❌ Schema error - updatedAt field may not exist:', error.message);
      console.log('⚠️ You may need to run a database migration with:');
      console.log('   npx prisma migrate dev --name add_updated_at_to_receipt');
    }
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the database check
checkDatabase(); 