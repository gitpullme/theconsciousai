"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import useSWR from 'swr';

type Appointment = {
  id: string;
  userId: string;
  hospitalId: string;
  doctorId?: string;
  symptoms: string;
  aiAnalysis?: string;
  severity?: number;
  status: string;
  preferredDate: string;
  scheduledDate?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  doctor?: {
    id: string;
    name: string;
    specialty: string;
  };
};

type Doctor = {
  id: string;
  name: string;
  specialty: string;
  available: boolean;
};

// Fetcher function for SWR
const fetcher = async (url: string) => {
  try {
    console.log(`Fetching data from: ${url}`);
    const res = await fetch(url);
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const error = new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
      error.info = errorData;
      throw error;
    }
    
    const data = await res.json();
    
    // Add validation for hospital appointments data
    if (data.appointments && Array.isArray(data.appointments)) {
      // Ensure all appointments have valid user data
      data.appointments = data.appointments.map(appointment => {
        if (!appointment.user) {
          console.log(`Missing user data for appointment ${appointment.id}, creating placeholder`);
          appointment.user = {
            id: appointment.userId || 'unknown',
            name: 'Unknown User',
            email: 'No email available',
            image: null
          };
        }
        return appointment;
      });
      
      // Log first appointment after processing for debugging
      if (data.appointments.length > 0) {
        console.log("Sample processed appointment user data:", {
          appointmentId: data.appointments[0].id,
          userId: data.appointments[0].userId,
          user: data.appointments[0].user,
          hasUser: Boolean(data.appointments[0].user),
          userName: data.appointments[0].user?.name
        });
      }
    }
    
    console.log(`Successfully fetched data with ${data.appointments?.length || 0} appointments`);
    return data;
  } catch (error) {
    console.error("Error in fetcher function:", error);
    throw error;
  }
};

export default function HospitalAppointments() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<string>("pending");
  const [recommendedSpecialties, setRecommendedSpecialties] = useState<{[key: string]: string}>({});
  
  // Create the dynamic query key based on the active tab
  const queryKey = `/api/appointments${activeTab !== "all" ? `?status=${activeTab.toUpperCase()}` : ""}`;
  
  // Use SWR for data fetching with caching
  const { 
    data, 
    error, 
    isLoading, 
    mutate: refreshAppointments 
  } = useSWR(
    status === "authenticated" && session?.user?.role === "HOSPITAL" ? queryKey : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000, // 5 seconds
      refreshInterval: 60000, // 1 minute refresh
      onSuccess: (data) => {
        // Process specialties mapping after successful data fetch
        const specialties: {[key: string]: string} = {};
        if (data && data.appointments) {
          data.appointments.forEach((appointment: Appointment) => {
            if (appointment.aiAnalysis) {
              specialties[appointment.id] = determineSpecialtyFromAnalysis(appointment.aiAnalysis);
            }
          });
        }
        setRecommendedSpecialties(specialties);
      }
    }
  );
  
  // Extract appointments and pagination from the API response
  const appointments = data?.appointments || [];
  const pagination = data?.pagination;
  
  // Add debug logging to inspect appointment data
  useEffect(() => {
    if (appointments.length > 0) {
      console.log("First appointment data sample:", {
        id: appointments[0].id,
        user: appointments[0].user || 'No user data',
        status: appointments[0].status
      });
    }
  }, [appointments]);
  
  // Fetch doctors with SWR
  const { 
    data: doctors = [], 
    error: doctorsError 
  } = useSWR(
    status === "authenticated" && session?.user?.role === "HOSPITAL" ? "/api/hospital/doctors" : null,
    fetcher
  );

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

  // Check session and permissions
  useEffect(() => {
    if (status === "loading") return;
    
    // Log session data for debugging
    console.log("Session status:", status);
    console.log("Session data:", session ? {
      id: session.user?.id,
      name: session.user?.name,
      role: session.user?.role,
      hospital: session.user?.hospital
    } : "No session");
    
    if (status !== "authenticated") {
      console.error("User not authenticated, redirecting to login");
      router.push("/login?callbackUrl=/hospital/appointments");
      return;
    }
    
    if (session?.user?.role !== "HOSPITAL") {
      console.error("User role is not HOSPITAL, redirecting to home");
      router.push("/");
      return;
    }
    
    if (!session?.user?.hospital) {
      console.error("Hospital ID is missing in session");
      return;
    }
    
    console.log("Initializing hospital dashboard with hospital ID:", session.user.hospital);
  }, [status, session, router]);

  // Handle appointment confirmation (optimized to use mutate)
  const handleConfirmAppointment = async (appointmentId: string, doctorId: string) => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "CONFIRMED",
          doctorId,
          scheduledDate: new Date().toISOString(),
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to confirm appointment");
      }
      
      // Refresh data using SWR's mutate
      refreshAppointments();
    } catch (error) {
      console.error("Error confirming appointment:", error);
      alert("Failed to confirm the appointment. Please try again.");
    }
  };

  // Complete an appointment (optimized)
  const handleCompleteAppointment = async (appointmentId: string) => {
    if (!confirm("Are you sure you want to mark this appointment as completed?")) {
      return;
    }
    
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
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
      
      // Refresh data using SWR's mutate
      refreshAppointments();
    } catch (error) {
      console.error("Error completing appointment:", error);
      alert("Failed to complete the appointment. Please try again.");
    }
  };

  // Format date string
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
            Pending
          </span>
        );
      case "CONFIRMED":
        return (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
            Confirmed
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
            Completed
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
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
        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
          High Priority ({severity}/10)
        </span>
      );
    } else if (severity >= 4) {
      return (
        <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800">
          Medium Priority ({severity}/10)
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
          Low Priority ({severity}/10)
        </span>
      );
    }
  };

  // Update the tab changing logic
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // SWR will automatically fetch the new data when the queryKey changes
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointment Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and schedule patient appointments
          </p>
        </div>
        <button
          onClick={() => refreshAppointments()}
          disabled={isLoading}
          className={`rounded-md px-3 py-2 text-sm font-medium shadow-sm ring-1 ring-inset ${
            isLoading
              ? 'bg-gray-100 text-gray-400 ring-gray-200 cursor-not-allowed' 
              : 'bg-white text-gray-700 ring-gray-300 hover:bg-gray-50'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Refreshing...
            </span>
          ) : "Refresh"}
        </button>
      </div>

      {/* Status tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => handleTabChange("all")}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === "all"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            All
          </button>
          <button
            onClick={() => handleTabChange("pending")}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === "pending"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => handleTabChange("confirmed")}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === "confirmed"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            Confirmed
          </button>
          <button
            onClick={() => handleTabChange("completed")}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === "completed"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => handleTabChange("cancelled")}
            className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
              activeTab === "cancelled"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            Cancelled
          </button>
        </nav>
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error.message}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Appointments list */}
      {isLoading ? (
        <div className="text-center py-12">
          <svg className="animate-spin h-8 w-8 text-indigo-500 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600">Loading appointments...</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="rounded-md bg-gray-50 p-8 text-center">
          <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments found</h3>
          <p className="mt-1 text-sm text-gray-500">
            There are no appointments with the selected status.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden bg-white shadow sm:rounded-md">
          <ul role="list" className="divide-y divide-gray-200">
            {appointments.map((appointment) => {
              // Ensure user data exists for this appointment
              const userName = appointment.user?.name || `Patient (ID: ${appointment.userId.slice(0, 5)}...)`;
              const userEmail = appointment.user?.email || "Email not available";
              const hasUserImage = appointment.user?.image;
              
              return (
                <li key={appointment.id} className={`px-0 py-4 sm:px-6 ${appointment.status === "PENDING" && appointment.severity && appointment.severity >= 8 ? "bg-red-50" : ""}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="ml-4 flex items-center">
                        {hasUserImage ? (
                          <img
                            className="h-10 w-10 rounded-full"
                            src={appointment.user.image}
                            alt=""
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-700">
                            {userName.charAt(0)}
                          </div>
                        )}
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{userName}</p>
                          <p className="text-xs text-gray-600">{userEmail}</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {getStatusBadge(appointment.status)}
                            {appointment.severity && getSeverityBadge(appointment.severity)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <div className="mr-4 text-sm text-gray-700">
                        <p><span className="font-medium">Preferred:</span> {formatDate(appointment.preferredDate)}</p>
                        {appointment.scheduledDate && (
                          <p><span className="font-medium">Scheduled:</span> {formatDate(appointment.scheduledDate)}</p>
                        )}
                        {appointment.doctor && (
                          <p><span className="font-medium">Doctor:</span> {appointment.doctor.name}</p>
                        )}
                      </div>
                      
                      <div className="flex space-x-2">
                        <Link
                          href={`/hospital/appointments/${appointment.id}`}
                          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        >
                          View Details
                        </Link>
                        
                        {/* Display doctor selection for pending appointments */}
                        {appointment.status === "PENDING" && (
                          <div className="flex flex-col">
                            <div className="flex space-x-2">
                              <select
                                id={`doctor-${appointment.id}`}
                                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                defaultValue=""
                              >
                                <option value="" disabled>Select doctor</option>
                                {doctors
                                  .sort((a, b) => {
                                    // Put doctors with the recommended specialty first
                                    const aIsRecommended = a.specialty === recommendedSpecialties[appointment.id];
                                    const bIsRecommended = b.specialty === recommendedSpecialties[appointment.id];
                                    if (aIsRecommended && !bIsRecommended) return -1;
                                    if (!aIsRecommended && bIsRecommended) return 1;
                                    return a.name.localeCompare(b.name);
                                  })
                                  .map(doctor => (
                                    <option key={doctor.id} value={doctor.id}>
                                      {doctor.name} ({doctor.specialty})
                                      {doctor.specialty === recommendedSpecialties[appointment.id] ? " ✓" : ""}
                                    </option>
                                  ))
                                }
                              </select>
                              <button
                                onClick={() => {
                                  const select = document.getElementById(`doctor-${appointment.id}`) as HTMLSelectElement;
                                  if (select.value) {
                                    handleConfirmAppointment(appointment.id, select.value);
                                  } else {
                                    alert("Please select a doctor first");
                                  }
                                }}
                                className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-3 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                              >
                                Confirm
                              </button>
                            </div>
                            
                            {/* Show recommended specialty */}
                            {recommendedSpecialties[appointment.id] && (
                              <div className="mt-2 text-xs text-indigo-600 flex items-center justify-end">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-600 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>Recommended: <span className="font-semibold">{recommendedSpecialties[appointment.id]}</span></span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {appointment.status === "CONFIRMED" && (
                          <button
                            onClick={() => handleCompleteAppointment(appointment.id)}
                            className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-3 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                          >
                            Complete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-2 ml-14">
                    <p className="text-sm text-gray-600 line-clamp-2">
                      <span className="font-medium">Symptoms:</span> {appointment.symptoms}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
} 