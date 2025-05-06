"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import React from "react";

interface Report {
  id: string;
  status: string;
  severity: number | null;
  queuePosition: number | null;
  uploatedAt: string;
  processedAt: string | null;
  aiAnalysis: string | null;
  hospital: {
    id: string;
    name: string;
    state: string;
    city?: string | null;
    address?: string | null;
  } | null;
  doctor: {
    id: string;
    name: string;
    specialty: string;
  } | null;
}

// Define the params structure
interface RouteParams {
  id: string;
}

interface PageProps {
  params: Promise<RouteParams> | RouteParams;
}

// Skeleton loading UI component
const ReportDetailsSkeleton = () => (
  <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 animate-pulse">
    <div className="flex justify-between items-center mb-6">
      <div className="h-8 bg-gray-200 rounded w-56"></div>
      <div className="h-5 bg-gray-200 rounded w-32"></div>
    </div>
    
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6 bg-gray-50">
        <div className="h-6 bg-gray-200 rounded w-2/5 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-3/5"></div>
      </div>
      
      <div className="border-t border-gray-200">
        <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="mt-1 sm:col-span-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
        
        <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="mt-1 sm:col-span-2">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
        
        <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="mt-1 sm:col-span-2">
            <div className="h-4 bg-gray-200 rounded w-4/5"></div>
          </div>
        </div>
        
        <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="mt-1 sm:col-span-2">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
        
        <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="mt-1 sm:col-span-2 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-11/12"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Main report details component
export default function ReportDetailsPage({ params }: PageProps) {
  // Always use React.use to unwrap params
  const unwrappedParams = React.use(params);
  const reportId = unwrappedParams.id;
  
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Track if this is a first-time load
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  // Track if data fetch has completed at least once
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && reportId) {
      const controller = new AbortController();
      
      fetchReportDetails(reportId, controller.signal);
      
      return () => {
        controller.abort();
      };
    }
  }, [status, router, reportId]);

  const fetchReportDetails = async (id: string, signal?: AbortSignal) => {
    try {
      if (isInitialLoad) {
        // On initial load, show skeleton immediately
        setLoading(true);
      } else {
        // For subsequent loads, delay setting loading state to avoid flickering
        // for quick responses - no need for refresh functionality
        setLoading(true);
      }
      
      setError(null);
      
      console.log(`🔄 Fetching report details for ID: ${id} at ${new Date().toISOString()}`);
      
      // Use caching headers appropriately for improved performance
      const headers: HeadersInit = {
        'Cache-Control': 'no-cache',
        'Priority': 'high', // Add priority header to speed up loading
      };
      
      // Configure fetch options with timeout
      const fetchOptions = {
        method: 'GET',
        headers,
        credentials: 'include' as RequestCredentials, // Include cookies/session
        cache: 'no-store' as RequestCache
      };
      
      // Set up timeout for fetch requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        if (!controller.signal.aborted) {
          controller.abort('timeout');
        }
      }, 8000); // 8-second timeout
      
      // Handle parent signal abort (e.g. component unmount)
      let abortListener: (() => void) | null = null;
      if (signal && !signal.aborted) {
        abortListener = () => {
          clearTimeout(timeoutId);
          if (!controller.signal.aborted) {
            controller.abort('parent_aborted');
          }
        };
        signal.addEventListener('abort', abortListener);
      }
      
      // Try /api/receipts/:id first
      console.log(`🔍 Trying /api/receipts/${id} endpoint...`);
      let response = null;
      let errorDetail = "";
      let useReceiptsEndpoint = true;
      
      try {
        response = await fetch(`/api/receipts/${id}`, {
          ...fetchOptions,
          signal: controller.signal
        });
        
        console.log(`🔍 Response from receipts endpoint: ${response.status} ${response.statusText}`);
        
        // If we got a 404 or 500, try the other endpoint
        if (response.status === 404 || response.status === 500 || response.status === 401) {
          useReceiptsEndpoint = false;
        }
      } catch (receiptError) {
        console.warn(`⚠️ Network error from receipts endpoint:`, receiptError);
        useReceiptsEndpoint = false;
      }
      
      // If receipts endpoint failed or returned error, try reports endpoint as fallback
      if (!useReceiptsEndpoint) {
        console.log(`🔍 Trying fallback /api/reports/${id} endpoint...`);
        
        try {
          response = await fetch(`/api/reports/${id}`, {
            ...fetchOptions,
            signal: controller.signal
          });
          
          console.log(`🔍 Response from reports endpoint: ${response.status} ${response.statusText}`);
        } catch (reportError) {
          console.error(`❌ Network error from reports endpoint:`, reportError);
          
          // Create a new AbortController for the final retry attempt
          const finalAttemptController = new AbortController();
          const finalTimeoutId = setTimeout(() => {
            if (!finalAttemptController.signal.aborted) {
              finalAttemptController.abort('timeout');
            }
          }, 5000); // 5-second timeout for final attempt
          
          // Try one more time with credentials included explicitly
          try {
            console.log(`🔍 Making final retry attempt with credentials...`);
            
            response = await fetch(`/api/reports/${id}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'Priority': 'high'
              },
              credentials: 'include' as RequestCredentials,
              signal: finalAttemptController.signal
            });
            
            console.log(`🔍 Final retry response: ${response.status} ${response.statusText}`);
          } catch (finalError) {
            clearTimeout(finalTimeoutId);
            console.error(`❌ Final attempt failed:`, finalError);
            // Both endpoints failed with network errors
            throw new Error(`Unable to connect to the server. Please check your connection and try again.`);
          } finally {
            clearTimeout(finalTimeoutId);
          }
        }
      }
      
      // Clear the timeout since the request completed
      clearTimeout(timeoutId);
      
      // Remove the abort listener if it was added
      if (signal && abortListener) {
        signal.removeEventListener('abort', abortListener);
      }
      
      // At this point, we should have a response from one of the endpoints
      if (!response) {
        console.error("❌ No response object from either endpoint");
        throw new Error("No response received from server");
      }
      
      if (!response.ok) {
        // Try to get the error message from the response
        try {
          const errorData = await response.json();
          errorDetail = errorData.error || response.statusText;
          console.error(`❌ Error response (${response.status}): ${JSON.stringify(errorData)}`);
        } catch (e) {
          errorDetail = response.statusText;
          console.error(`❌ Couldn't parse error response: ${e}`);
        }
        
        // Handle specific status codes
        if (response.status === 404) {
          throw new Error(`Report not found: ${errorDetail}`);
        } else if (response.status === 403) {
          throw new Error(`Access denied: ${errorDetail}`);
        } else if (response.status === 401) {
          // If we get 401, the user might need to re-login
          console.error("Authentication error - redirecting to login");
          router.push('/login');
          throw new Error(`Session expired. Please log in again.`);
        } else if (response.status >= 500) {
          throw new Error(`Server error (${response.status}): ${errorDetail}`);
        } else {
          throw new Error(`Failed to fetch report details (${response.status}): ${errorDetail}`);
        }
      }
      
      // Process successful response
      try {
        const data = await response.json();
        console.log(`✅ Successfully retrieved report data for ID: ${id}`);
        
        setReport(data);
        setIsInitialLoad(false);
        setHasAttemptedLoad(true);
      } catch (parseError) {
        console.error("❌ Error parsing JSON response:", parseError);
        throw new Error("Failed to parse server response. Please try again.");
      }
    } catch (err) {
      // Don't set error state if this was an abort (component unmounted)
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.log(`⚠️ Request aborted for report ID: ${id}`);
        return;
      }
      
      console.error("❌ Error fetching report details:", err);
      setError(err instanceof Error ? err.message : "Could not load report details. Please try again.");
      setHasAttemptedLoad(true);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return <ReportDetailsSkeleton />;
  }

  if (loading && isInitialLoad) {
    return <ReportDetailsSkeleton />;
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <Link
            href="/user"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            &larr; Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Only show the "not found" message if we've actually tried to load the data
  // and didn't get a result
  if (!report && hasAttemptedLoad) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">Report not found or you do not have permission to view it.</p>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <Link
            href="/user"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            &larr; Back to dashboard
          </Link>
        </div>
      </div>
    );
  }
  
  // Show skeleton while loading, even if we don't have report data yet
  if (!report) {
    return <ReportDetailsSkeleton />;
  }

  // Function to format the AI analysis with line breaks and highlight specific sections
  const formatAnalysis = (analysis: string | null) => {
    if (!analysis) return null;
    
    // Create sections based on line breaks
    const sections = analysis.split('\n\n').map((section, sectionIndex) => {
      // Special formatting for doctor and queue sections
      if (section.trim().startsWith('Doctor Assigned:')) {
        const lines = section.split('\n');
        return (
          <div key={`section-${sectionIndex}`} className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
            <h4 className="font-medium text-blue-800 mb-1">Doctor Information</h4>
            {lines.map((line, i) => (
              <p key={i} className="text-blue-700">
                {line}
              </p>
            ))}
          </div>
        );
      } else if (section.trim().startsWith('Current Queue:')) {
        return (
          <div key={`section-${sectionIndex}`} className="mt-4 p-3 bg-purple-50 rounded-md border border-purple-200">
            <h4 className="font-medium text-purple-800 mb-1">Queue Information</h4>
            <p className="text-purple-700">{section}</p>
          </div>
        );
      } else {
        // Regular sections
        return (
          <div key={`section-${sectionIndex}`} className="mb-4">
            {section.split('\n').map((line, index) => {
              if (line.trim().startsWith('Severity:')) {
                return (
                  <p key={index} className="font-bold text-gray-900">
                    {line}
                  </p>
                );
              } else if (line.trim().startsWith('Priority Level:')) {
                return (
                  <p key={index} className="text-gray-800 font-medium">
                    {line}
                  </p>
                );
              } else if (line.trim().startsWith('Patient Condition:') || 
                         line.trim().startsWith('Recommended Actions:') ||
                         line.trim().startsWith('Waiting Time Impact:') ||
                         line.trim().startsWith('Specialist Recommendation:')) {
                return (
                  <p key={index} className="text-gray-800 font-medium mt-2">
                    {line}
                  </p>
                );
              } else if (!line.trim()) {
                // Empty line
                return <div key={index} className="h-2"></div>;
              } else {
                // Regular text
                return (
                  <p key={index} className="text-gray-700">
                    {line}
                  </p>
                );
              }
            })}
          </div>
        );
      }
    });
    
    return sections;
  };

  // Show a loading overlay if refreshing data
  const LoadingOverlay = () => loading && !isInitialLoad ? (
    <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-10">
      <div className="flex flex-col items-center">
        <svg className="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    </div>
  ) : null;

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 relative">
      <LoadingOverlay />
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Medical Report Details</h1>
        <div>
          <Link
            href="/user"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            &larr; Back to dashboard
          </Link>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg transition-opacity duration-300" 
           style={{ opacity: loading && !isInitialLoad ? 0.7 : 1 }}>
        <div className="px-4 py-5 sm:px-6 bg-gray-50">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Report Information
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Details about your medical report and queue status.
          </p>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Hospital</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2">
                {report.hospital?.name || "Unknown Hospital"}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Hospital Location</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2">
                {report.hospital ? (
                  <>
                    {report.hospital.address && `${report.hospital.address}, `}
                    {report.hospital.city && `${report.hospital.city}, `}
                    {report.hospital.state}
                  </>
                ) : "Unknown Location"}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                    report.status === "COMPLETED"
                      ? "bg-green-100 text-green-800"
                      : report.status === "QUEUED"
                      ? "bg-blue-100 text-blue-800"
                      : report.status === "PROCESSING"
                      ? "bg-yellow-100 text-yellow-800"
                      : report.status === "PENDING"
                      ? "bg-gray-100 text-gray-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {report.status === "QUEUED"
                    ? "In Queue"
                    : report.status === "COMPLETED"
                    ? "Completed"
                    : report.status === "PROCESSING"
                    ? "Processing"
                    : report.status === "PENDING"
                    ? "Pending"
                    : report.status === "REJECTED"
                    ? "Rejected"
                    : report.status}
                </span>
                
                {report.status === "QUEUED" && report.queuePosition && (
                  <span className="ml-2 text-gray-900 font-medium">
                    Position: #{report.queuePosition}
                  </span>
                )}
              </dd>
            </div>
            {report.doctor && (
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Assigned Doctor</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2">
                  <div className="flex items-center">
                    <span className="font-medium">{report.doctor.name}</span>
                    <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                      {report.doctor.specialty}
                    </span>
                  </div>
                </dd>
              </div>
            )}
            {report.severity !== null && report.severity !== undefined && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Severity Rating</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                      report.severity > 7
                        ? "bg-red-100 text-red-800"
                        : report.severity > 4
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {report.severity}/10
                  </span>
                  <span className="ml-2 text-sm text-gray-500">
                    {report.severity > 7
                      ? "(High Priority)"
                      : report.severity > 4
                      ? "(Medium Priority)"
                      : "(Low Priority)"}
                  </span>
                </dd>
              </div>
            )}
            {report.aiAnalysis && (
              <div className="bg-gray-50 px-4 py-5 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 mb-3">Medical Analysis</dt>
                <dd className="mt-2 text-sm text-gray-900 border-t border-gray-200 pt-4">
                  <div className="space-y-4">
                    {formatAnalysis(report.aiAnalysis)}
                  </div>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
} 