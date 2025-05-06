"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Appointment, AppointmentStatus } from "@/types";
import { use } from "react";

type AppointmentDetailProps = {
  params: {
    id: string;
  };
};

export default function AppointmentDetail({ params }: AppointmentDetailProps) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  const [recommendedSpecialty, setRecommendedSpecialty] = useState<string>("");

  // Fetch appointment details
  useEffect(() => {
    async function fetchAppointmentDetails() {
      try {
        setLoading(true);
        
        // Set up fetch request with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          if (!controller.signal.aborted) {
            controller.abort('timeout');
          }
        }, 8000); // 8-second timeout
        
        console.log(`🔄 Fetching appointment details for ID: ${id} at ${new Date().toISOString()}`);
        
        let response: Response | null = null;
        
        try {
          response = await fetch(`/api/appointments/${id}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache'
            },
            credentials: 'include' as RequestCredentials,
            signal: controller.signal
          });
          
          console.log(`🔍 Response from appointments endpoint: ${response.status} ${response.statusText}`);
        } catch (networkError) {
          console.error(`❌ Network error from appointments endpoint:`, networkError);
          
          // Try one more time with a new controller
          try {
            console.log(`🔄 Retrying appointment fetch with fresh connection...`);
            const retryController = new AbortController();
            
            response = await fetch(`/api/appointments/${id}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
              },
              credentials: 'include' as RequestCredentials,
              signal: retryController.signal
            });
            
            console.log(`🔍 Retry response: ${response.status} ${response.statusText}`);
          } catch (retryError) {
            console.error(`❌ Retry attempt failed:`, retryError);
            throw new Error("Unable to connect to the server. Please check your connection and try again.");
          }
        } finally {
          // Clear the timeout
          clearTimeout(timeoutId);
        }
        
        if (!response) {
          throw new Error("No response received from server");
        }
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Appointment not found");
          } else if (response.status === 403) {
            console.warn("Permission error received but proceeding anyway");
          } else if (response.status === 401) {
            router.push('/login');
            throw new Error("Session expired. Please log in again.");
          } else {
            throw new Error("Failed to fetch appointment details");
          }
        }
        
        // Process successful response
        try {
          const data = await response.json();
          console.log(`✅ Successfully retrieved appointment data for ID: ${id}`);
          setAppointment(data);
          
          // Determine recommended specialty from AI analysis
          if (data.aiAnalysis) {
            setRecommendedSpecialty(determineSpecialtyFromAnalysis(data.aiAnalysis));
          }
        } catch (parseError) {
          console.error("❌ Error parsing JSON response:", parseError);
          throw new Error("Failed to parse server response. Please try again.");
        }
      } catch (error) {
        console.error("Error fetching appointment details:", error);
        setError((error as Error).message || "Failed to load appointment details");
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchAppointmentDetails();
    }
  }, [id, router]);

  // Function to determine specialty from AI analysis
  const determineSpecialtyFromAnalysis = (aiAnalysis: string): string => {
    const analysis = aiAnalysis.toLowerCase();
    
    // Look for direct specialty recommendations in the analysis
    const specialtyMatch = analysis.match(/specialist recommendation:?\s*([a-zA-Z\s]+)(?:\.|$|\n)/i);
    if (specialtyMatch && specialtyMatch[1]) {
      return specialtyMatch[1].trim();
    }

    // Map common conditions to specialties
    if (analysis.includes('heart') || analysis.includes('chest pain') || analysis.includes('cardiac')) {
      return 'Cardiology';
    } else if (analysis.includes('brain') || analysis.includes('headache') || analysis.includes('neural') || 
              analysis.includes('seizure') || analysis.includes('stroke')) {
      return 'Neurology';
    } else if (analysis.includes('bone') || analysis.includes('fracture') || analysis.includes('joint') || 
              analysis.includes('sprain')) {
      return 'Orthopedics';
    } else if (analysis.includes('child') || analysis.includes('infant') || analysis.includes('pediatric')) {
      return 'Pediatrics';
    } else if (analysis.includes('skin') || analysis.includes('rash') || analysis.includes('acne')) {
      return 'Dermatology';
    } else if (analysis.includes('eye') || analysis.includes('vision') || analysis.includes('sight')) {
      return 'Ophthalmology';
    } else if (analysis.includes('mental') || analysis.includes('anxiety') || analysis.includes('depression')) {
      return 'Psychiatry';
    } else if (analysis.includes('emergency') || analysis.includes('urgent') || analysis.includes('critical')) {
      return 'Emergency Medicine';
    }
    
    // Default to general medicine
    return 'General Medicine';
  };

  // Format date string
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  // Get status badge
  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-sm font-medium text-yellow-800">
            Pending
          </span>
        );
      case "CONFIRMED":
        return (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-sm font-medium text-green-800">
            Confirmed
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-sm font-medium text-blue-800">
            Completed
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-800">
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  // Get severity badge
  const getSeverityBadge = (severity: number) => {
    if (severity >= 8) {
      return (
        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-sm font-medium text-red-800">
          High Priority (Severity: {severity}/10)
        </span>
      );
    } else if (severity >= 4) {
      return (
        <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-sm font-medium text-orange-800">
          Medium Priority (Severity: {severity}/10)
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-sm font-medium text-green-800">
          Low Priority (Severity: {severity}/10)
        </span>
      );
    }
  };

  // Handle appointment cancellation
  const handleCancel = async () => {
    if (!appointment) return;
    
    if (!confirm("Are you sure you want to cancel this appointment?")) {
      return;
    }
    
    try {
      setCancelling(true);
      
      // Set up fetch request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        if (!controller.signal.aborted) {
          controller.abort('timeout');
        }
      }, 8000); // 8-second timeout
      
      console.log(`🔄 Sending cancel request for appointment: ${id}`);
      
      let response: Response | null = null;
      
      try {
        response = await fetch(`/api/appointments/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache"
          },
          body: JSON.stringify({
            status: "CANCELLED",
          }),
          credentials: 'include' as RequestCredentials,
          signal: controller.signal
        });
        
        console.log(`🔍 Response from cancel endpoint: ${response.status} ${response.statusText}`);
      } catch (networkError) {
        console.error(`❌ Network error cancelling appointment:`, networkError);
        throw new Error("Unable to connect to the server. Please check your connection and try again.");
      } finally {
        // Clear the timeout
        clearTimeout(timeoutId);
      }
      
      if (!response) {
        throw new Error("No response received from server");
      }
      
      if (!response.ok) {
        let errorMessage = "Failed to cancel appointment";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // Ignore parse errors
        }
        
        if (response.status === 401) {
          router.push('/login');
          throw new Error("Session expired. Please log in again.");
        }
        
        throw new Error(errorMessage);
      }
      
      const updatedAppointment = await response.json();
      setAppointment(updatedAppointment);
      
      // Show success notification
      alert("Appointment successfully cancelled");
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      alert((error as Error).message || "Failed to cancel the appointment. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  // Format the full AI analysis for the modal
  const formatFullAiAnalysis = (analysis: string | undefined) => {
    if (!analysis) return <p className="text-gray-500">No analysis available</p>;
    
    // Clean the analysis text if needed
    let cleanedAnalysis = analysis;
    if (analysis.startsWith("Okay, I will analyze") || analysis.startsWith("I will analyze")) {
      const firstHeadingMatch = analysis.match(/\*\*(\d+\. Initial Assessment:|\d+\. [A-Z])|^\d+\./m);
      if (firstHeadingMatch && firstHeadingMatch.index) {
        cleanedAnalysis = analysis.substring(firstHeadingMatch.index);
      }
    }
    
    // Split by lines and format with appropriate styling
    return (
      <div className="prose prose-indigo max-w-none">
        {cleanedAnalysis.split('\n').map((line, i) => {
          // Apply different styling based on line content
          if (line.match(/^\d+\.\s*[A-Z]/)) {
            // Section headers (e.g., "1. Initial Assessment:")
            return <h3 key={i} className="text-lg font-semibold text-indigo-700 mt-4">{line}</h3>;
          } else if (line.match(/^(\*\*[^*]+\*\*)/)) {
            // Bold text sections
            return <h4 key={i} className="font-semibold text-gray-900 mt-3">{line.replace(/\*\*/g, '')}</h4>;
          } else if (line.match(/^\s*\*\s+[A-Z]/)) {
            // Bullet points
            return <li key={i} className="text-gray-700 ml-4">{line.replace(/^\s*\*\s+/, '')}</li>;
          } else if (line.match(/Severity:\s*\d+\/10/) || line.match(/Priority:\s*(Low|Medium|High)/i)) {
            // Severity or priority indicators
            return <p key={i} className="font-semibold text-indigo-600">{line}</p>;
          } else if (line.trim() === '') {
            // Empty lines
            return <div key={i} className="h-2"></div>;
          } else {
            // Regular text
            return <p key={i} className="text-gray-700">{line}</p>;
          }
        })}
      </div>
    );
  };

  // Format AI analysis for display
  const formatAiAnalysis = (analysis: string | undefined) => {
    if (!analysis) return <p className="text-gray-500">No analysis available</p>;
    
    // If it starts with "Okay, I will analyze" or similar prompt text, remove that part
    let cleanedAnalysis = analysis;
    if (analysis.startsWith("Okay, I will analyze") || analysis.startsWith("I will analyze")) {
      const firstHeadingMatch = analysis.match(/\*\*(\d+\. Initial Assessment:|\d+\. [A-Z])|^\d+\./m);
      if (firstHeadingMatch && firstHeadingMatch.index) {
        cleanedAnalysis = analysis.substring(firstHeadingMatch.index);
      }
    }
    
    // Show a preview of the full analysis with some formatting
    const previewLines = cleanedAnalysis.split('\n').slice(0, 8); // Show first 8 lines by default
    
    return (
      <div className="prose prose-sm max-w-none">
        <div className="bg-indigo-50 p-3 rounded-md border border-indigo-100 mb-3">
          {previewLines.map((line, i) => (
            <p key={i} className={`${
              line.match(/^\d+\.\s*[A-Z]/) ? "font-semibold text-indigo-700 text-base" :
              line.match(/^(\*\*[^*]+\*\*)/) ? "font-medium text-gray-900" :
              line.match(/Severity:\s*\d+\/10/) ? "font-medium text-indigo-600" :
              "text-gray-700"
            } ${i > 0 ? "mt-1" : ""} text-sm`}>
              {line.replace(/\*\*/g, '')}
            </p>
          ))}
          
          {cleanedAnalysis.split('\n').length > 8 && (
            <p className="text-gray-500 text-xs mt-2">...and more details in full analysis</p>
          )}
        </div>
        
        {/* Add a prominent button to view full analysis */}
        <button 
          onClick={() => setShowFullAnalysis(true)}
          className="w-full mt-2 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          View Full AI Analysis
        </button>
      </div>
    );
  };

  // Full Analysis Modal
  const FullAnalysisModal = () => {
    if (!showFullAnalysis) return null;
    
    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Full AI Analysis</h3>
            <button 
              onClick={() => setShowFullAnalysis(false)}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 px-6 py-4 overflow-auto">
            {formatFullAiAnalysis(appointment?.aiAnalysis)}
          </div>
          <div className="px-6 py-3 border-t border-gray-200 flex justify-end">
            <button
              onClick={() => setShowFullAnalysis(false)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-500 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
        <p className="mt-4 text-gray-500">Loading appointment details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
        <div className="flex">
          <div className="py-1">
            <svg className="fill-current h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z"/>
            </svg>
          </div>
          <div>
            <p className="font-bold">Error</p>
            <p className="text-sm">{error}</p>
            <div className="mt-4">
              <Link
                href="/user/appointments"
                className="text-red-700 font-medium hover:text-red-600"
              >
                &larr; Back to Appointments
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Appointment not found</p>
        <div className="mt-4">
          <Link
            href="/user/appointments"
            className="text-indigo-600 font-medium hover:text-indigo-500"
          >
            &larr; Back to Appointments
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Appointment Details</h1>
        <Link
          href="/user/appointments"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          &larr; Back to Appointments
        </Link>
      </div>

      {/* Hospital and Status Info */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {appointment.hospital?.name || "Hospital"}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              {appointment.hospital?.address}, {appointment.hospital?.city}, {appointment.hospital?.state}
            </p>
          </div>
          <div className="flex space-x-3">
            {getStatusBadge(appointment.status)}
            {appointment.severity && getSeverityBadge(appointment.severity)}
          </div>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Preferred Date</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {formatDate(appointment.preferredDate)}
              </dd>
            </div>
            
            {appointment.scheduledDate && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Scheduled Date</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  {formatDate(appointment.scheduledDate)}
                </dd>
              </div>
            )}
            
            {appointment.doctor && (
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Assigned Doctor</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-indigo-100 rounded-full p-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <div className="font-medium">{appointment.doctor.name}</div>
                      <div className="text-indigo-600">{appointment.doctor.specialty}</div>
                      {appointment.status === "PENDING" && (
                        <div className="mt-1 text-sm text-green-600">
                          A doctor has been automatically assigned based on your symptoms. The hospital will confirm the appointment soon.
                        </div>
                      )}
                    </div>
                  </div>
                </dd>
              </div>
            )}
            
            <div className={`bg-${appointment.doctor ? "white" : "gray-50"} px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6`}>
              <dt className="text-sm font-medium text-gray-500">Symptoms</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {appointment.symptoms}
              </dd>
            </div>
            
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">AI Analysis</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                <div className="space-y-1">
                  {formatAiAnalysis(appointment.aiAnalysis)}
                </div>
              </dd>
            </div>
            
            {/* Recommended Specialty */}
            {appointment.status === "PENDING" && recommendedSpecialty && (
              <div className="bg-indigo-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 border-l-4 border-indigo-500">
                <dt className="text-sm font-medium text-indigo-800">Recommended Specialist</dt>
                <dd className="mt-1 text-sm text-indigo-800 sm:col-span-2 sm:mt-0">
                  <div className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600 mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="font-medium text-indigo-900">{recommendedSpecialty}</p>
                      <p className="text-sm text-indigo-700 mt-1">
                        Based on your symptoms, we recommend seeing a {recommendedSpecialty.toLowerCase()} specialist.
                        The hospital will try to assign you to the appropriate doctor.
                      </p>
                    </div>
                  </div>
                </dd>
              </div>
            )}
            
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Created At</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {formatDate(appointment.createdAt)}
              </dd>
            </div>
          </dl>
        </div>
        
        {/* Action buttons */}
        {appointment.status === "PENDING" && (
          <div className="px-4 py-5 sm:px-6 border-t border-gray-200">
            <div className="flex justify-end">
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm ${
                  cancelling
                    ? "bg-gray-300 cursor-not-allowed"
                    : "text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                }`}
              >
                {cancelling ? "Cancelling..." : "Cancel Appointment"}
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Full Analysis Modal */}
      <FullAnalysisModal />
    </div>
  );
} 