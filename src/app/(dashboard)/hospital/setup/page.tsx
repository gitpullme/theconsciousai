"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function HospitalSetupPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if the user already has a hospital ID
  useEffect(() => {
    if (status === "loading") return;

    if (status !== "authenticated") {
      router.push("/login");
      return;
    }

    if (session?.user?.role !== "HOSPITAL" && session?.user?.role !== "ADMIN") {
      router.push("/");
      return;
    }

    // If hospital ID is already set, redirect to dashboard
    if (session?.user?.hospital) {
      router.push("/hospital");
      return;
    }

    // Load available hospitals
    const fetchHospitals = async () => {
      try {
        const response = await fetch("/api/hospitals");
        if (!response.ok) {
          throw new Error("Failed to fetch hospitals");
        }
        const data = await response.json();
        setHospitals(data);
      } catch (error) {
        console.error("Error fetching hospitals:", error);
        setError("Failed to load hospitals. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };

    fetchHospitals();
  }, [session, status, router]);

  // Handle hospital selection
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedHospital) {
      setError("Please select a hospital");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/user/update-hospital", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hospitalId: selectedHospital,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update hospital");
      }

      // Update the session with the new hospital ID
      await update({
        ...session,
        user: {
          ...session?.user,
          hospital: selectedHospital,
        },
      });

      // Redirect to the hospital dashboard
      router.push("/hospital");
    } catch (error) {
      console.error("Error updating hospital:", error);
      setError(error.message || "Failed to update hospital. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading" || (status === "authenticated" && session?.user?.hospital)) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md mt-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Hospital Setup</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <p className="text-gray-600 mb-6">
        Please select your hospital to complete the account setup.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="hospital" className="block text-sm font-medium text-gray-700 mb-1">
            Select Hospital
          </label>
          <select
            id="hospital"
            value={selectedHospital}
            onChange={(e) => setSelectedHospital(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 bg-white dark:bg-gray-800 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            disabled={loading || submitting}
            required
          >
            <option value="">Select a hospital</option>
            {hospitals.map((hospital: any) => (
              <option key={hospital.id} value={hospital.id}>
                {hospital.name} ({hospital.state})
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading || submitting || !selectedHospital}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            loading || submitting || !selectedHospital
              ? "bg-indigo-400 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          }`}
        >
          {submitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </>
          ) : (
            "Set Hospital"
          )}
        </button>
      </form>
    </div>
  );
} 