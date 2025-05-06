const { PrismaClient } = require('./src/generated/prisma');

// Initialize Prisma client with detailed logging
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
    { level: 'info', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
  ],
});

// Log all queries to help diagnose issues
prisma.$on('query', (e) => {
  console.log('Query: ' + e.query);
  console.log('Params: ' + e.params);
  console.log('Duration: ' + e.duration + 'ms');
  console.log('------------------------');
});

async function checkDatabasePermissions() {
  console.log('🔍 Checking database permissions and connectivity...');
  
  try {
    // First test: check schema access by counting users
    console.log('\n1. Testing schema access by counting users...');
    const userCount = await prisma.user.count();
    console.log(`✅ User table accessible, found ${userCount} users`);
    
    // Second test: check read access to Receipt table
    console.log('\n2. Testing read access to Receipt table...');
    const receiptCount = await prisma.receipt.count();
    console.log(`✅ Receipt table accessible, found ${receiptCount} receipts`);
    
    // Third test: check join access with Users, Hospitals, etc.
    console.log('\n3. Testing join access with related tables...');
    const receiptsWithRelations = await prisma.receipt.findMany({
      take: 1,
      include: {
        hospital: true,
        doctor: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });
    
    if (receiptsWithRelations.length > 0) {
      console.log(`✅ Successfully retrieved receipt with relations:`);
      console.log(`   - Receipt ID: ${receiptsWithRelations[0].id}`);
      console.log(`   - Hospital: ${receiptsWithRelations[0].hospital?.name || 'None'}`);
      console.log(`   - Doctor: ${receiptsWithRelations[0].doctor?.name || 'None'}`);
      console.log(`   - User: ${receiptsWithRelations[0].user?.name || 'Unknown'}`);
    } else {
      console.log(`⚠️ No receipts found with relations`);
    }
    
    // Fourth test: check session table access (if using db sessions)
    console.log('\n4. Testing Session table access...');
    const sessionCount = await prisma.session.count();
    console.log(`✅ Session table accessible, found ${sessionCount} sessions`);
    
    console.log('\n✅ All database permission checks passed successfully!');
  } catch (error) {
    console.error('❌ Database permission check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the permission check
checkDatabasePermissions(); 