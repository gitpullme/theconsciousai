import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const receiptId = params.id;
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const receipt = await prisma.receipt.findUnique({
      where: { id: receiptId },
      include: {
        hospital: true
      }
    });

    if (!receipt) {
      return NextResponse.json(
        { error: "Receipt not found" },
        { status: 404 }
      );
    }

    // Check if user has access to this receipt
    if (
      receipt.userId !== session.user.id && 
      session.user.role !== "ADMIN" &&
      (session.user.role !== "HOSPITAL" || receipt.hospitalId !== session.user.hospital)
    ) {
      return NextResponse.json(
        { error: "You don't have permission to view this receipt" },
        { status: 403 }
      );
    }

    return NextResponse.json(receipt);
  } catch (error) {
    console.error("Error fetching receipt:", error);
    return NextResponse.json(
      { error: "Failed to fetch receipt details" },
      { status: 500 }
    );
  }
} 