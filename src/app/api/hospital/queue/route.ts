import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getHospitalQueue } from "@/services/queue";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "HOSPITAL") {
    return NextResponse.json(
      { error: "Only hospital administrators can view this queue" },
      { status: 403 }
    );
  }

  try {
    // First, we need to find the hospital associated with this admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { hospital: true }
    });

    if (!user?.hospital) {
      return NextResponse.json(
        { error: "Hospital not found for this administrator" },
        { status: 404 }
      );
    }

    // Get the hospital queue
    const queue = await getHospitalQueue(user.hospital);
    return NextResponse.json(queue);
  } catch (error) {
    console.error("Error fetching queue:", error);
    return NextResponse.json(
      { error: "Failed to fetch patient queue" },
      { status: 500 }
    );
  }
} 