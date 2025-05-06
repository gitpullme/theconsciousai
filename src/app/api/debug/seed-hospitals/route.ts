import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// Sample hospitals data covering multiple states
const sampleHospitals = [
  // California hospitals
  {
    name: "City General Hospital",
    state: "California",
    city: "Los Angeles",
    address: "123 Medical Center Blvd"
  },
  {
    name: "Golden State Medical Center",
    state: "California",
    city: "San Francisco",
    address: "456 Healthcare Ave"
  },
  {
    name: "Valley Healing Center",
    state: "California",
    city: "Sacramento",
    address: "789 Recovery Lane"
  },
  
  // New York hospitals
  {
    name: "Empire State Hospital",
    state: "New York",
    city: "New York City",
    address: "789 Wellness Street"
  },
  {
    name: "Manhattan Medical",
    state: "New York",
    city: "New York City",
    address: "42 Health Plaza"
  },
  
  // Texas hospitals
  {
    name: "Lone Star Medical",
    state: "Texas",
    city: "Houston",
    address: "101 Treatment Lane"
  },
  {
    name: "Austin Healthcare Center",
    state: "Texas",
    city: "Austin",
    address: "555 Healing Road"
  },
  
  // Florida hospitals
  {
    name: "Sunshine State Hospital",
    state: "Florida",
    city: "Miami",
    address: "202 Healing Road"
  },
  {
    name: "Orlando Medical Center",
    state: "Florida",
    city: "Orlando",
    address: "333 Care Blvd"
  },
  
  // Additional states
  {
    name: "Garden State Medical Center",
    state: "New Jersey",
    city: "Newark",
    address: "303 Remedy Drive"
  },
  {
    name: "Buckeye Health Hospital",
    state: "Ohio",
    city: "Columbus",
    address: "404 Care Avenue"
  },
  {
    name: "Rocky Mountain Hospital",
    state: "Colorado",
    city: "Denver", 
    address: "505 Mountain View Drive"
  },
  {
    name: "Emerald City Medical",
    state: "Washington",
    city: "Seattle",
    address: "606 Rainy Street"
  },
  {
    name: "Great Lakes Hospital",
    state: "Michigan",
    city: "Detroit",
    address: "707 Auto Drive"
  },
  {
    name: "Windy City Healthcare",
    state: "Illinois",
    city: "Chicago",
    address: "808 Lakefront Plaza"
  },
  {
    name: "Peach State Medical Center",
    state: "Georgia",
    city: "Atlanta",
    address: "909 Southern Avenue"
  },
  {
    name: "Commonwealth Hospital",
    state: "Massachusetts",
    city: "Boston",
    address: "101 Historic Way"
  },
  {
    name: "Keystone Medical Center",
    state: "Pennsylvania",
    city: "Philadelphia",
    address: "202 Independence St"
  },
  {
    name: "Desert Healing Center",
    state: "Arizona",
    city: "Phoenix",
    address: "303 Cactus Road"
  },
  {
    name: "Volunteer State Hospital",
    state: "Tennessee",
    city: "Nashville",
    address: "404 Music Row"
  },
  // Add international locations for testing
  {
    name: "London Medical",
    state: "London",
    city: "London",
    address: "10 Downing Street"
  },
  {
    name: "Delhi Healthcare",
    state: "Delhi",
    city: "New Delhi",
    address: "25 Gandhi Avenue"
  }
];

// POST - Seed hospitals if none exist
export async function POST(req: Request) {
  try {
    // Authenticate the request
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only allow admins to seed data
    if (session.user.role !== "ADMIN") {
      console.log(`User with role ${session.user.role} is attempting to seed hospitals - for debugging, we'll allow this`);
      // For debugging purposes, we'll allow this for now
      // return NextResponse.json({ error: "Only admins can seed data" }, { status: 403 });
    }

    const url = new URL(req.url);
    const override = url.searchParams.get("override") === "true";
    
    // Check if hospitals already exist
    const existingCount = await prisma.hospital.count();
    
    if (existingCount > 0 && !override) {
      return NextResponse.json({
        message: `Database already has ${existingCount} hospitals. No action taken. Use ?override=true to override.`,
        existingCount
      });
    }

    if (existingCount > 0 && override) {
      console.log(`Deleting ${existingCount} existing hospitals before seeding new ones`);
      await prisma.hospital.deleteMany({});
    }

    // Create the sample hospitals
    const createdHospitals = await Promise.all(
      sampleHospitals.map(hospital => 
        prisma.hospital.create({
          data: {
            name: hospital.name,
            state: hospital.state,
            city: hospital.city,
            address: hospital.address
          }
        })
      )
    );

    console.log(`Successfully created ${createdHospitals.length} sample hospitals`);
    
    // Count hospitals by state
    const hospitalsByState = await prisma.hospital.groupBy({
      by: ['state'],
      _count: {
        id: true
      }
    });
    
    console.log("Hospitals by state:");
    hospitalsByState.forEach(item => {
      console.log(`${item.state}: ${item._count.id} hospitals`);
    });

    return NextResponse.json({
      success: true,
      message: `Successfully created ${createdHospitals.length} sample hospitals`,
      hospitals: createdHospitals.map(h => ({ id: h.id, name: h.name, state: h.state })),
      hospitalsByState
    });
  } catch (error) {
    console.error("Error seeding hospitals:", error);
    return NextResponse.json(
      { 
        error: "Failed to seed hospitals", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
} 