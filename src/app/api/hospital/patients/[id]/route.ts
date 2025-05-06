import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  // Check if user is authenticated and has hospital role
  if (!session || session.user.role !== "HOSPITAL") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  try {
    // Make sure the hospital ID is available
    if (!session.user.hospital) {
      return NextResponse.json(
        { error: "Hospital ID not found for this administrator" },
        { status: 403 }
      );
    }

    // Fetch the patient profile
    const patient = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        state: true,
        dateOfBirth: true,
        gender: true,
        phone: true,
        address: true,
      },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Make sure this is a patient account
    if (patient.role !== "USER") {
      return NextResponse.json(
        { error: "Requested ID is not a patient account" },
        { status: 403 }
      );
    }

    return NextResponse.json(patient);
  } catch (error) {
    console.error("Error fetching patient profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch patient profile" },
      { status: 500 }
    );
  }
} 