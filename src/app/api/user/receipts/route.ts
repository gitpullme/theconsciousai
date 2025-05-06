import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Cache TTL in seconds (5 minutes)
const CACHE_TTL = 300;
const receiptsCache = new Map();

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const cacheKey = `receipts-${userId}`;
  
  // Check Cache-Control headers
  const headers = new Headers(req.headers);
  const noCache = headers.get('Cache-Control') === 'no-cache';
  
  // Check if we have a valid cached response
  if (!noCache && receiptsCache.has(cacheKey)) {
    const cachedData = receiptsCache.get(cacheKey);
    if (Date.now() < cachedData.expiresAt) {
      // Return cached data with appropriate headers
      return NextResponse.json(cachedData.data, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': `private, max-age=${CACHE_TTL}`
        }
      });
    }
  }

  try {
    // Use more efficient querying with projection (select) to limit data retrieved
    const receipts = await prisma.receipt.findMany({
      where: { userId },
      orderBy: [
        { 
          uploatedAt: 'desc' 
        }
      ],
      select: {
        id: true,
        status: true,
        severity: true,
        queuePosition: true,
        uploatedAt: true,
        processedAt: true,
        hospital: {
          select: {
            id: true,
            name: true
          }
        },
        doctor: {
          select: {
            id: true,
            name: true,
            specialty: true
          }
        }
      },
      // Limit to improve performance for users with many records
      take: 50
    });

    // Cache the response
    receiptsCache.set(cacheKey, {
      data: receipts,
      expiresAt: Date.now() + (CACHE_TTL * 1000)
    });

    // Return fresh data with cache headers
    return NextResponse.json(receipts, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': `private, max-age=${CACHE_TTL}`
      }
    });
  } catch (error) {
    console.error("Error fetching user receipts:", error);
    return NextResponse.json(
      { error: "Failed to fetch receipt history" },
      { status: 500 }
    );
  }
}

// For cache invalidation when a user uploads a new receipt or existing ones are modified
export async function invalidateCache(userId: string) {
  const cacheKey = `receipts-${userId}`;
  receiptsCache.delete(cacheKey);
} 