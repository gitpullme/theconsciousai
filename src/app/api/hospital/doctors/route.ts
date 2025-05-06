import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "HOSPITAL" && session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only hospital administrators and admins can view doctors" },
      { status: 403 }
    );
  }

  try {
    // First, we need to find the hospital associated with this admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { hospital: true }
    });

    if (!user?.hospital) {
      return NextResponse.json(
        { error: "Hospital not found for this administrator" },
        { status: 404 }
      );
    }

    // Get all doctors for this hospital and their patient counts
    const doctors = await prisma.doctor.findMany({
      where: { 
        hospitalId: user.hospital 
      },
      orderBy: { 
        specialty: 'asc' 
      }
    });
    
    // Get patient counts for each doctor
    const patientCounts = await prisma.receipt.groupBy({
      by: ['doctorId'],
      where: {
        hospitalId: user.hospital,
        status: 'QUEUED',
        doctorId: {
          not: null
        }
      },
      _count: {
        id: true
      }
    });
    
    // Create a map of doctor ID to patient count
    const patientCountMap: Record<string, number> = {};
    patientCounts.forEach(item => {
      if (item.doctorId) {
        patientCountMap[item.doctorId] = item._count.id;
      }
    });
    
    // Combine the data
    const result = doctors.map(doctor => ({
      ...doctor,
      patientCount: patientCountMap[doctor.id] || 0,
      // Set availability based on patient count (could be customized)
      available: (patientCountMap[doctor.id] || 0) < 5
    }));

    // Sort doctors by patient count in descending order
    result.sort((a, b) => b.patientCount - a.patientCount);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching doctors:", error);
    return NextResponse.json(
      { error: "Failed to fetch hospital doctors" },
      { status: 500 }
    );
  }
} 