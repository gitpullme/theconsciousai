/**
 * Script to assign a hospital to an admin user
 */
const { PrismaClient } = require('./src/generated/prisma');

// Create a new Prisma client
const prisma = new PrismaClient();

// Replace these values with your actual admin email and hospital ID
const ADMIN_EMAIL = "admin@example.com"; // IMPORTANT: Replace with your actual admin email before running!
const HOSPITAL_ID = "cma9d0pqs000s4uq8ch9xedss"; // Matrixx Hospital in Haldwani

async function main() {
  if (!ADMIN_EMAIL || !HOSPITAL_ID) {
    console.error("Please set ADMIN_EMAIL and HOSPITAL_ID before running this script");
    return;
  }

  try {
    console.log(`Looking for admin user with email: ${ADMIN_EMAIL}`);
    
    // Find the admin user
    const user = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
    });

    if (!user) {
      console.error(`User with email ${ADMIN_EMAIL} not found.`);
      return;
    }

    if (user.role !== "ADMIN") {
      console.error(`User with email ${ADMIN_EMAIL} is not an admin (role: ${user.role}).`);
      return;
    }

    console.log(`Found admin user: ${user.name} (${user.id})`);
    
    // Verify hospital exists
    const hospital = await prisma.hospital.findUnique({
      where: { id: HOSPITAL_ID },
    });

    if (!hospital) {
      console.error(`Hospital with ID ${HOSPITAL_ID} not found.`);
      return;
    }

    console.log(`Found hospital: ${hospital.name} (${hospital.id})`);

    // Update the user with the hospital ID
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { hospital: HOSPITAL_ID },
    });

    console.log(`✅ Successfully assigned hospital ${hospital.name} (${hospital.id}) to admin user ${updatedUser.name} (${updatedUser.id}).`);
    
    // Get list of all hospitals for reference
    const hospitals = await prisma.hospital.findMany({
      select: {
        id: true,
        name: true,
        state: true,
        city: true,
      },
      orderBy: { name: 'asc' },
    });
    
    console.log("\nAvailable hospitals:");
    hospitals.forEach((h, index) => {
      console.log(`${index + 1}. ${h.name} (${h.city}, ${h.state}) - ID: ${h.id}`);
    });
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 