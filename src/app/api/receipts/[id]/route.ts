import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma-singleton";

// Cache duration in seconds
const CACHE_DURATION = 30;

// In-memory cache to speed up repeat requests
const reportCache = new Map<string, { data: any, timestamp: number }>();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log(`🔍 API Request to /api/receipts/${params.id}`);
  
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      console.log("❌ Unauthorized access attempt - No session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`✅ Authorized access by user: ${session.user.id}, role: ${session.user.role}`);
    
    const receiptId = params.id;
    
    try {
      // Check memory cache first for very fast responses
      const now = Date.now();
      const cacheKey = `receipt_${receiptId}_${session.user.id}`;
      const cachedReport = reportCache.get(cacheKey);
      
      // If we have a valid cache entry, use it
      if (cachedReport && (now - cachedReport.timestamp < CACHE_DURATION * 1000)) {
        console.log(`🔄 Using in-memory cached report for ${receiptId}`);
        
        // Even for cached responses, set appropriate headers
        const response = NextResponse.json(cachedReport.data);
        
        // Add cache control headers
        response.headers.set('Cache-Control', `private, max-age=${CACHE_DURATION}`);
        
        // Add priority hint for browsers
        response.headers.set('Priority', 'high');
        
        // Add ETag for conditional requests
        const etag = `"${cachedReport.data.id}-${cachedReport.timestamp}"`;
        response.headers.set('ETag', etag);
        
        return response;
      }
      
      console.log(`🔄 Fetching receipt from database: ${receiptId}`);
      
      // Find the receipt from the database
      const receipt = await prisma.receipt.findUnique({
        where: { id: receiptId },
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
        console.log(`❌ Receipt not found: ${receiptId}`);
        return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
      }
      
      console.log(`✅ Receipt found: ${receiptId}, status: ${receipt.status}`);
      
      // Check if this receipt belongs to the current user
      if (receipt.userId !== session.user.id && session.user.role !== "HOSPITAL" && session.user.role !== "ADMIN") {
        console.log(`❌ Permission denied for user ${session.user.id} to view receipt ${receiptId}`);
        console.log(`Receipt user: ${receipt.userId}, Current user: ${session.user.id}, Role: ${session.user.role}`);
        return NextResponse.json(
          { error: "You don't have permission to view this receipt" },
          { status: 403 }
        );
      }
      
      console.log(`✅ Permission granted for user ${session.user.id} to view receipt ${receiptId}`);
      
      // Update our in-memory cache
      reportCache.set(cacheKey, { 
        data: receipt, 
        timestamp: now 
      });
      
      // Clean up old cache entries periodically (1% chance on each request)
      if (Math.random() < 0.01) {
        const expiryTime = now - (CACHE_DURATION * 1000 * 2); // Double the cache duration for cleanup
        for (const [key, value] of reportCache.entries()) {
          if (value.timestamp < expiryTime) {
            reportCache.delete(key);
          }
        }
      }
      
      // Add caching headers to the response
      const response = NextResponse.json(receipt);
      
      // If receipt is in a completed state (COMPLETED or REJECTED), 
      // we can cache for longer as it won't change
      if (receipt.status === 'COMPLETED' || receipt.status === 'REJECTED') {
        response.headers.set('Cache-Control', `private, max-age=${CACHE_DURATION*2}, s-maxage=${CACHE_DURATION*4}`);
      } else {
        // For active receipts, use a shorter cache time
        response.headers.set('Cache-Control', `private, max-age=${CACHE_DURATION}, s-maxage=${CACHE_DURATION*2}`);
      }
      
      // Add high priority hint for browsers
      response.headers.set('Priority', 'high');
      
      // Check if uploatedAt exists before using it
      console.log(`📅 Receipt ${receiptId} timestamps:`, {
        uploatedAt: receipt.uploatedAt,
        processedAt: receipt.processedAt
      });
      
      // Add ETag for conditional requests using only uploatedAt field which always exists
      const timestamp = receipt.uploatedAt?.getTime() || Date.now();
      const etag = `"${receipt.id}-${timestamp}"`;
      response.headers.set('ETag', etag);
      
      console.log(`✅ Successfully returning receipt ${receiptId}, ETag: ${etag}`);
      return response;
    } catch (error) {
      console.error("❌ Error fetching receipt:", error);
      return NextResponse.json(
        { error: "Failed to fetch receipt details" },
        { status: 500 }
      );
    }
  } catch (outerError) {
    console.error("❌ Critical error in receipts endpoint:", outerError);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
} 