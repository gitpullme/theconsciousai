import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { INDIAN_STATES } from "@/lib/constants";

// Cache for hospital data with TTL of 30 minutes
const HOSPITAL_CACHE = new Map<string, {
  data: any,
  timestamp: number
}>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes in milliseconds

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const state = url.searchParams.get("state");
    
    // If state is invalid, return error response
    if (state && state.trim() === "") {
      return NextResponse.json({
        success: false,
        error: "Invalid state parameter",
        hospitals: [],
        count: 0
      });
    }
    
    // Check if valid state name
    if (state && !INDIAN_STATES.some(s => s.name === state)) {
      return NextResponse.json({
        success: false,
        error: "Unknown state name",
        hospitals: [],
        count: 0
      });
    }
    
    // Cache key based on state parameter
    const cacheKey = state || "all_states";
    
    // Check if cached data exists and is still valid
    const cachedData = HOSPITAL_CACHE.get(cacheKey);
    if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        hospitals: cachedData.data,
        count: cachedData.data.length,
        fromCache: true
      });
    }
    
    // Create whereClause based on state parameter
    const whereClause = state ? { state } : {};
    
    try {
      // Quick database connection check
      try {
        await prisma.$queryRaw`SELECT 1`;
        console.log("Database connection is working for hospitals API");
      } catch (connError) {
        console.error("Database connection check failed in hospitals API:", connError);
        return NextResponse.json(
          { 
            success: false,
            error: "Database connection error",
            details: "Could not connect to the database. Please try again later."
          },
          { status: 503 }
        );
      }
      
      // Query the database for hospitals with optimized query
      const hospitals = await prisma.hospital.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          address: true,
          state: true,
          city: true,
        },
        orderBy: [
          { name: 'asc' } // Just sort by name since state is already filtered
        ],
        // Optional cache optimization to avoid doing counts
        take: 1000, // Reasonable limit to avoid excessively large responses
      });
      
      // Store in cache
      HOSPITAL_CACHE.set(cacheKey, {
        data: hospitals,
        timestamp: Date.now()
      });
      
      // Return response
      return NextResponse.json({
        success: true,
        hospitals: hospitals,
        count: hospitals.length
      });
    } catch (dbError) {
      console.error("Database error fetching hospitals:", dbError);
      return NextResponse.json(
        { 
          success: false,
          error: "Database error while fetching hospitals",
          details: dbError instanceof Error ? dbError.message : String(dbError)
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Unexpected error in hospitals API:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 