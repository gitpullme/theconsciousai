import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET - Fetch hospital data for debugging
export async function GET(req: Request) {
  try {
    // In development, allow access without authentication
    let isAuthenticated = process.env.NODE_ENV === "development";
    
    if (!isAuthenticated) {
      // In production, require authentication and admin/hospital role
      const session = await getServerSession(authOptions);
      
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      
      if (session.user.role !== "ADMIN" && session.user.role !== "HOSPITAL") {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
      
      isAuthenticated = true;
    }
    
    if (isAuthenticated) {
      // Count total hospitals
      const totalHospitals = await prisma.hospital.count();
      
      // Get hospitals grouped by state
      const hospitalsByState = await prisma.hospital.groupBy({
        by: ['state'],
        _count: {
          id: true
        }
      });
      
      // Get a sample of hospitals (limit to 20 for brevity)
      const sampleHospitals = await prisma.hospital.findMany({
        select: {
          id: true,
          name: true,
          state: true,
          city: true,
          address: true
        },
        orderBy: {
          name: 'asc'
        },
        take: 20
      });
      
      // Return comprehensive debug info
      return NextResponse.json({
        success: true,
        totalHospitals,
        hospitalsByState,
        sampleHospitals,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error("Error in hospital debug API:", error);
    
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to fetch hospital data", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
} 