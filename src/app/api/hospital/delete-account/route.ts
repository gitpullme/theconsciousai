import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// DELETE - Delete hospital account and all associated data
export async function DELETE(req: Request) {
  try {
    // Authenticate the request
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is a hospital admin
    if (session.user.role !== "HOSPITAL") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the hospital ID and user ID from the session
    const hospitalId = session.user.hospital;
    const userId = session.user.id;

    if (!hospitalId) {
      return NextResponse.json(
        { error: "Hospital ID not found in your profile" },
        { status: 404 }
      );
    }

    // Begin transaction to ensure all operations succeed or fail together
    await prisma.$transaction(async (tx) => {
      console.log(`Deleting hospital account: ${hospitalId} (User ID: ${userId})`);

      // 1. Delete all appointments for this hospital
      const deletedAppointments = await tx.appointment.deleteMany({
        where: { hospitalId }
      });
      console.log(`Deleted ${deletedAppointments.count} appointments`);

      // 2. Delete all medical reports for this hospital
      const deletedReports = await tx.medicalReport.deleteMany({
        where: { hospitalId }
      });
      console.log(`Deleted ${deletedReports.count} medical reports`);

      // 3. Delete all queue items for this hospital
      const deletedQueueItems = await tx.patientQueue.deleteMany({
        where: { hospitalId }
      });
      console.log(`Deleted ${deletedQueueItems.count} queue items`);

      // 4. Delete all doctors associated with this hospital
      const deletedDoctors = await tx.doctor.deleteMany({
        where: { hospitalId }
      });
      console.log(`Deleted ${deletedDoctors.count} doctors`);

      // 5. Delete the hospital record
      await tx.hospital.delete({
        where: { id: hospitalId }
      });
      console.log(`Deleted hospital record`);

      // 6. Delete the user account associated with this hospital
      await tx.user.delete({
        where: { id: userId }
      });
      console.log(`Deleted user account`);
    });

    return NextResponse.json({
      success: true,
      message: "Hospital account has been deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting hospital account:", error);
    return NextResponse.json(
      { 
        error: "Failed to delete hospital account", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
} 