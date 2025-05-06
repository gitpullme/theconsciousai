"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function FixHospitalPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diagnosticData, setDiagnosticData] = useState<any>(null);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Check if user is hospital admin
  useEffect(() => {
    if (status === "authenticated") {
      if (session?.user?.role !== "HOSPITAL" && session?.user?.role !== "ADMIN") {
        router.push("/profile");
      }
    }
  }, [session, status, router]);

  // Fetch diagnostic data
  useEffect(() => {
    async function fetchDiagnosticData() {
      if (status !== "authenticated") return;
      
      try {
        const response = await fetch("/api/debug/repair-hospital");
        if (response.ok) {
          const data = await response.json();
          setDiagnosticData(data);
        } else {
          const errorData = await response.json();
          setError(errorData.error || "Failed to load diagnostic data");
        }
      } catch (error) {
        setError("Error connecting to the server");
        console.error("Error fetching diagnostic data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDiagnosticData();
  }, [status, session]);

  // Fetch available hospitals
  useEffect(() => {
    async function fetchHospitals() {
      if (status !== "authenticated") return;
      
      try {
        const response = await fetch("/api/hospitals");
        if (response.ok) {
          const data = await response.json();
          setHospitals(data.hospitals || []);
        } else {
          console.error("Failed to load hospitals");
        }
      } catch (error) {
        console.error("Error fetching hospitals:", error);
      }
    }

    fetchHospitals();
  }, [status]);

  // Update hospital association
  async function updateHospitalAssociation() {
    if (!selectedHospital) {
      setError("Please select a hospital");
      return;
    }

    setIsUpdating(true);
    setError(null);
    setUpdateMessage(null);

    try {
      const response = await fetch("/api/user/update-hospital", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hospitalId: selectedHospital,
        }),
      });

      if (response.ok) {
        setUpdateMessage("Hospital association updated successfully! Please refresh the page to see changes.");
        
        // Update session with new hospital ID
        update({ 
          hospital: selectedHospital 
        });
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to update hospital association");
      }
    } catch (error) {
      setError("Error connecting to the server");
      console.error("Error updating hospital:", error);
    } finally {
      setIsUpdating(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white shadow-md rounded-lg p-6">
            <h1 className="text-2xl font-bold mb-4">Loading...</h1>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-md rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-4">Hospital Association Diagnostic</h1>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          {updateMessage && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {updateMessage}
            </div>
          )}

          {diagnosticData && (
            <div className="space-y-6">
              <div className="border rounded-md p-4">
                <h2 className="font-bold text-lg mb-2">User Information</h2>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-600">User ID:</div>
                  <div>{diagnosticData.user.id}</div>
                  <div className="text-gray-600">Name:</div>
                  <div>{diagnosticData.user.name}</div>
                  <div className="text-gray-600">Email:</div>
                  <div>{diagnosticData.user.email}</div>
                  <div className="text-gray-600">Role:</div>
                  <div>{diagnosticData.user.role}</div>
                  <div className="text-gray-600">Hospital ID (Database):</div>
                  <div>{diagnosticData.user.hospitalId || "Not set"}</div>
                  <div className="text-gray-600">Hospital ID (Session):</div>
                  <div>{diagnosticData.sessionHospital || "Not set"}</div>
                </div>
              </div>

              {diagnosticData.hospitalDetails ? (
                <div className="border rounded-md p-4">
                  <h2 className="font-bold text-lg mb-2">Current Hospital Information</h2>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-600">Hospital ID:</div>
                    <div>{diagnosticData.hospitalDetails.id}</div>
                    <div className="text-gray-600">Name:</div>
                    <div>{diagnosticData.hospitalDetails.name}</div>
                    <div className="text-gray-600">State:</div>
                    <div>{diagnosticData.hospitalDetails.state}</div>
                    <div className="text-gray-600">City:</div>
                    <div>{diagnosticData.hospitalDetails.city || "Not set"}</div>
                  </div>
                </div>
              ) : (
                <div className="border rounded-md p-4 bg-yellow-50">
                  <h2 className="font-bold text-lg mb-2">No Hospital Association Found</h2>
                  <p className="text-yellow-800">
                    {diagnosticData.repairResult || "Your account is not currently linked to any hospital."}
                  </p>
                </div>
              )}

              <div className="border rounded-md p-4">
                <h2 className="font-bold text-lg mb-4">Update Hospital Association</h2>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="hospital" className="block text-sm font-medium text-gray-700 mb-1">
                      Select Hospital
                    </label>
                    <select
                      id="hospital"
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                      value={selectedHospital}
                      onChange={(e) => setSelectedHospital(e.target.value)}
                    >
                      <option value="">Select a hospital</option>
                      {hospitals.map((hospital) => (
                        <option key={hospital.id} value={hospital.id}>
                          {hospital.name} ({hospital.state})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={updateHospitalAssociation}
                      disabled={isUpdating || !selectedHospital}
                      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                        isUpdating || !selectedHospital
                          ? "bg-indigo-300 cursor-not-allowed"
                          : "bg-indigo-600 hover:bg-indigo-700"
                      } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                    >
                      {isUpdating ? "Updating..." : "Update Hospital Association"}
                    </button>

                    <Link
                      href="/profile"
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Back to Profile
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 