import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { completeReceipt } from "@/services/queue";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const receiptId = params.id;
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "HOSPITAL" && session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only hospital administrators can complete receipts" },
      { status: 403 }
    );
  }

  try {
    // Check if the receipt belongs to this hospital (if hospital admin)
    if (session.user.role === "HOSPITAL") {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { hospital: true }
      });

      const receipt = await prisma.receipt.findUnique({
        where: { id: receiptId },
        select: { hospitalId: true }
      });

      if (!receipt) {
        return NextResponse.json(
          { error: "Receipt not found" },
          { status: 404 }
        );
      }

      if (user?.hospital !== receipt.hospitalId) {
        return NextResponse.json(
          { error: "This receipt doesn't belong to your hospital" },
          { status: 403 }
        );
      }
    }

    // Complete the receipt and update queue positions
    await completeReceipt(receiptId);
    
    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("Error completing receipt:", error);
    return NextResponse.json(
      { error: "Failed to complete receipt" },
      { status: 500 }
    );
  }
} 