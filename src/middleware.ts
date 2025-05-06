import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // For API routes, ensure CORS headers are added
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Get the response
    const response = NextResponse.next();

    // Add CORS headers for API routes
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');

    return response;
  }

  // For non-API routes, continue without modification
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
  ],
}; 