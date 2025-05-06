"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Hospital } from "@/types";

type AppointmentFormProps = {
  onSuccess?: (data: any) => void;
};

export default function AppointmentForm({ onSuccess }: AppointmentFormProps) {
  const router = useRouter();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loadingHospitals, setLoadingHospitals] = useState(true);
  
  // Form data
  const [hospitalId, setHospitalId] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [symptoms, setSymptoms] = useState("");
  
  // Calculate minimum date (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];
  
  // Calculate maximum date (60 days from now)
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 60);
  const maxDateString = maxDate.toISOString().split("T")[0];

  // Fetch hospitals
  useEffect(() => {
    async function fetchHospitals() {
      try {
        setLoadingHospitals(true);
        const response = await fetch("/api/hospitals");
        
        if (!response.ok) {
          throw new Error("Failed to fetch hospitals");
        }
        
        const data = await response.json();
        console.log("Hospitals API response:", data);
        
        // Check the structure of the response and handle accordingly
        if (data.hospitals && Array.isArray(data.hospitals)) {
          // Response format: { success: true, hospitals: [...], count: number }
          setHospitals(data.hospitals);
          console.log(`Found ${data.hospitals.length} hospitals`);
        } else if (Array.isArray(data)) {
          // Direct array response
          setHospitals(data);
          console.log(`Found ${data.length} hospitals`);
        } else {
          // Invalid response format
          console.error("Unexpected API response format:", data);
          setError("Failed to load hospitals: Unexpected API response format");
          setHospitals([]);
        }
      } catch (error) {
        console.error("Error fetching hospitals:", error);
        setError("Failed to load hospitals. Please try again later.");
        setHospitals([]); // Initialize with empty array to prevent map errors
      } finally {
        setLoadingHospitals(false);
      }
    }

    fetchHospitals();
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      // Validate form fields
      if (!hospitalId || !preferredDate || !symptoms) {
        setError("Please fill in all required fields");
        setLoading(false);
        return;
      }
      
      // Make sure symptoms are more than 20 characters
      if (symptoms.length < 20) {
        setError("Please provide more details about your symptoms (at least 20 characters)");
        setLoading(false);
        return;
      }
      
      // Validate hospital selection exists in our list
      if (hospitalId && hospitals.length > 0 && !hospitals.some(h => h.id === hospitalId)) {
        setError("Invalid hospital selection. Please select a hospital from the list.");
        setLoading(false);
        return;
      }
      
      // Validate date format and make sure it's not in the past
      try {
        const selectedDate = new Date(preferredDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day
        
        if (isNaN(selectedDate.getTime())) {
          setError("Invalid date format. Please select a valid date.");
          setLoading(false);
          return;
        }
        
        if (selectedDate < today) {
          setError("Please select a future date for your appointment.");
          setLoading(false);
          return;
        }
      } catch (dateError) {
        setError("Invalid date format. Please select a valid date.");
        setLoading(false);
        return;
      }
      
      console.log("Submitting appointment with data:", {
        hospitalId,
        preferredDate,
        symptomsLength: symptoms.length
      });
      
      // Ensure date is properly formatted in ISO format
      let dateToSend;
      try {
        const dateObj = new Date(preferredDate);
        if (isNaN(dateObj.getTime())) {
          throw new Error("Invalid date format");
        }
        dateToSend = dateObj.toISOString();
        console.log("Formatted date for submission:", dateToSend);
      } catch (err) {
        console.error("Date formatting error:", err);
        setError("Failed to format date. Please select a valid date.");
        setLoading(false);
        return;
      }
      
      // Add request timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // Increased to 30 seconds
      
      try {
      // Submit appointment with ISO formatted date string
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
          "x-timestamp": Date.now().toString()
        },
        body: JSON.stringify({
          hospitalId,
          preferredDate: dateToSend,
          symptoms: symptoms.trim(),
        }),
          signal: controller.signal
      });
        
        clearTimeout(timeoutId); // Clear the timeout if the request completes
      
      // Handle non-JSON responses
      let responseData;
      try {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        responseData = await response.json();
      } else {
        // Handle non-JSON response
        const textResponse = await response.text();
        console.error("Non-JSON response:", textResponse);
        throw new Error("Server returned an invalid response format");
        }
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        if (response.ok) {
          // The request succeeded but couldn't parse the response
          // We can consider this a success since the server confirmed the appointment was created
          console.log("Response parse error, but status was OK. Treating as success.");
          responseData = { id: "unknown", status: "PENDING" };
        } else {
          throw new Error("Failed to parse server response. Please check your appointments page to verify if the appointment was created.");
        }
      }
      
      if (!response.ok) {
        console.error("API error response:", responseData);
        if (responseData.error) {
          // Show more specific error message from the API response
          throw new Error(responseData.error);
        } else {
          throw new Error(`Failed to schedule appointment (Status: ${response.status})`);
        }
      }
      
      console.log("Appointment created successfully:", responseData);
      setSuccess(true);
      
      // Reset form
      setHospitalId("");
      setPreferredDate("");
      setSymptoms("");
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess(responseData);
      }
      
      // Redirect to appointments page after a short delay
      setTimeout(() => {
        router.push("/user/appointments");
      }, 1500);
      } catch (fetchError: any) {
        if (fetchError.name === 'AbortError') {
          console.error("Request timed out");
          throw new Error("Request timed out. The server took too long to respond. Please try again.");
        }
        throw fetchError;
      }
    } catch (error: any) {
      console.error("Error creating appointment:", error);
      
      // Enhanced error handling with specific messages
      if (error.message.includes("Database") || error.message.includes("database")) {
        setError("Database connection issue. Please try again in a few moments.");
      } else if (error.message.includes("timed out")) {
        setError("Request timed out. Please check your internet connection and try again.");
      } else if (error.message.includes("networkerror") || error.message.includes("network error")) {
        setError("Network error. Please check your internet connection and try again.");
      } else {
      setError(error.message || "Failed to schedule appointment. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const NoHospitalsFoundMessage = () => (
    <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800">No hospitals found</h3>
          <div className="mt-2 text-sm text-yellow-700">
            <p>There are no hospitals in the database. This is likely a development issue.</p>
            <p className="mt-1">
              <a 
                href="/seed-hospitals" 
                target="_blank"
                className="font-medium text-yellow-700 underline hover:text-yellow-600"
              >
                Click here to seed hospital data
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          Schedule an Appointment
        </h3>
        <div className="mt-2 max-w-xl text-sm text-gray-500">
          <p>
            Tell us about your symptoms and we'll analyze them to determine the best care option for you.
          </p>
        </div>
        
        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {success && (
          <div className="mt-4 rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Success</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>Your appointment has been scheduled. Our AI is analyzing your symptoms to prioritize your care.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {!loadingHospitals && hospitals.length === 0 && (
          <NoHospitalsFoundMessage />
        )}

        <form className="mt-5 space-y-6" onSubmit={handleSubmit}>
          {/* Hospital Selection */}
          <div>
            <label htmlFor="hospital" className="block text-sm font-medium text-gray-700">
              Select Hospital *
            </label>
            <select
              id="hospital"
              name="hospital"
              value={hospitalId}
              onChange={(e) => setHospitalId(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
              disabled={loading || loadingHospitals}
            >
              <option value="">Select a hospital</option>
              {loadingHospitals ? (
                <option value="" disabled>Loading hospitals...</option>
              ) : hospitals && hospitals.length > 0 ? (
                hospitals.map((hospital) => (
                  <option key={hospital.id} value={hospital.id}>
                    {hospital.name} 
                    {hospital.city && ` - ${hospital.city}`}
                    {hospital.state && `, ${hospital.state}`}
                  </option>
                ))
              ) : (
                <option value="" disabled>No hospitals available. Please try again later.</option>
              )}
            </select>
          </div>

          {/* Preferred Date */}
          <div>
            <label htmlFor="preferredDate" className="block text-sm font-medium text-gray-700">
              Preferred Date *
            </label>
            <input
              type="date"
              id="preferredDate"
              name="preferredDate"
              min={minDate}
              max={maxDateString}
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500">
              Please select a date between tomorrow and {new Date(maxDateString).toLocaleDateString()}
            </p>
          </div>

          {/* Symptoms */}
          <div>
            <label htmlFor="symptoms" className="block text-sm font-medium text-gray-700">
              Describe Your Symptoms *
            </label>
            <div className="mt-1">
              <textarea
                id="symptoms"
                name="symptoms"
                rows={5}
                minLength={20}
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                required
                placeholder="Please provide details about your symptoms, when they started, and any relevant medical history."
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm resize-none"
                disabled={loading}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Our AI will analyze your symptoms to help prioritize your care.
              {symptoms.length < 20 ? (
                <span className="text-red-500 ml-1">
                  Please provide at least {20 - symptoms.length} more characters.
                </span>
              ) : (
                <span className="text-green-500 ml-1">
                  ✓ Detailed enough
                </span>
              )}
            </p>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={loading || success}
              className={`${
                loading || success
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700"
              } inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : success ? (
                "Appointment Scheduled"
              ) : (
                "Schedule Appointment"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 