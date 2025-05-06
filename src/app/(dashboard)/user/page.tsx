"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";
import Link from "next/link";
import AppointmentListWrapper from "@/components/appointment/AppointmentListWrapper";
import AIChatbot from "@/components/chat/AIChatbot";
import { Button } from '@/components/ui/button';
import { MessageSquarePlus, Upload } from 'lucide-react';

interface Hospital {
  id: string;
  name: string;
  state: string;
  city?: string | null;
  address?: string | null;
  pincode?: string;
}

interface Report {
  id: string;
  status: string;
  severity: number | null;
  queuePosition: number | null;
  uploatedAt: string;
  processedAt: string | null;
  hospital: {
    id: string;
    name: string;
  } | null;
  doctor: {
    id: string;
    name: string;
    specialty: string;
  } | null;
}

export default function UserDashboard() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loadingStage, setLoadingStage] = useState<string>("initializing");
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  // If not authenticated, redirect to login
  if (status === "unauthenticated") {
    redirect("/login");
  }

  // Function to clear all report history
  const clearAllHistory = async () => {
    if (!session?.user?.id) return;
    
    setIsDeleting(true);
    setError(null);
    
    try {
      // Set timeout to ensure UI updates before API call
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response = await fetch('/api/user/reports/clear', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to clear history");
      }
      
      // Clear the reports state
      setReports([]);
      
      // Add slight delay to show successful operation before closing modal
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Close the modal
      setShowDeleteConfirm(false);
      
      // Update the last fetch time to prevent immediate re-fetch
      setLastFetchTime(Date.now());
    } catch (error) {
      console.error("Error clearing history:", error);
      setError(error instanceof Error ? error.message : "Failed to clear your report history");
    } finally {
      setIsDeleting(false);
    }
  };

  // Fetch user reports with optimized loading and progress indicators
  const fetchReports = useCallback(async (forceRefresh = false) => {
    if (!session?.user?.id) return;
    
    // Check if we've fetched recently (within 5 minutes) and not forcing refresh
    const now = Date.now();
    if (!forceRefresh && lastFetchTime && now - lastFetchTime < 5 * 60 * 1000) {
      console.log("Using cached reports data");
      return;
    }
    
    setIsLoadingReports(true);
    setError(null);
    setLoadingProgress(10);
    setLoadingStage("connecting");
    
    try {
      // Create an AbortController to handle timeouts
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      setLoadingProgress(20);
      setLoadingStage("requesting");
      
      const response = await fetch('/api/user/reports', {
        signal: controller.signal,
        headers: {
          'Cache-Control': forceRefresh ? 'no-cache' : 'max-age=300'
        }
      });
      
      clearTimeout(timeoutId);
      setLoadingProgress(50);
      setLoadingStage("processing");
      
      if (!response.ok) {
        throw new Error("Failed to fetch reports");
      }
      
      // Stream reading for large responses
      const reader = response.body?.getReader();
      
      if (reader) {
        setLoadingProgress(70);
        let result = '';
        
        // Read data in chunks
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          result += new TextDecoder().decode(value);
          setLoadingProgress(Math.min(90, 70 + Math.floor(value.length / 100)));
        }
        
        const data = JSON.parse(result);
        setReports(data);
        setLoadingProgress(100);
        setLoadingStage("complete");
      } else {
        // Fallback if streaming not supported
        const data = await response.json();
        setReports(data);
        setLoadingProgress(100);
        setLoadingStage("complete");
      }
      
      // Update last fetch time
      setLastFetchTime(now);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        console.error("Request timed out");
        setError("Request timed out. Please try refreshing the page.");
      } else {
        console.error("Error fetching reports:", error);
        setError("Failed to load your report history");
      }
    } finally {
      setIsLoadingReports(false);
    }
  }, [session, lastFetchTime]);

  // Fetch reports when session is available
  useEffect(() => {
    if (session?.user?.id) {
      fetchReports(false);
    }
  }, [session, fetchReports]);

  // Add a refresh function that can be called manually
  const refreshReports = () => {
    fetchReports(true);
  };

  // Loading state
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <svg className="inline animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-2 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Format date in a readable way
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Function to check if profile is complete
  const isProfileComplete = () => {
    if (!session?.user) return false;
    return Boolean(
      session.user.state && 
      session.user.dateOfBirth && 
      session.user.gender
    );
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Welcome, {session?.user?.name?.split(' ')[0] || "User"}
          </h1>
          <p className="text-gray-500 mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
          <div>
          <Link
            href="/user/upload"
              className="rounded-md bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2 text-sm font-medium text-white hover:from-indigo-700 hover:to-blue-700 shadow-sm transition-all duration-200 flex items-center"
          >
              <Upload className="mr-2 h-4 w-4" />
              Upload New Report
          </Link>
          </div>
        </div>
      </div>

      {/* Patient profile card with improved design */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 relative">
          <div className="absolute right-0 top-0 opacity-10">
            <svg className="h-32 w-32 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
            </svg>
          </div>
          <div className="flex items-center relative z-10">
            {session?.user?.image ? (
              <div className="h-16 w-16 rounded-full border-2 border-white shadow-md overflow-hidden">
                <img 
                  src={session.user.image} 
                  alt={session?.user?.name || "User"} 
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="h-16 w-16 rounded-full bg-white border-2 border-white shadow-md flex items-center justify-center text-xl font-semibold text-indigo-700">
                {session?.user?.name?.charAt(0) || "U"}
              </div>
            )}
            <div className="ml-4 text-white">
              <h2 className="text-xl font-bold leading-tight">{session?.user?.name || "User"}</h2>
              <p className="text-blue-100 opacity-90 text-sm">{session?.user?.email}</p>
              <div className="flex items-center mt-2 space-x-3">
              {session?.user?.role && (
                  <span className="inline-flex items-center rounded-full bg-blue-100 bg-opacity-20 px-2.5 py-1 text-xs font-medium text-white">
                  {session.user.role === "USER" ? "Patient" : session.user.role}
                </span>
              )}
                {!isProfileComplete() && (
                  <Link 
                    href="/profile" 
                    className="inline-flex items-center rounded-full bg-yellow-100 bg-opacity-20 px-2.5 py-1 text-xs font-medium text-white"
                  >
                    Complete Your Profile
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* User profile summary with card style layout */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-blue-800 mb-2">Gender</h3>
            <p className="text-sm font-medium text-gray-800">
              {session?.user?.gender || "Not specified"}
              {!session?.user?.gender && (
                <Link href="/profile" className="text-blue-600 hover:text-blue-700 text-xs ml-2">
                  Add
                </Link>
              )}
            </p>
                </div>
          <div className="bg-indigo-50 rounded-lg p-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-indigo-800 mb-2">Date of Birth</h3>
            <p className="text-sm font-medium text-gray-800">
              {session?.user?.dateOfBirth 
                ? new Date(session.user.dateOfBirth).toLocaleDateString() 
                : "Not specified"
              }
              {!session?.user?.dateOfBirth && (
                <Link href="/profile" className="text-indigo-600 hover:text-indigo-700 text-xs ml-2">
                  Add
                </Link>
              )}
            </p>
                </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-purple-800 mb-2">State</h3>
            <p className="text-sm font-medium text-gray-800">
              {session?.user?.state || "Not specified"}
              {!session?.user?.state && (
                <Link href="/profile" className="text-purple-600 hover:text-purple-700 text-xs ml-2">
                  Add
                </Link>
              )}
            </p>
                </div>
          <div className="bg-pink-50 rounded-lg p-4">
            <h3 className="text-xs font-medium uppercase tracking-wider text-pink-800 mb-2">Contact</h3>
            <p className="text-sm font-medium text-gray-800">
              {session?.user?.phone || "No phone provided"}
              {!session?.user?.phone && (
                <Link href="/profile" className="text-pink-600 hover:text-pink-700 text-xs ml-2">
                  Add
                </Link>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Two-column layout with independent height sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Medical Report History Section - Will size to its content */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 bg-gradient-to-r from-indigo-500 to-indigo-600 flex justify-between items-center border-b border-gray-200">
            <div>
              <h2 className="text-lg font-medium text-white">Medical Report History</h2>
              <p className="mt-1 text-sm text-indigo-100">
                Your recent medical reports
              </p>
            </div>
            {!isLoadingReports && reports && reports.length > 0 && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center px-2.5 py-1.5 border border-indigo-300 text-xs font-medium rounded text-white hover:bg-indigo-700 focus:outline-none"
              >
                <svg className="mr-1.5 h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear
              </button>
            )}
          </div>

          <div className="p-6">
            {isLoadingReports ? (
              <div className="flex justify-center py-4">
                <svg className="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : !reports || reports.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No reports found</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by uploading a medical report.</p>
                <div className="mt-6">
                  <Link href="/user/upload" className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
                    Upload Report
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {reports.slice(0, 3).map((report) => (
                    <div key={report.id} className="border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
                      <div className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-semibold text-indigo-700 mr-3">
                                {report.hospital?.name?.charAt(0) || "H"}
                              </div>
                              <h3 className="text-base font-semibold text-gray-900">
                                {report.hospital?.name || "Unknown Hospital"}
                              </h3>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                report.status === "QUEUED" ? "bg-green-100 text-green-800" :
                                report.status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                                report.status === "PROCESSED" ? "bg-blue-100 text-blue-800" :
                                "bg-gray-100 text-gray-800"
                              }`}>
                                <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${
                                  report.status === "QUEUED" ? "bg-green-600" :
                                  report.status === "PENDING" ? "bg-yellow-600" :
                                  report.status === "PROCESSED" ? "bg-blue-600" :
                                  "bg-gray-600"
                                }`}></span>
                                {report.status}
                              </span>
                              
                              {report.severity !== null && (
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  report.severity > 7 ? "bg-red-100 text-red-800" :
                                  report.severity > 4 ? "bg-yellow-100 text-yellow-800" :
                                  "bg-green-100 text-green-800"
                                }`}>Severity: {report.severity}/10</span>
                              )}
                              {report.queuePosition !== null && (
                                <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                                  Queue: #{report.queuePosition}
                                </span>
                              )}
                            </div>
                            <div className="mt-3 flex items-center text-xs text-gray-500">
                              <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                              </svg>
                              {formatDate(report.uploatedAt)}
                              {report.doctor && (
                                <span className="ml-4 flex items-center">
                                  <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  {report.doctor.name}
                                </span>
                              )}
                            </div>
                          </div>
                          <Link 
                            href={`/user/report/${report.id}`} 
                            className="inline-flex items-center px-3 py-1 border border-indigo-300 text-sm rounded-md text-indigo-600 bg-white hover:bg-indigo-50 shadow-sm hover:shadow transition-all duration-200"
                          >
                            <svg className="mr-1.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Details
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 text-center">
                  <button 
                    onClick={refreshReports}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <svg className="mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh Reports
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Appointments Section - Will size to its content */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 bg-gradient-to-r from-purple-500 to-purple-600 flex justify-between items-center border-b border-gray-200">
            <div>
              <h2 className="text-lg font-medium text-white">Your Appointments</h2>
              <p className="mt-1 text-sm text-purple-100">
                Upcoming and recent appointments
              </p>
            </div>
            <Link
              href="/user/appointments/new"
              className="inline-flex items-center px-3 py-2 border border-purple-300 text-sm leading-4 font-medium rounded-md shadow-sm text-white hover:bg-purple-700 focus:outline-none"
            >
              <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Schedule
            </Link>
          </div>
          <div className="p-6">
            <AppointmentListWrapper limit={3} status="all" />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
                <button
                  onClick={refreshReports}
                  className="mt-2 text-sm font-medium text-red-700 hover:text-red-800"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Delete confirmation modal */}
        {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={(e) => {
                e.stopPropagation();
                if (!isDeleting) setShowDeleteConfirm(false);
              }}>
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <div 
                className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full z-50 relative"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                      <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">Clear All History</h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Are you sure you want to clear your entire report history? This action cannot be undone and all your report records will be permanently deleted.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm relative z-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearAllHistory();
                    }}
                    disabled={isDeleting}
                    style={{ pointerEvents: 'auto' }}
                  >
                    {isDeleting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Deleting...
                      </>
                    ) : (
                      "Clear All"
                    )}
                  </button>
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm relative z-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(false);
                    }}
                    disabled={isDeleting}
                    style={{ pointerEvents: 'auto' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* AI Chatbot Modal */}
      {session?.user?.id && (
        <AIChatbot
          isOpen={isChatbotOpen}
          onClose={() => setIsChatbotOpen(false)}
          patientId={session.user.id}
        />
      )}
    </div>
  );
} 