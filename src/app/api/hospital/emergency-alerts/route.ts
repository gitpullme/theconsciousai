import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET - Fetch emergency alerts for a hospital
export async function GET(req: Request) {
  try {
    // Authenticate the request
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is a hospital
    if (session.user.role !== "HOSPITAL") {
      return NextResponse.json({ error: "Only hospitals can view emergency alerts" }, { status: 403 });
    }

    const hospitalId = session.user.id;

    // Get all emergency alerts for this hospital
    const emergencyAlerts = await prisma.emergencyAlert.findMany({
      where: {
        hospitalId: hospitalId,
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      emergencyAlerts
    });
  } catch (error) {
    console.error("Error fetching emergency alerts:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch emergency alerts", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}

// PATCH - Update emergency alert status
export async function PATCH(req: Request) {
  try {
    // Authenticate the request
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is a hospital
    if (session.user.role !== "HOSPITAL") {
      return NextResponse.json({ error: "Only hospitals can update emergency alerts" }, { status: 403 });
    }

    const hospitalId = session.user.id;
    const data = await req.json();
    const { alertId, status } = data;

    if (!alertId || !status) {
      return NextResponse.json({ error: "Alert ID and status are required" }, { status: 400 });
    }

    // Verify the emergency alert belongs to this hospital
    const alert = await prisma.emergencyAlert.findUnique({
      where: {
        id: alertId
      }
    });

    if (!alert) {
      return NextResponse.json({ error: "Emergency alert not found" }, { status: 404 });
    }

    if (alert.hospitalId !== hospitalId) {
      return NextResponse.json({ error: "Unauthorized to update this alert" }, { status: 403 });
    }

    // Update alert status
    const updatedAlert = await prisma.emergencyAlert.update({
      where: {
        id: alertId
      },
      data: {
        status
      }
    });

    return NextResponse.json({
      success: true,
      alert: updatedAlert
    });
  } catch (error) {
    console.error("Error updating emergency alert:", error);
    return NextResponse.json(
      { 
        error: "Failed to update emergency alert", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
} 