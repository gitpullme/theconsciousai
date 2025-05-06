"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type QueueItem = {
  id: string;
  queuePosition: number;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  condition?: string;
  severity?: number;
  uploatedAt: string;
  aiAnalysis?: string;
  status: string;
  doctor?: {
    id: string;
    name: string;
    specialty: string;
  } | null;
};

type Doctor = {
  id: string;
  name: string;
  specialty: string;
  available: boolean;
  patientCount: number;
};

export default function HospitalDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'queue' | 'doctors'>('queue');
  const [lastFetched, setLastFetched] = useState(0);
  const [processingReport, setProcessingReport] = useState<string | null>(null);
  
  // Fetch queue with timeout protection
  const fetchQueue = useCallback(async () => {
    setLoadingQueue(true);
    setError(null);
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    try {
      const response = await fetch("/api/hospital/queue", {
        signal: controller.signal,
        cache: 'no-store',
        headers: { 'x-timestamp': Date.now().toString() }
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        throw new Error("Failed to fetch queue data");
      }
      
      const data = await response.json();
      setQueue(data);
      setLastFetched(Date.now());
    } catch (error) {
      console.error("Error fetching queue:", error);
      
      if (error instanceof DOMException && error.name === "AbortError") {
        setError("Request timed out. Please try again.");
      } else {
        setError("Failed to load patient queue. Please refresh.");
      }
    } finally {
      setLoadingQueue(false);
    }
  }, []);

  // Fetch doctors with timeout protection
  const fetchDoctors = useCallback(async () => {
    setLoadingDoctors(true);
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    try {
      const response = await fetch("/api/hospital/doctors", {
        signal: controller.signal,
        cache: 'no-store',
        headers: { 'x-timestamp': Date.now().toString() }
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        throw new Error("Failed to fetch doctors data");
      }
      
      const data = await response.json();
      setDoctors(data);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      // Don't show two error messages, queue error is enough
    } finally {
      setLoadingDoctors(false);
    }
  }, []);

  // Handle completion of a report
  const handleCompleteReport = useCallback(async (reportId: string) => {
    if (processingReport) return;
    
    setProcessingReport(reportId);
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
          
          const response = await fetch(`/api/reports/${reportId}/complete`, {
            method: "POST",
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        throw new Error("Failed to complete visit");
      }
      
      // Refresh queue after successful completion
      fetchQueue();
      fetchDoctors();
    } catch (error) {
      console.error("Error completing visit:", error);
      setError("Failed to complete patient visit. Please try again.");
    } finally {
      setProcessingReport(null);
    }
  }, [fetchQueue, fetchDoctors, processingReport]);

  // Initial data load
  useEffect(() => {
    // Check authentication
    if (status === "loading") return;
    
    if (status !== "authenticated" || session?.user?.role !== "HOSPITAL") {
      router.push("/");
      return;
    }
    
    // Initial data fetch
    fetchQueue();
    fetchDoctors();
    
    // Set up refresh interval - every 60 seconds
    const intervalId = setInterval(() => {
      fetchQueue();
      fetchDoctors();
    }, 60000);
    
    // Clean up on unmount
    return () => clearInterval(intervalId);
  }, [status, session, router, fetchQueue, fetchDoctors]);

  // Format time since last update
  const formatLastUpdated = () => {
    if (lastFetched === 0) return "Never";
    
    const now = Date.now();
    const diff = now - lastFetched;
    
    if (diff < 60000) {
      return `${Math.floor(diff / 1000)} seconds ago`;
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)} minutes ago`;
    } else {
      return new Date(lastFetched).toLocaleTimeString();
    }
  };

  // Handle manual refresh
  const handleRefresh = () => {
    if (loadingQueue || loadingDoctors) return;
    
    fetchQueue();
    fetchDoctors();
  };

  // Handle expanding a report's details
  const toggleExpandReport = (reportId: string) => {
    setExpandedReport(prev => prev === reportId ? null : reportId);
  };

  // Determine severity badge color
  const getPriorityBadgeColor = (severity: number | undefined) => {
    if (!severity) return "bg-gray-100 text-gray-800 border border-gray-200";
    if (severity >= 8) return "bg-red-100 text-red-800 border border-red-200";
    if (severity >= 6) return "bg-orange-100 text-orange-800 border border-orange-200";
    if (severity >= 4) return "bg-yellow-100 text-yellow-800 border border-yellow-200";
    return "bg-green-100 text-green-800 border border-green-200";
  };

  // Format AI analysis for display
  const formatAiAnalysis = (analysis: string) => {
    if (!analysis) return null;
    
    return analysis.split('\n').map((line, i) => (
      <p key={i} className={`${line.includes('Severity:') ? 'font-medium' : ''} mb-1`}>
        {line}
      </p>
    ));
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Section with improved styling and hospital name */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-lg shadow-md p-6 border border-indigo-500">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold text-white flex items-center">
              <span>{session?.user?.name || "Hospital"}</span>
              <span className="ml-2 bg-white bg-opacity-20 text-xs font-medium px-2.5 py-1 rounded-full">Dashboard</span>
            </h1>
            <p className="text-xs text-indigo-100 mt-1 flex items-center">
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            Last updated: {formatLastUpdated()}
              </span>
              {(loadingQueue || loadingDoctors) && (
                <span className="ml-2 flex items-center">
                  <svg className="animate-spin h-3 w-3 mr-1 text-indigo-100" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Refreshing...
                </span>
              )}
          </p>
        </div>
          <button
            onClick={handleRefresh}
            disabled={loadingQueue || loadingDoctors}
            className={`flex items-center rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              loadingQueue || loadingDoctors
                ? 'bg-white bg-opacity-10 text-indigo-100 cursor-not-allowed'
                : 'bg-white text-indigo-600 hover:bg-opacity-90 shadow-sm'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`mr-2 h-4 w-4 ${loadingQueue || loadingDoctors ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
            {loadingQueue || loadingDoctors ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Error alert with improved styling */}
      {error && (
        <div className="rounded-lg bg-red-50 p-4 border border-red-200 shadow-sm">
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
            <div className="ml-3 flex-grow">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={handleRefresh}
                disabled={loadingQueue || loadingDoctors}
                className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100 transition-colors duration-150 shadow-sm"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Overview Cards with improved animations and styling */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-scaleIn">
        <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg shadow-sm p-6 border border-teal-200 relative overflow-hidden hover:shadow-md transition-shadow duration-300">
          <div className="absolute right-0 top-0 w-24 h-24 rounded-bl-full bg-teal-500 bg-opacity-10"></div>
          <div className="flex items-center relative z-10">
            <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-full p-3 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-teal-800">Patients in Queue</h2>
              <p className="text-2xl font-bold text-teal-900">{queue.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg shadow-sm p-6 border border-purple-200 relative overflow-hidden hover:shadow-md transition-shadow duration-300">
          <div className="absolute right-0 top-0 w-24 h-24 rounded-bl-full bg-purple-500 bg-opacity-10"></div>
          <div className="flex items-center relative z-10">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-full p-3 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-purple-800">Available Doctors</h2>
              <p className="text-2xl font-bold text-purple-900">
                {doctors.filter(d => d.available).length} / {doctors.length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg shadow-sm p-6 border border-amber-200 relative overflow-hidden hover:shadow-md transition-shadow duration-300">
          <div className="absolute right-0 top-0 w-24 h-24 rounded-bl-full bg-amber-500 bg-opacity-10"></div>
          <div className="flex items-center relative z-10">
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-full p-3 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h2 className="text-sm font-medium text-amber-800">High Priority Patients</h2>
              <p className="text-2xl font-bold text-amber-900">
                {queue.filter(item => item.severity && item.severity >= 7).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Improved Tab Navigation with colorful indicator */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
        <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-200 px-6">
          <nav className="flex space-x-1" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('queue')}
              className={`relative px-4 py-4 font-medium text-sm focus:outline-none transition-colors duration-200 ${
              activeTab === 'queue'
                  ? 'text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${activeTab === 'queue' ? 'text-blue-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>Patient Queue</span>
                {loadingQueue && activeTab !== 'queue' && (
                  <span className="flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                )}
              </span>
              {activeTab === 'queue' && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-400 to-indigo-600"></span>
              )}
          </button>
          <button
            onClick={() => setActiveTab('doctors')}
              className={`relative px-4 py-4 font-medium text-sm focus:outline-none transition-colors duration-200 ${
              activeTab === 'doctors'
                  ? 'text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${activeTab === 'doctors' ? 'text-blue-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Hospital Staff</span>
                {loadingDoctors && activeTab !== 'doctors' && (
                  <span className="flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                )}
              </span>
              {activeTab === 'doctors' && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-400 to-indigo-600"></span>
              )}
          </button>
        </nav>
      </div>

        {/* Tab content with improved styling */}
        <div className="p-6">
      {activeTab === 'queue' ? (
        // Queue tab
        <>
          {loadingQueue && queue.length === 0 ? (
            <div className="text-center py-12">
                  <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
                  <p className="text-blue-600">Loading patient queue...</p>
            </div>
          ) : queue.length === 0 ? (
            <div className="rounded-md bg-gray-50 p-8 text-center">
              <h3 className="mt-2 text-sm font-medium text-gray-900">No patients in queue</h3>
              <p className="mt-1 text-sm text-gray-500">
                The queue is currently empty.
              </p>
            </div>
          ) : (
                <div className="space-y-4">
                {queue.map((item) => (
                    <div key={item.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
                      <div className={`p-4 ${item.severity && item.severity >= 8 ? 'border-l-4 border-red-500' : item.severity && item.severity >= 6 ? 'border-l-4 border-orange-500' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-lg font-semibold text-blue-700 border border-blue-200">
                          {item.queuePosition}
                        </div>
                        <div className="ml-4 flex items-center">
                          {item.user.image ? (
                              <Image
                                className="h-10 w-10 rounded-full"
                                src={item.user.image}
                                alt=""
                                width={40}
                                height={40}
                              />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 border border-indigo-200">
                              {item.user.name?.charAt(0) || "U"}
                                </div>
                              )}
                              <div className="ml-3">
                                <p className="text-sm font-medium text-gray-900">{item.user.name}</p>
                                <p className="text-xs text-gray-500">{item.user.email}</p>
                              {item.doctor && (
                                  <p className="text-xs text-blue-600 mt-1 flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                      </svg>
                                    Assigned: {item.doctor.name} ({item.doctor.specialty})
                                </p>
                              )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center">
                        {item.severity !== null && (
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium mr-3 ${
                              getPriorityBadgeColor(item.severity)
                            }`}
                          >
                            Severity: {item.severity}/10
                          </span>
                        )}
                        <button
                          onClick={() => toggleExpandReport(item.id)}
                              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-700 shadow-sm hover:bg-gray-50 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 mr-2"
                        >
                          {expandedReport === item.id ? "Hide Details" : "View Details"}
                        </button>
                          <button
                            onClick={() => handleCompleteReport(item.id)}
                            disabled={processingReport === item.id}
                            className={`inline-flex items-center rounded-md border ${
                              processingReport === item.id
                                ? 'border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed'
                                  : 'border-transparent bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-150'
                              } px-3 py-2 text-sm font-medium leading-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                          >
                            {processingReport === item.id ? (
                              <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing...
                              </span>
                            ) : "Complete Visit"}
                          </button>
                      </div>
                    </div>
                    
                    {expandedReport === item.id && (
                          <div className="mt-4 ml-14 bg-blue-50 p-4 rounded-md border border-blue-200">
                            <h4 className="font-medium text-blue-800 mb-2">AI Analysis</h4>
                        <div className="text-sm">
                          {item.aiAnalysis ? (
                                <div className="space-y-1 text-blue-700">
                              {formatAiAnalysis(item.aiAnalysis)}
                            </div>
                          ) : (
                                <p className="text-blue-500">No analysis available</p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-1 ml-14">
                      <p className="text-xs text-gray-400">
                            Uploaded {new Date(item.uploatedAt).toLocaleString()}
                      </p>
                        </div>
                      </div>
                    </div>
                ))}
            </div>
          )}
        </>
      ) : (
            // Doctors tab with improved and colorful styling
        <>
          {loadingDoctors && doctors.length === 0 ? (
            <div className="text-center py-12">
                  <svg className="animate-spin h-8 w-8 text-purple-500 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
                  <p className="text-purple-600">Loading hospital staff...</p>
            </div>
          ) : (
                <div className="overflow-hidden bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div className="px-6 py-4 bg-purple-50 border-b border-purple-200">
                    <h3 className="text-base font-semibold leading-6 text-purple-900">Hospital Staff</h3>
                    <p className="mt-1 max-w-2xl text-sm text-purple-500">
                  List of doctors and their current patients
                </p>
              </div>
              {doctors.length === 0 ? (
                <div className="p-6 text-center text-gray-700">
                  No doctors available. Add hospital staff from settings.
                </div>
              ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                  {doctors.map((doctor, index) => (
                        <div 
                          key={doctor.id} 
                          className={`p-4 rounded-lg border transition-shadow duration-200 hover:shadow ${
                            index === 0 && doctor.patientCount > 0 
                              ? 'bg-purple-50 border-purple-300 shadow-sm' 
                              : doctor.available ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                          }`}
                        >
                          <div className="flex flex-col h-full">
                      <div className="flex items-center justify-between">
                          <div className="flex items-center">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-medium ${
                                  doctor.available ? 'bg-green-600' : 'bg-red-600'
                                }`}>
                                  {doctor.name.charAt(0)}
                                </div>
                                <div className="ml-3">
                            <h4 className="text-lg font-medium text-gray-900">{doctor.name}</h4>
                            {index === 0 && doctor.patientCount > 0 && (
                                    <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 border border-purple-200">
                                Highest Load
                              </span>
                            )}
                          </div>
                              </div>
                              <div className={`text-xl font-bold ${
                                doctor.patientCount > 0 
                                  ? 'text-purple-700' 
                                  : 'text-gray-500'
                              }`}>
                                {doctor.patientCount}
                              </div>
                            </div>
                            
                            <div className="mt-4 flex items-center justify-between">
                              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 border border-blue-200">
                              {doctor.specialty}
                            </span>
                              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                doctor.available 
                                  ? 'bg-green-100 text-green-800 border border-green-200' 
                                  : 'bg-red-100 text-red-800 border border-red-200'
                              }`}>
                              {doctor.available ? 'Available' : 'Busy'}
                            </span>
                          </div>
                        </div>
                        </div>
                      ))}
                      </div>
              )}
            </div>
          )}
        </>
      )}
        </div>
      </div>
    </div>
  );
} 