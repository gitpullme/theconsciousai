import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request) {
  // Check authentication
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    // Delete all receipt records for the user
    await prisma.receipt.deleteMany({
      where: { userId }
    });

    return NextResponse.json({ success: true, message: "All receipt history cleared successfully" });
  } catch (error) {
    console.error("Error clearing receipt history:", error);
    return NextResponse.json(
      { error: "Failed to clear receipt history" },
      { status: 500 }
    );
  }
} 