import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invalidateCache } from "../route";

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
    
    // Invalidate the cache
    invalidateCache(userId);

    return NextResponse.json({ success: true, message: "All report history cleared successfully" });
  } catch (error) {
    console.error("Error clearing report history:", error);
    return NextResponse.json(
      { error: "Failed to clear report history" },
      { status: 500 }
    );
  }
} 