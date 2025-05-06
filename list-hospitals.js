/**
 * Script to list all hospitals in the system
 */
const { PrismaClient } = require('./src/generated/prisma');

// Create a new Prisma client
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Fetching all hospitals...");
    
    // Get all hospitals
    const hospitals = await prisma.hospital.findMany({
      select: {
        id: true,
        name: true,
        state: true,
        city: true,
        address: true,
        // Count doctors for each hospital
        doctors: {
          select: {
            id: true,
          },
        },
      },
      orderBy: [
        { state: 'asc' },
        { name: 'asc' }
      ],
    });

    if (hospitals.length === 0) {
      console.log("No hospitals found in the database.");
      return;
    }

    console.log(`Found ${hospitals.length} hospitals:\n`);
    
    // Group hospitals by state
    const hospitalsByState = {};
    hospitals.forEach(hospital => {
      if (!hospitalsByState[hospital.state]) {
        hospitalsByState[hospital.state] = [];
      }
      hospitalsByState[hospital.state].push(hospital);
    });
    
    // Print hospitals grouped by state
    Object.keys(hospitalsByState).sort().forEach(state => {
      console.log(`\n--- ${state} (${hospitalsByState[state].length} hospitals) ---`);
      
      hospitalsByState[state].forEach((hospital, index) => {
        const doctorCount = hospital.doctors.length;
        console.log(`${index + 1}. ${hospital.name} (${hospital.city || 'N/A'}) - ID: ${hospital.id}`);
        console.log(`   Doctors: ${doctorCount}, Address: ${hospital.address || 'N/A'}`);
      });
    });
    
    console.log("\n--- Instructions ---");
    console.log("To assign a hospital to an admin user, edit the assign-hospital.js file:");
    console.log("1. Set ADMIN_EMAIL to the admin's email address");
    console.log("2. Set HOSPITAL_ID to the desired hospital ID from the list above");
    console.log("3. Run 'node assign-hospital.js'");
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 