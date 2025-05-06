import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { completeReceipt } from "@/services/queue";
import { prisma } from "@/lib/prisma";

// In-memory cache to prevent duplicate completion requests
const processingCache = new Map<string, boolean>();

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const reportId = params.id;
  const session = await getServerSession(authOptions);

  // First, return an immediate response for authentication issues
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "HOSPITAL" && session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only hospital administrators can complete reports" },
      { status: 403 }
    );
  }

  // Check if this report is already being processed to prevent duplicate requests
  if (processingCache.get(reportId)) {
    return NextResponse.json({ 
      status: "processing",
      message: "This report is already being processed"
    });
  }

  // Mark as processing
  processingCache.set(reportId, true);

  try {
    // Fast path: Do database validation while avoiding extra queries when possible
    if (session.user.role === "HOSPITAL") {
      // Get hospital ID and receipt validation in a single query
      const [user, receipt] = await Promise.all([
        prisma.user.findUnique({
          where: { id: session.user.id },
          select: { hospital: true }
        }),
        prisma.receipt.findUnique({
          where: { id: reportId },
          select: { hospitalId: true, status: true }
        })
      ]);

      // Fast fail cases
      if (!receipt) {
        processingCache.delete(reportId);
        return NextResponse.json(
          { error: "Report not found" },
          { status: 404 }
        );
      }

      if (receipt.status === 'COMPLETED') {
        processingCache.delete(reportId);
        return NextResponse.json({ 
          status: "success", 
          message: "Report was already completed" 
        });
      }

      if (user?.hospital !== receipt.hospitalId) {
        processingCache.delete(reportId);
        return NextResponse.json(
          { error: "This report doesn't belong to your hospital" },
          { status: 403 }
        );
      }
    }

    // Complete the report and update queue positions
    await completeReceipt(reportId);
    
    // Remove from processing cache after success
    processingCache.delete(reportId);
    
    return NextResponse.json({ 
      status: "success",
      message: "Report successfully completed"
    });
  } catch (error) {
    console.error("Error completing report:", error);
    
    // Remove from processing cache on error
    processingCache.delete(reportId);
    
    return NextResponse.json(
      { error: error.message || "Failed to complete report" },
      { status: 500 }
    );
  }
} 