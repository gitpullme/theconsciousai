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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hospital Dashboard</h1>
          <p className="text-xs text-gray-500 mt-1">
            Last updated: {formatLastUpdated()}
            {(loadingQueue || loadingDoctors) ? " • Refreshing..." : ""}
          </p>
        </div>
        <div>
          <button
            onClick={handleRefresh}
            disabled={loadingQueue || loadingDoctors}
            className={`rounded-md px-3 py-2 text-sm font-medium shadow-sm ring-1 ring-inset ${
              (loadingQueue || loadingDoctors) 
                ? 'bg-gray-100 text-gray-400 ring-gray-200 cursor-not-allowed' 
                : 'bg-white text-gray-700 ring-gray-300 hover:bg-gray-50'
            }`}
          >
            {loadingQueue || loadingDoctors ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Refreshing...
              </span>
            ) : "Refresh Data"}
          </button>
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
                className="rounded-md bg-red-50 px-2 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-3 py-2 border-b-2 font-medium text-sm ${
              activeTab === 'queue'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            Patient Queue
          </button>
          <button
            onClick={() => setActiveTab('doctors')}
            className={`ml-8 px-3 py-2 border-b-2 font-medium text-sm ${
              activeTab === 'doctors'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-700 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            Hospital Staff
          </button>
        </nav>
      </div>

      {/* Tab content */}
      {activeTab === 'queue' ? (
        // Queue tab
        <>
          {loadingQueue && queue.length === 0 ? (
            <div className="text-center py-12">
              <svg className="animate-spin h-8 w-8 text-indigo-500 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-600">Loading patient queue...</p>
            </div>
          ) : queue.length === 0 ? (
            <div className="rounded-md bg-gray-50 p-8 text-center">
              <h3 className="mt-2 text-sm font-medium text-gray-900">No patients in queue</h3>
              <p className="mt-1 text-sm text-gray-500">
                The queue is currently empty.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden bg-white shadow sm:rounded-md">
              <ul role="list" className="divide-y divide-gray-200">
                {queue.map((item) => (
                  <li key={item.id} className="px-0 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-lg font-semibold text-indigo-800">
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
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-700">
                              {item.user.name?.charAt(0) || "U"}
                            </div>
                          )}
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{item.user.name}</p>
                            <p className="text-xs text-gray-600">{item.user.email}</p>
                            {item.doctor && (
                              <p className="text-xs text-indigo-600 mt-1">
                                Assigned to: {item.doctor.name} ({item.doctor.specialty})
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
                          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 mr-2"
                        >
                          {expandedReport === item.id ? "Hide Details" : "View Details"}
                        </button>
                        <button
                          onClick={() => handleCompleteReport(item.id)}
                          disabled={processingReport === item.id}
                          className={`inline-flex items-center rounded-md border ${
                            processingReport === item.id
                              ? 'border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed'
                              : 'border-transparent bg-indigo-600 text-white hover:bg-indigo-700'
                          } px-3 py-2 text-sm font-medium leading-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
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
                      <div className="mt-4 ml-14 bg-gray-50 p-4 rounded-md">
                        <h4 className="font-medium text-gray-900 mb-2">AI Analysis</h4>
                        <div className="text-sm">
                          {item.aiAnalysis ? (
                            <div className="space-y-1">
                              {formatAiAnalysis(item.aiAnalysis)}
                            </div>
                          ) : (
                            <p className="text-gray-500">No analysis available</p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-1 ml-14">
                      <p className="text-xs text-gray-400">
                        Uploaded {new Date(item.uploatedAt).toLocaleString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        // Doctors tab
        <>
          {loadingDoctors && doctors.length === 0 ? (
            <div className="text-center py-12">
              <svg className="animate-spin h-8 w-8 text-indigo-500 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-600">Loading hospital staff...</p>
            </div>
          ) : (
            <div className="overflow-hidden bg-white shadow sm:rounded-md">
              <div className="px-4 py-5 sm:px-6 bg-gray-50">
                <h3 className="text-base font-semibold leading-6 text-gray-900">Hospital Staff</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  List of doctors and their current patients
                </p>
              </div>
              {doctors.length === 0 ? (
                <div className="p-6 text-center text-gray-700">
                  No doctors available. Add hospital staff from settings.
                </div>
              ) : (
                <ul role="list" className="divide-y divide-gray-200">
                  {doctors.map((doctor, index) => (
                    <li key={doctor.id} className={`px-4 py-4 sm:px-6 ${index === 0 && doctor.patientCount > 0 ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center">
                            <h4 className="text-lg font-medium text-gray-900">{doctor.name}</h4>
                            {index === 0 && doctor.patientCount > 0 && (
                              <span className="ml-2 inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                                Highest Load
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center">
                            <span className="mr-2 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                              {doctor.specialty}
                            </span>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${doctor.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {doctor.available ? 'Available' : 'Busy'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-900">Current Patients</div>
                          <div className={`mt-1 text-lg font-semibold ${doctor.patientCount > 0 ? 'text-indigo-600' : 'text-gray-700'}`}>{doctor.patientCount}</div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
} 