import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    console.log("Testing database connection...");
    
    // Perform a simple query to test the connection
    const userCount = await prisma.$queryRaw`SELECT COUNT(*) FROM "User"`;
    
    // Get database connection info (without sensitive data)
    const connectionInfo = await prisma.$queryRaw`SELECT current_database(), version()`;
    
    return NextResponse.json({
      success: true,
      message: "Database connection successful",
      userCount,
      connectionInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Database connection test failed:", error);
    
    let errorMessage = "Unknown database error";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 