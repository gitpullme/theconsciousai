import { prisma } from '@/lib/prisma';

// List of Indian states
export const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry'
];

// Initialize states in the database
export async function initializeStates() {
  try {
    const existingStates = await prisma.state.findMany();
    
    if (existingStates.length < indianStates.length) {
      const statePromises = indianStates.map((stateName) => 
        prisma.state.upsert({
          where: { name: stateName },
          update: {},
          create: { name: stateName }
        })
      );
      
      await Promise.all(statePromises);
      console.log("States initialized in database");
    }
  } catch (error) {
    console.error("Error initializing states:", error);
  }
}

// Get all states
export async function getStates() {
  return prisma.state.findMany({
    orderBy: { name: 'asc' }
  });
}

// Get hospitals by state
export async function getHospitalsByState(state: string) {
  return prisma.hospital.findMany({
    where: { state },
    orderBy: { name: 'asc' }
  });
}

// Add a new hospital
export async function addHospital(data: { name: string; state: string; city?: string; address?: string }) {
  return prisma.hospital.create({
    data
  });
}

// Get hospital by ID
export async function getHospitalById(id: string) {
  return prisma.hospital.findUnique({
    where: { id }
  });
} 