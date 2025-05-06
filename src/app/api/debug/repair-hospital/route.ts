import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only hospital admins or system admins can use this endpoint
    if (session.user.role !== "HOSPITAL" && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Get the user's current hospital association
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        hospital: true,
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    let hospitalDetails = null;
    let repairResult = null;

    // Check if hospital ID exists and is valid
    if (user.hospital) {
      try {
        hospitalDetails = await prisma.hospital.findUnique({
          where: { id: user.hospital },
        });

        if (!hospitalDetails) {
          // Hospital ID is invalid, so we should clear it
          repairResult = "Hospital ID is invalid and was cleared";
          await prisma.user.update({
            where: { id: user.id },
            data: { hospital: null },
          });
        }
      } catch (error) {
        console.error("Error checking hospital:", error);
      }
    } else if (user.role === "HOSPITAL") {
      // User is a hospital admin but has no hospital ID
      repairResult = "Hospital admin without hospital ID";
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        hospitalId: user.hospital,
      },
      hospitalDetails,
      repairResult,
      sessionHospital: session.user.hospital,
    });
  } catch (error) {
    console.error("Error in repair-hospital API:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only hospital admins or system admins can use this endpoint
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only system administrators can perform hospital repairs" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { userId, hospitalId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Verify the hospital exists if hospitalId is provided
    if (hospitalId) {
      const hospital = await prisma.hospital.findUnique({
        where: { id: hospitalId },
      });

      if (!hospital) {
        return NextResponse.json(
          { error: "Hospital not found" },
          { status: 404 }
        );
      }
    }

    // Update the user's hospital ID
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { hospital: hospitalId },
    });

    return NextResponse.json({
      success: true,
      message: hospitalId 
        ? `Hospital ID updated to ${hospitalId}` 
        : "Hospital ID cleared",
      user: {
        id: updatedUser.id,
        hospital: updatedUser.hospital,
      },
    });
  } catch (error) {
    console.error("Error in repair-hospital API:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
} 