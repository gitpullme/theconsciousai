import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// DELETE - Clear all hospital patient data
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

    // Get the hospital ID from the session
    const hospitalId = session.user.hospital;

    if (!hospitalId) {
      return NextResponse.json(
        { error: "Hospital ID not found in your profile" },
        { status: 404 }
      );
    }

    // Begin transaction to ensure all operations succeed or fail together
    try {
      const result = await prisma.$transaction(async (tx) => {
        console.log(`Clearing all patient data for hospital ID: ${hospitalId}`);
        let summary = {};

        // 1. Delete all appointments for this hospital
        try {
          const deletedAppointments = await tx.appointment.deleteMany({
            where: { hospitalId }
          });
          console.log(`Deleted ${deletedAppointments.count} appointments`);
          summary = { ...summary, appointments: deletedAppointments.count };
        } catch (err) {
          console.error("Error deleting appointments:", err);
          summary = { ...summary, appointmentsError: true };
        }

        // 2. Delete all receipts for this hospital
        try {
          const deletedReceipts = await tx.receipt.deleteMany({
            where: { hospitalId }
          });
          console.log(`Deleted ${deletedReceipts.count} receipts`);
          summary = { ...summary, receipts: deletedReceipts.count };
        } catch (err) {
          console.error("Error deleting receipts:", err);
          summary = { ...summary, receiptsError: true };
        }

        // 3. Delete all emergency alerts for this hospital
        try {
          const deletedAlerts = await tx.emergencyAlert.deleteMany({
            where: { hospitalId }
          });
          console.log(`Deleted ${deletedAlerts.count} emergency alerts`);
          summary = { ...summary, emergencyAlerts: deletedAlerts.count };
        } catch (err) {
          console.error("Error deleting emergency alerts:", err);
          summary = { ...summary, emergencyAlertsError: true };
        }

        // 4. Reset doctor associations for this hospital (if applicable)
        try {
          const updatedDoctors = await tx.doctor.updateMany({
            where: { hospitalId },
            data: { available: true }
          });
          console.log(`Reset ${updatedDoctors.count} doctors to available`);
          summary = { ...summary, doctors: updatedDoctors.count };
        } catch (err) {
          console.error("Error updating doctors:", err);
          summary = { ...summary, doctorsError: true };
        }

        return summary;
      });

      return NextResponse.json({
        success: true,
        message: "All patient data has been cleared successfully",
        details: result
      });
    } catch (txError) {
      console.error("Transaction failed:", txError);
      return NextResponse.json(
        { 
          error: "Database transaction failed while clearing hospital data", 
          details: txError instanceof Error ? txError.message : String(txError) 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error clearing hospital data:", error);
    return NextResponse.json(
      { 
        error: "Failed to clear hospital data", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
} 