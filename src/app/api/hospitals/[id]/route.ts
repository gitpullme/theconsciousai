import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const hospitalId = params.id;
  
  console.log("Fetching hospital with ID:", hospitalId);
  
  try {
    const hospital = await prisma.hospital.findUnique({
      where: { id: hospitalId },
    });

    if (!hospital) {
      console.log("Hospital not found for ID:", hospitalId);
      return NextResponse.json(
        { error: "Hospital not found" },
        { status: 404 }
      );
    }

    console.log("Hospital found:", hospital);
    return NextResponse.json(hospital);
  } catch (error) {
    console.error("Error fetching hospital details:", error);
    return NextResponse.json(
      { error: "Failed to fetch hospital details" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const hospitalId = params.id;
  const session = await getServerSession(authOptions);

  // Check authentication
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is a hospital admin or admin
  if (session.user.role !== "HOSPITAL" && session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only hospital administrators or admins can update hospital details" },
      { status: 403 }
    );
  }

  // Check if admin is authorized for this hospital (skip this check for ADMIN role)
  if (session.user.role === "HOSPITAL" && session.user.hospital !== hospitalId) {
    return NextResponse.json(
      { error: "You are not authorized to update this hospital" },
      { status: 403 }
    );
  }

  try {
    const data = await request.json();
    const { name, state, city, address } = data;

    // Basic validation
    if (!name || !state) {
      return NextResponse.json(
        { error: "Hospital name and state are required" },
        { status: 400 }
      );
    }

    // Update hospital
    const updatedHospital = await prisma.hospital.update({
      where: { id: hospitalId },
      data: {
        name,
        state,
        city,
        address,
      },
    });

    return NextResponse.json(updatedHospital);
  } catch (error) {
    console.error("Error updating hospital details:", error);
    return NextResponse.json(
      { error: "Failed to update hospital details" },
      { status: 500 }
    );
  }
} 