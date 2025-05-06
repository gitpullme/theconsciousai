"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { use } from "react";

type AppointmentDetailProps = {
  params: {
    id: string;
  };
};

export default function HospitalAppointmentDetail({ params }: AppointmentDetailProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;
  
  const [appointment, setAppointment] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  const [recommendedSpecialty, setRecommendedSpecialty] = useState<string>("");

  // Fetch appointment details
  const fetchAppointmentDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/appointments/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Appointment not found");
        }
        throw new Error("Failed to fetch appointment details");
      }
      
      const data = await response.json();
      setAppointment(data);
      if (data.doctorId) {
        setSelectedDoctor(data.doctorId);
      }
    } catch (error) {
      console.error("Error fetching appointment details:", error);
      setError((error as Error).message || "Failed to load appointment details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Fetch doctors
  const fetchDoctors = useCallback(async () => {
    try {
      const response = await fetch("/api/hospital/doctors");
      
      if (!response.ok) {
        throw new Error("Failed to fetch doctors");
      }
      
      const data = await response.json();
      setDoctors(data);
    } catch (error) {
      console.error("Error fetching doctors:", error);
    }
  }, []);

  // Load initial data
  useEffect(() => {
    if (status === "loading") return;
    
    if (status !== "authenticated" || session?.user?.role !== "HOSPITAL") {
      router.push("/");
      return;
    }
    
    fetchAppointmentDetails();
    fetchDoctors();
  }, [status, session, router, fetchAppointmentDetails, fetchDoctors]);

  // Determine recommended specialty from AI analysis
  useEffect(() => {
    if (appointment?.aiAnalysis) {
      const specialty = determineSpecialtyFromAnalysis(appointment.aiAnalysis);
      setRecommendedSpecialty(specialty);
    }
  }, [appointment]);

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

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not scheduled";
    
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    });
  };

  // Handle assigning doctor and confirming appointment
  const handleConfirmAppointment = async () => {
    if (!selectedDoctor) {
      alert("Please select a doctor first");
      return;
    }
    
    try {
      setProcessingAction(true);
      const response = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "CONFIRMED",
          doctorId: selectedDoctor,
          scheduledDate: new Date().toISOString(),
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to confirm appointment");
      }
      
      const updatedAppointment = await response.json();
      setAppointment(updatedAppointment);
    } catch (error) {
      console.error("Error confirming appointment:", error);
      alert("Failed to confirm appointment. Please try again.");
    } finally {
      setProcessingAction(false);
    }
  };

  // Handle completing appointment
  const handleCompleteAppointment = async () => {
    if (!confirm("Are you sure you want to mark this appointment as completed?")) {
      return;
    }
    
    try {
      setProcessingAction(true);
      const response = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "COMPLETED",
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to complete appointment");
      }
      
      const updatedAppointment = await response.json();
      setAppointment(updatedAppointment);
    } catch (error) {
      console.error("Error completing appointment:", error);
      alert("Failed to complete appointment. Please try again.");
    } finally {
      setProcessingAction(false);
    }
  };

  // Handle rescheduling appointment
  const handleRescheduleAppointment = async (newDate: string) => {
    try {
      setProcessingAction(true);
      const response = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scheduledDate: new Date(newDate).toISOString(),
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to reschedule appointment");
      }
      
      const updatedAppointment = await response.json();
      setAppointment(updatedAppointment);
    } catch (error) {
      console.error("Error rescheduling appointment:", error);
      alert("Failed to reschedule appointment. Please try again.");
    } finally {
      setProcessingAction(false);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">
            Pending
          </span>
        );
      case "CONFIRMED":
        return (
          <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
            Confirmed
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
            Completed
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800">
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  // Get severity text and color
  const getSeverityInfo = (severity: number) => {
    if (severity >= 8) {
      return {
        text: "High Priority",
        colorClass: "text-red-700",
        badge: (
          <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
            High Priority ({severity}/10)
          </span>
        ),
      };
    } else if (severity >= 4) {
      return {
        text: "Medium Priority",
        colorClass: "text-orange-700",
        badge: (
          <span className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-800">
            Medium Priority ({severity}/10)
          </span>
        ),
      };
    } else {
      return {
        text: "Low Priority",
        colorClass: "text-green-700",
        badge: (
          <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
            Low Priority ({severity}/10)
          </span>
        ),
      };
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
                href="/hospital/appointments"
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
            href="/hospital/appointments"
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
          href="/hospital/appointments"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          &larr; Back to Appointments
        </Link>
      </div>

      {/* Main content */}
      <div className="bg-white shadow sm:rounded-lg">
        {/* Patient info section */}
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Patient: {appointment.user?.name}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Email: {appointment.user?.email}
            </p>
          </div>
          <div className="flex space-x-3">
            {getStatusBadge(appointment.status)}
            {appointment.severity && getSeverityInfo(appointment.severity).badge}
          </div>
        </div>

        {/* Appointment details */}
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Preferred Date</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {formatDate(appointment.preferredDate)}
              </dd>
            </div>
            
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
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
            
            {/* Doctor assignment section (for PENDING appointments) */}
            {appointment.status === "PENDING" && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 border-t border-gray-200">
                <dt className="text-sm font-medium text-gray-500">Assign Doctor</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  <div className="flex flex-col space-y-4">
                    {appointment.doctor && (
                      <div className="p-3 bg-green-50 border-l-4 border-green-500 rounded">
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-green-800">
                              Doctor already assigned automatically
                            </p>
                            <p className="text-sm text-green-700">
                              {appointment.doctor.name} ({appointment.doctor.specialty})
                            </p>
                            <p className="text-xs text-green-600 mt-1">
                              You can reassign to a different doctor if needed
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {recommendedSpecialty && (
                      <div className="mb-2 p-3 bg-indigo-50 border-l-4 border-indigo-500 rounded">
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <p className="text-sm text-indigo-700">
                            <span className="font-medium">Recommended specialty:</span> {recommendedSpecialty}
                          </p>
                        </div>
                        
                        {doctors.filter(doc => doc.specialty === recommendedSpecialty).length > 0 ? (
                          <div className="mt-2">
                            <p className="text-sm text-indigo-700 font-medium mb-2">Recommended doctors:</p>
                            <div className="space-y-2">
                              {doctors
                                .filter(doc => doc.specialty === recommendedSpecialty)
                                .map(doctor => (
                                  <div 
                                    key={doctor.id} 
                                    className={`flex items-center justify-between p-2 border rounded cursor-pointer ${
                                      selectedDoctor === doctor.id ? "bg-indigo-100 border-indigo-500" : "border-gray-200 hover:bg-indigo-50"
                                    }`}
                                    onClick={() => setSelectedDoctor(doctor.id)}
                                  >
                                    <div className="flex items-center">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                      <span className="font-medium">{doctor.name}</span>
                                      <span className="ml-2 text-sm text-gray-600">({doctor.specialty})</span>
                                    </div>
                                    <span className="text-sm text-indigo-600">Best match</span>
                                  </div>
                                ))
                              }
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-600 mt-1">No doctors available with this specialty</p>
                        )}
                      </div>
                    )}
                    
                    <select
                      value={selectedDoctor}
                      onChange={(e) => setSelectedDoctor(e.target.value)}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                      <option value="">Select a doctor</option>
                      {doctors.map((doctor) => (
                        <option key={doctor.id} value={doctor.id}>
                          {doctor.name} ({doctor.specialty})
                          {doctor.specialty === recommendedSpecialty ? " ✓" : ""}
                        </option>
                      ))}
                    </select>
                    
                    <button
                      onClick={handleConfirmAppointment}
                      disabled={!selectedDoctor || processingAction}
                      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm ${
                        !selectedDoctor || processingAction 
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                          : "text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      }`}
                    >
                      {appointment.doctor ? "Update Doctor Assignment" : "Confirm Appointment"}
                    </button>
                  </div>
                </dd>
              </div>
            )}
            
            {/* Reschedule section (for CONFIRMED appointments) */}
            {appointment.status === "CONFIRMED" && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 border-t border-gray-200">
                <dt className="text-sm font-medium text-gray-500">Scheduled Date</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  <div className="flex flex-col space-y-4">
                    <p>{formatDate(appointment.scheduledDate)}</p>
                    
                    <div className="flex space-x-4">
                      <input
                        type="datetime-local"
                        id="reschedule-date"
                        className="block w-full max-w-lg rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                      
                      <button
                        onClick={() => {
                          const inputElement = document.getElementById("reschedule-date") as HTMLInputElement;
                          if (inputElement && inputElement.value) {
                            handleRescheduleAppointment(inputElement.value);
                          } else {
                            alert("Please select a new date");
                          }
                        }}
                        disabled={processingAction}
                        className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm ${
                          processingAction
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        }`}
                      >
                        {processingAction ? "Processing..." : "Reschedule"}
                      </button>
                    </div>
                  </div>
                </dd>
              </div>
            )}
            
            {/* Doctor information for confirmed/completed appointments */}
            {(appointment.status === "CONFIRMED" || appointment.status === "COMPLETED") && appointment.doctor && (
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Assigned Doctor</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  {appointment.doctor.name} ({appointment.doctor.specialty})
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
        {appointment.status === "CONFIRMED" && (
          <div className="px-4 py-5 sm:px-6 border-t border-gray-200">
            <div className="flex justify-end">
              <button
                onClick={handleCompleteAppointment}
                disabled={processingAction}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm ${
                  processingAction
                    ? "bg-gray-300 cursor-not-allowed"
                    : "text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                }`}
              >
                {processingAction ? "Processing..." : "Mark as Completed"}
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