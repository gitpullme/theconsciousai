import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  console.log("Patient history API called for user ID:", params.id);
  
  const session = await getServerSession(authOptions);

  // Check if user is authenticated and has hospital role
  if (!session || session.user.role !== "HOSPITAL") {
    console.log("Unauthorized access attempt to patient history, session:", session);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  try {
    // Make sure the hospital ID is available
    if (!session.user.hospital) {
      console.log("Hospital ID missing from session:", session.user);
      return NextResponse.json(
        { error: "Hospital ID not found for this administrator" },
        { status: 403 }
      );
    }
    
    console.log(`Fetching medical reports for user ID: ${id} from hospital: ${session.user.hospital}`);

    // Fetch the patient's medical reports (using Receipt model)
    const medicalReports = await prisma.receipt.findMany({
      where: { 
        userId: id,
        hospitalId: session.user.hospital,
        // Only include processed and completed reports
        status: { in: ["PROCESSED", "QUEUED", "COMPLETED"] }
      },
      select: {
        id: true,
        uploatedAt: true,
        processedAt: true,
        condition: true,
        severity: true,
        aiAnalysis: true,
        status: true,
        doctor: {
          select: {
            id: true,
            name: true,
            specialty: true,
          },
        },
      },
      orderBy: {
        uploatedAt: 'desc',
      },
    });
    
    console.log(`Found ${medicalReports.length} medical reports`);
    console.log(`Fetching appointments for user ID: ${id} from hospital: ${session.user.hospital}`);

    const appointments = await prisma.appointment.findMany({
      where: { 
        userId: id,
        hospitalId: session.user.hospital
      },
      select: {
        id: true,
        createdAt: true,
        scheduledDate: true,
        preferredDate: true,
        symptoms: true,
        aiAnalysis: true,
        status: true,
        doctor: {
          select: {
            id: true,
            name: true,
            specialty: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    console.log(`Found ${appointments.length} appointments`);

    // Combine and sort all medical history items by date
    const history = [
      ...medicalReports.map(report => ({
        ...report,
        type: 'REPORT',
        // Map the Receipt fields to match the expected fields in the UI
        createdAt: report.uploatedAt,
      })),
      ...appointments.map(appointment => ({
        ...appointment,
        type: 'APPOINTMENT',
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    console.log(`Returning combined history with ${history.length} items`);

    return NextResponse.json({ history });
  } catch (error) {
    console.error("Error fetching patient history:", error);
    return NextResponse.json(
      { error: "Failed to fetch patient history" },
      { status: 500 }
    );
  }
} 