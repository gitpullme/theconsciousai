import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma-singleton";

// Cache duration in seconds
const CACHE_DURATION = 30;

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log(`🔍 API Request to /api/reports/${params.id}`);
  
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      console.log("❌ Unauthorized access attempt - No session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`✅ Authorized access by user: ${session.user.id}, role: ${session.user.role}`);
    
    const reportId = params.id;
    
    try {
      console.log(`🔄 Fetching report from database: ${reportId}`);
      
      // Find the receipt (database schema still uses "receipt" terminology)
      const receipt = await prisma.receipt.findUnique({
        where: { id: reportId },
        include: {
          hospital: true,
          doctor: {
            select: {
              id: true,
              name: true,
              specialty: true
            }
          }
        }
      });
      
      if (!receipt) {
        console.log(`❌ Report not found: ${reportId}`);
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }
      
      console.log(`✅ Report found: ${reportId}, status: ${receipt.status}`);
      
      // Check if this report belongs to the current user
      if (receipt.userId !== session.user.id && session.user.role !== "HOSPITAL" && session.user.role !== "ADMIN") {
        console.log(`❌ Permission denied for user ${session.user.id} to view report ${reportId}`);
        console.log(`Report user: ${receipt.userId}, Current user: ${session.user.id}, Role: ${session.user.role}`);
        return NextResponse.json(
          { error: "You don't have permission to view this report" },
          { status: 403 }
        );
      }
      
      console.log(`✅ Permission granted for user ${session.user.id} to view report ${reportId}`);
      
      // Add caching headers to the response
      const response = NextResponse.json(receipt);
      
      // If receipt is in a completed state, we can cache for longer as it won't change
      if (receipt.status === 'COMPLETED') {
        response.headers.set('Cache-Control', `private, max-age=${CACHE_DURATION*2}, s-maxage=${CACHE_DURATION*4}`);
      } else {
        // For active receipts, use a shorter cache time
        response.headers.set('Cache-Control', `private, max-age=${CACHE_DURATION}, s-maxage=${CACHE_DURATION*2}`);
      }
      
      // Add high priority hint for browsers
      response.headers.set('Priority', 'high');
      
      // Add ETag for conditional requests using only uploatedAt field which always exists
      const timestamp = receipt.uploatedAt?.getTime() || Date.now();
      const etag = `"${receipt.id}-${timestamp}"`;
      response.headers.set('ETag', etag);
      
      console.log(`✅ Successfully returning report ${reportId}, ETag: ${etag}`);
      
      return response;
    } catch (error) {
      console.error("❌ Error fetching report:", error);
      return NextResponse.json(
        { error: "Failed to fetch report details" },
        { status: 500 }
      );
    }
  } catch (outerError) {
    console.error("❌ Critical error in reports endpoint:", outerError);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
} 