const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();

async function seedDoctors() {
  console.log('Seeding doctors...');
  
  // Get all hospitals
  const hospitals = await prisma.hospital.findMany();
  
  // Specialties with doctor names
  const specialties = [
    { specialty: 'Cardiology', doctors: ['Dr. James Wilson', 'Dr. Emily Chen'] },
    { specialty: 'Neurology', doctors: ['Dr. Sarah Johnson', 'Dr. Michael Lee'] },
    { specialty: 'Orthopedics', doctors: ['Dr. David Smith', 'Dr. Laura Kim'] },
    { specialty: 'Pediatrics', doctors: ['Dr. Jessica Brown', 'Dr. Robert Taylor'] },
    { specialty: 'Dermatology', doctors: ['Dr. Angela Martinez', 'Dr. Thomas Wong'] },
    { specialty: 'Ophthalmology', doctors: ['Dr. Lisa Park', 'Dr. Daniel Garcia'] },
    { specialty: 'Psychiatry', doctors: ['Dr. Kevin Miller', 'Dr. Rachel Cohen'] },
    { specialty: 'General Medicine', doctors: ['Dr. John Davis', 'Dr. Amanda Williams'] },
    { specialty: 'Emergency Medicine', doctors: ['Dr. Christopher Rodriguez', 'Dr. Jennifer White'] }
  ];
  
  // For each hospital, create doctors with different specialties
  for (const hospital of hospitals) {
    console.log(`Adding doctors to hospital: ${hospital.name}`);
    
    // Add all specialties to each hospital
    for (const specialtyData of specialties) {
      for (const doctorName of specialtyData.doctors) {
        const existing = await prisma.doctor.findFirst({
          where: {
            name: doctorName,
            hospitalId: hospital.id
          }
        });
        
        if (!existing) {
          await prisma.doctor.create({
            data: {
              name: doctorName,
              specialty: specialtyData.specialty,
              hospitalId: hospital.id,
              available: true
            }
          });
          console.log(`Added ${doctorName} (${specialtyData.specialty}) to ${hospital.name}`);
        } else {
          console.log(`Doctor ${doctorName} already exists at ${hospital.name}`);
        }
      }
    }
  }
  
  console.log('Doctor seeding complete!');
}

async function main() {
  try {
    await seedDoctors();
  } catch (error) {
    console.error('Error seeding the database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 