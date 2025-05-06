const { PrismaClient } = require('./src/generated/prisma');

// Initialize Prisma client
const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Test receipt lookup by ID
async function testReceiptLookup(id) {
  console.log(`🔍 Testing receipt lookup for ID: ${id || 'unknown'}`);
  
  try {
    if (!id) {
      // If no ID provided, fetch all receipts (limited to 5)
      console.log('📊 Fetching up to 5 recent receipts:');
      const receipts = await prisma.receipt.findMany({
        take: 5,
        orderBy: { uploatedAt: 'desc' },
        select: { id: true, status: true, uploatedAt: true, userId: true }
      });
      
      if (receipts.length === 0) {
        console.log('❌ No receipts found in the database');
      } else {
        console.log(`✅ Found ${receipts.length} receipts:`);
        receipts.forEach(receipt => {
          console.log(`- ID: ${receipt.id}, Status: ${receipt.status}, User: ${receipt.userId}, Date: ${receipt.uploatedAt}`);
        });
      }
      return;
    }
    
    // Lookup specific receipt
    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: {
        hospital: true,
        doctor: {
          select: {
            id: true,
            name: true,
            specialty: true
          }
        }
      }
    });
    
    if (!receipt) {
      console.log(`❌ Receipt not found with ID: ${id}`);
      return;
    }
    
    console.log('✅ Receipt found:');
    console.log(`- ID: ${receipt.id}`);
    console.log(`- Status: ${receipt.status}`);
    console.log(`- User ID: ${receipt.userId}`);
    console.log(`- Uploaded: ${receipt.uploatedAt}`);
    console.log(`- Hospital: ${receipt.hospital ? receipt.hospital.name : 'None'}`);
    console.log(`- Doctor: ${receipt.doctor ? receipt.doctor.name : 'None'}`);
    
  } catch (error) {
    console.error('❌ Error fetching receipt:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get receipt ID from command line argument or run without ID
const receiptId = process.argv[2];
testReceiptLookup(receiptId); 