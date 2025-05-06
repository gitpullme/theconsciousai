import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Common medical specialties to create doctors for - reduced to minimize DB operations
const COMMON_SPECIALTIES = [
  "General Medicine",
  "Cardiology", 
  "Pediatrics",
  "Emergency Medicine"
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, hospitalName, address, state, city, pincode } = body;

    // Basic validation
    if (!name || !email || !password || !hospitalName || !address || !state || !city || !pincode) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if user with email already exists - simple query
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true } // Only select the ID for faster query
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Email already in use" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      // Use a transaction to ensure data consistency and improve performance
      return await prisma.$transaction(async (tx) => {
        // Create hospital
        const hospital = await tx.hospital.create({
          data: {
            name: hospitalName,
            address: `${address}, ${pincode}`,
            state,
            city,
          },
        });
        
        // Create user and account in a single transaction
        const user = await tx.user.create({
          data: {
            name,
            email,
            role: "HOSPITAL",
            state: state,
            hospital: hospital.id,
            // Create account inline with user for faster creation
            accounts: {
              create: {
                type: "credentials",
                provider: "credentials",
                providerAccountId: email,
                refresh_token: hashedPassword,
              }
            }
          },
          // Only include necessary fields in the response
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        });

        // Batch create doctors in a single operation
        const doctorsData = COMMON_SPECIALTIES.map(specialty => ({
          name: `Dr. ${generateDoctorName()} (${specialty})`,
          specialty,
          hospitalId: hospital.id,
          available: true
        }));
        
        await tx.doctor.createMany({
          data: doctorsData
        });

        return NextResponse.json({
          message: "Hospital registered successfully",
          user,
          hospital: {
            id: hospital.id,
            name: hospital.name
          },
          doctorsCount: COMMON_SPECIALTIES.length
        });
      }, {
        timeout: 10000 // 10 second timeout for the transaction
      });
    } catch (dbError) {
      console.error("Database operation failed:", dbError);
      return NextResponse.json(
        { 
          message: "Failed to create hospital account in database",
          error: dbError instanceof Error ? dbError.message : String(dbError),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Hospital registration error:", error);
    return NextResponse.json(
      { 
        message: "Error registering hospital",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Helper function to generate random doctor names
function generateDoctorName() {
  const firstNames = ["James", "John", "Robert", "Michael", "Sarah", "Karen", "Lisa", "Mary"];
  const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis"];
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  
  return `${firstName} ${lastName}`;
}