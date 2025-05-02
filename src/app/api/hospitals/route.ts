import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const state = url.searchParams.get("state");
    
    const whereClause = state ? { state: state } : {};
    
    const hospitals = await prisma.hospital.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        address: true,
        state: true,
        city: true,
        // pincode is not in the schema, so we can't select it
      },
      orderBy: [
        { state: 'asc' },
        { name: 'asc' }
      ],
    });
    
    return NextResponse.json({ hospitals });
  } catch (error) {
    console.error("Error fetching hospitals:", error);
    return NextResponse.json(
      { 
        message: "Error fetching hospitals",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
} 