"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import Link from "next/link";

type EmergencyAlert = {
  id: string;
  createdAt: string;
  status: "PENDING" | "ACKNOWLEDGED" | "RESPONDED" | "CLOSED";
  patientInfo: {
    name: string;
    contact: string;
    gender?: string;
    dateOfBirth?: string;
    address?: string;
    city?: string;
    state?: string;
  };
  medicalHistory: any;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
};

export default function EmergencyAlertsPage() {
  const { data: session } = useSession();
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<EmergencyAlert | null>(null);
  const [updateStatus, setUpdateStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/hospital/emergency-alerts");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch emergency alerts");
      }

      setAlerts(data.emergencyAlerts);
    } catch (error) {
      console.error("Error fetching emergency alerts:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const updateAlertStatus = async (alertId: string, status: "ACKNOWLEDGED" | "RESPONDED" | "CLOSED") => {
    setUpdateStatus("loading");

    try {
      const response = await fetch("/api/hospital/emergency-alerts", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ alertId, status }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update alert status");
      }

      // Update local state
      setAlerts(alerts.map(alert => 
        alert.id === alertId ? { ...alert, status } : alert
      ));
      
      if (selectedAlert && selectedAlert.id === alertId) {
        setSelectedAlert({ ...selectedAlert, status });
      }
      
      setUpdateStatus("success");

      // Reset success status after a delay
      setTimeout(() => setUpdateStatus("idle"), 3000);
    } catch (error) {
      console.error("Error updating alert status:", error);
      setUpdateStatus("error");
      
      // Reset error status after a delay
      setTimeout(() => setUpdateStatus("idle"), 3000);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-red-100 text-red-800";
      case "ACKNOWLEDGED":
        return "bg-yellow-100 text-yellow-800";
      case "RESPONDED":
        return "bg-blue-100 text-blue-800";
      case "CLOSED":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="py-10 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-r-transparent"></div>
        <p className="mt-2 text-gray-600">Loading emergency alerts...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-10">
        <div className="max-w-md mx-auto bg-red-50 rounded-lg p-6 border border-red-200">
          <h2 className="text-lg font-semibold text-red-700">Error</h2>
          <p className="mt-2 text-sm text-red-600">{error}</p>
          <button
            onClick={fetchAlerts}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Emergency Alerts</h1>
          <button
            onClick={fetchAlerts}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Refresh
          </button>
        </div>

        {updateStatus === "success" && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-700">Alert status updated successfully.</p>
          </div>
        )}

        {updateStatus === "error" && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">Failed to update alert status. Please try again.</p>
          </div>
        )}

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {alerts.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500">No emergency alerts found.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {alerts.map((alert) => (
                <li key={alert.id}>
                  <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedAlert(alert)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="ml-3">
                          <p className="text-sm font-medium text-indigo-600">
                            {alert.patientInfo.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {alert.patientInfo.contact}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(alert.status)}`}>
                          {alert.status}
                        </span>
                        <span className="text-sm text-gray-500">
                          {format(new Date(alert.createdAt), "MMM d, yyyy h:mm a")}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-10 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setSelectedAlert(null)}></div>

            <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>

            <div className="relative inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl sm:align-middle">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div>
                  <div className="mt-3 sm:mt-0 sm:text-left">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
                        Emergency Alert Details
                      </h3>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(selectedAlert.status)}`}>
                        {selectedAlert.status}
                      </span>
                    </div>
                    
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-500">Patient Information</h4>
                      <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                        <div className="sm:col-span-1">
                          <dt className="text-sm font-medium text-gray-500">Name</dt>
                          <dd className="mt-1 text-sm text-gray-900">{selectedAlert.patientInfo.name}</dd>
                        </div>
                        <div className="sm:col-span-1">
                          <dt className="text-sm font-medium text-gray-500">Contact</dt>
                          <dd className="mt-1 text-sm text-gray-900">{selectedAlert.patientInfo.contact}</dd>
                        </div>
                        {selectedAlert.patientInfo.gender && (
                          <div className="sm:col-span-1">
                            <dt className="text-sm font-medium text-gray-500">Gender</dt>
                            <dd className="mt-1 text-sm text-gray-900">{selectedAlert.patientInfo.gender}</dd>
                          </div>
                        )}
                        {selectedAlert.patientInfo.dateOfBirth && (
                          <div className="sm:col-span-1">
                            <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
                            <dd className="mt-1 text-sm text-gray-900">{format(new Date(selectedAlert.patientInfo.dateOfBirth), "MMMM d, yyyy")}</dd>
                          </div>
                        )}
                        {selectedAlert.patientInfo.address && (
                          <div className="sm:col-span-2">
                            <dt className="text-sm font-medium text-gray-500">Address</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                              {[
                                selectedAlert.patientInfo.address,
                                selectedAlert.patientInfo.city,
                                selectedAlert.patientInfo.state
                              ].filter(Boolean).join(", ")}
                            </dd>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-6">
                      <h4 className="text-sm font-medium text-gray-500">Medical History</h4>
                      <div className="mt-2 max-h-60 overflow-y-auto">
                        {selectedAlert.medicalHistory.recentReports?.length > 0 ? (
                          <div>
                            <h5 className="text-xs font-medium text-gray-700">Recent Reports</h5>
                            <ul className="mt-1 space-y-2">
                              {selectedAlert.medicalHistory.recentReports.map((report: any) => (
                                <li key={report.id} className="rounded border border-gray-200 p-2">
                                  <p className="text-xs text-gray-700">
                                    <span className="font-medium">Date:</span> {format(new Date(report.createdAt), "MMM d, yyyy")}
                                  </p>
                                  <p className="text-xs text-gray-700">
                                    <span className="font-medium">Symptoms:</span> {report.symptoms}
                                  </p>
                                  <p className="text-xs text-gray-700">
                                    <span className="font-medium">Severity:</span> {report.severity}
                                  </p>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No recent medical reports available.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                {selectedAlert.status === "PENDING" && (
                  <button
                    type="button"
                    onClick={() => updateAlertStatus(selectedAlert.id, "ACKNOWLEDGED")}
                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
                    disabled={updateStatus === "loading"}
                  >
                    Acknowledge Alert
                  </button>
                )}
                {selectedAlert.status === "ACKNOWLEDGED" && (
                  <button
                    type="button"
                    onClick={() => updateAlertStatus(selectedAlert.id, "RESPONDED")}
                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
                    disabled={updateStatus === "loading"}
                  >
                    Mark as Responded
                  </button>
                )}
                {(selectedAlert.status === "ACKNOWLEDGED" || selectedAlert.status === "RESPONDED") && (
                  <button
                    type="button"
                    onClick={() => updateAlertStatus(selectedAlert.id, "CLOSED")}
                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
                    disabled={updateStatus === "loading"}
                  >
                    Close Alert
                  </button>
                )}
                <Link href={`/user-profile/${selectedAlert.user.id}`} passHref>
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    View Patient Profile
                  </button>
                </Link>
                <button
                  type="button"
                  onClick={() => setSelectedAlert(null)}
                  className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 