import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only administrators can access this endpoint" },
      { status: 403 }
    );
  }

  try {
    const [totalUsers, totalHospitals, totalReceipts, activeQueues] =
      await Promise.all([
        prisma.user.count(),
        prisma.hospital.count(),
        prisma.receipt.count(),
        prisma.receipt.count({
          where: {
            status: "QUEUED",
          },
        }),
      ]);

    return NextResponse.json({
      totalUsers,
      totalHospitals,
      totalReceipts,
      activeQueues,
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
} 