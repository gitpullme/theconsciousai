"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Appointment, AppointmentStatus } from "@/types";

type AppointmentListProps = {
  limit?: number;
  status?: string;
};

export default function AppointmentList({ limit, status }: AppointmentListProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch appointments
  useEffect(() => {
    async function fetchAppointments() {
      try {
        setLoading(true);
        setError(null);
        
        console.log(`Fetching appointments with status: ${status || 'all'}`);
        
        // Create the URL with status filter if provided
        const url = status && status !== 'all' 
          ? `/api/appointments?status=${status.toUpperCase()}` 
          : '/api/appointments';
        
        const response = await fetch(url, {
          // Add cache busting to prevent stale data
          headers: {
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "x-timestamp": Date.now().toString()
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          console.error("API error response:", errorData);
          throw new Error(errorData?.error || "Failed to fetch appointments");
        }
        
        const data = await response.json();
        
        // Check if data contains appointments property (new API format)
        const appointmentsData = data.appointments || data;
        
        // Log the structure to help with debugging
        console.log("API Response structure:", {
          hasAppointmentsArray: Array.isArray(appointmentsData),
          appointmentsCount: Array.isArray(appointmentsData) ? appointmentsData.length : 'Not an array',
          responseKeys: Object.keys(data)
        });
        
        if (!Array.isArray(appointmentsData)) {
          console.error("Unexpected response format:", data);
          throw new Error("Received invalid appointment data format");
        }
        
        console.log(`Successfully fetched ${appointmentsData.length} appointments`);
        
        // Apply limit if specified
        const limitedData = limit ? appointmentsData.slice(0, limit) : appointmentsData;
        setAppointments(limitedData);
      } catch (error) {
        console.error("Error fetching appointments:", error);
        setError("Failed to load your appointments. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    }

    fetchAppointments();
  }, [limit, status]);

  // Cancel an appointment
  const handleCancel = async (appointmentId: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) {
      return;
    }
    
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "CANCELLED",
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to cancel appointment");
      }
      
      // Update local state
      setAppointments((prev) =>
        prev.map((appt) =>
          appt.id === appointmentId
            ? { ...appt, status: "CANCELLED" as AppointmentStatus }
            : appt
        )
      );
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      alert("Failed to cancel the appointment. Please try again.");
    }
  };

  // Get status badge based on appointment status
  const getStatusBadge = (status: AppointmentStatus) => {
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
          High Priority
        </span>
      );
    } else if (severity >= 4) {
      return (
        <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800">
          Medium Priority
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
          Low Priority
        </span>
      );
    }
  };

  // Format date string
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(limit || 3)].map((_, i) => (
          <div key={i} className="border rounded-lg p-4 animate-pulse">
            <div className="flex justify-between items-start">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
              <div className="h-5 bg-gray-200 rounded w-1/6"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="text-center py-6 bg-gray-50 rounded-lg">
        <p className="text-gray-500">You don't have any appointments yet.</p>
        <Link href="/user/appointments/new" className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          Schedule an Appointment
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {appointments.map((appointment) => (
        <div
          key={appointment.id}
          className="bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-gray-900">
                  {appointment.hospital?.name || "Hospital Name"}
                </h3>
                <div className="mt-1 flex flex-wrap gap-2">
                  {getStatusBadge(appointment.status)}
                  {appointment.severity && getSeverityBadge(appointment.severity)}
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  <span className="font-medium">Preferred:</span> {formatDate(appointment.preferredDate)}
                  {appointment.scheduledDate && (
                    <>
                      <br />
                      <span className="font-medium">Scheduled:</span> {formatDate(appointment.scheduledDate)}
                    </>
                  )}
                  {appointment.doctor && (
                    <>
                      <br />
                      <span className="font-medium">Doctor:</span> {appointment.doctor.name} ({appointment.doctor.specialty})
                    </>
                  )}
                </p>
              </div>

              <div className="flex space-x-2">
                <Link
                  href={`/user/appointments/${appointment.id}`}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  View Details
                </Link>
                {appointment.status === "PENDING" && (
                  <button
                    onClick={() => handleCancel(appointment.id)}
                    className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-red-700 shadow-sm hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3">
              <p className="text-sm text-gray-500 line-clamp-2">
                <span className="font-medium">Symptoms:</span> {appointment.symptoms}
              </p>
            </div>
          </div>
        </div>
      ))}

      {limit && appointments.length > 0 && (
        <div className="text-center mt-4">
          <Link
            href="/user/appointments"
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            View All Appointments
          </Link>
        </div>
      )}
    </div>
  );
} 