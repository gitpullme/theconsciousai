import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Hospital Queue API - User session:", {
      id: session.user.id,
      role: session.user.role,
      hospital: session.user.hospital
    });

    // Allow both HOSPITAL and ADMIN roles to access
    if (session.user.role !== "HOSPITAL" && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only hospital administrators and admins can view this queue" },
        { status: 403 }
      );
    }

    // Get hospital ID directly from session
    const hospitalId = session.user.hospital;
    
    // Validate hospital ID
    if (!hospitalId) {
      console.error("Hospital user has no hospital ID in session");
      return NextResponse.json(
        { error: "Hospital ID not found for this administrator" },
        { status: 404 }
      );
    }
    
    console.log("Fetching queue for hospital ID:", hospitalId);
    
    // Get hospital receipts
    try {
      // @ts-ignore: Bypass TypeScript errors for Prisma client
      const receipts = await prisma.receipt.findMany({
        where: {
          hospitalId: hospitalId,
          status: 'QUEUED'
        },
        orderBy: { queuePosition: 'asc' },
        select: {
          id: true,
          queuePosition: true,
          uploatedAt: true,
          processedAt: true,
          severity: true,
          status: true,
          aiAnalysis: true,
          doctorId: true,
          doctor: {
            select: {
              id: true,
              name: true,
              specialty: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          }
        }
      });
      
      console.log(`Found ${receipts.length} items in queue for hospital ${hospitalId}`);
      
      // Re-assign queue positions to ensure correct numbering
      const sortedQueue = receipts.map((item: any, index: number) => ({
        ...item,
        queuePosition: index + 1
      }));

      return NextResponse.json(sortedQueue);
    } catch (queueError) {
      console.error("Database error fetching queue data:", queueError);
      return NextResponse.json(
        { error: "Failed to load the patient queue" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Unexpected error in hospital queue API:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
} 