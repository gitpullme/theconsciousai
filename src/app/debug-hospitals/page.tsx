"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface State {
  id: string;
  name: string;
}

interface Hospital {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
}

export default function DebugHospitalsPage() {
  const { data: session } = useSession();
  const [states, setStates] = useState<State[]>([]);
  const [selectedState, setSelectedState] = useState<string>("");
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(false);
  const [stateLoading, setStateLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [userState, setUserState] = useState<string | null>(null);

  // Fetch states on page load
  useEffect(() => {
    fetchStates();
    
    if (session?.user?.state) {
      setUserState(session.user.state);
      setSelectedState(session.user.state);
    }
  }, [session]);

  // Fetch hospitals when state changes
  useEffect(() => {
    if (selectedState) {
      fetchHospitals(selectedState);
    }
  }, [selectedState]);

  async function fetchStates() {
    setStateLoading(true);
    try {
      const response = await fetch('/api/states');
      const data = await response.json();
      
      console.log("States API response:", data);
      
      if (Array.isArray(data)) {
        setStates(data);
      } else if (data.states && Array.isArray(data.states)) {
        setStates(data.states);
      } else {
        setStates([]);
        setError("Unexpected states API response format");
      }
    } catch (error) {
      console.error("Failed to fetch states:", error);
      setError("Failed to fetch states. Please try again.");
    } finally {
      setStateLoading(false);
    }
  }

  async function fetchHospitals(state: string) {
    if (!state) return;
    
    setLoading(true);
    setError(null);
    setHospitals([]);
    
    try {
      console.log(`Fetching hospitals for state: ${state}`);
      const response = await fetch(`/api/hospitals?state=${encodeURIComponent(state)}`);
      
      // Store the raw response text for debugging
      const responseText = await response.text();
      console.log("Raw hospital API response:", responseText);
      
      // Try to parse the response as JSON
      let data;
      try {
        data = JSON.parse(responseText);
        setApiResponse(data);
      } catch (e) {
        console.error("Invalid JSON response:", e);
        setError("The server returned an invalid JSON response");
        setLoading(false);
        return;
      }
      
      if (response.ok) {
        if (data.hospitals && Array.isArray(data.hospitals)) {
          setHospitals(data.hospitals);
          console.log(`Found ${data.hospitals.length} hospitals for state ${state}`);
        } else if (Array.isArray(data)) {
          setHospitals(data);
          console.log(`Found ${data.length} hospitals for state ${state}`);
        } else {
          setError("Unexpected hospital API response format");
        }
      } else {
        setError(data.error || "Failed to fetch hospitals");
      }
    } catch (error) {
      console.error("Error fetching hospitals:", error);
      setError("Failed to fetch hospitals. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedState(e.target.value);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Hospital Data Debug</h1>
      
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
        <p className="text-blue-800 font-medium">This page helps troubleshoot issues with state and hospital data.</p>
        <p className="text-blue-700 mt-2">
          Your current state from profile: {userState || "Not set"}
        </p>
      </div>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="col-span-1">
          <h2 className="text-lg font-medium mb-2">Select State</h2>
          
          {stateLoading ? (
            <div className="animate-pulse h-10 bg-gray-200 rounded w-full"></div>
          ) : (
            <select
              value={selectedState}
              onChange={handleStateChange}
              className="block w-full p-2 border border-gray-300 rounded"
            >
              <option value="">Select a state</option>
              {states.map((state) => (
                <option key={state.id} value={state.name}>
                  {state.name}
                </option>
              ))}
            </select>
          )}
          
          <div className="mt-4 space-y-2">
            <button
              onClick={() => fetchStates()}
              className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
            >
              Refresh States
            </button>
            
            {selectedState && (
              <button
                onClick={() => fetchHospitals(selectedState)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm ml-2"
              >
                Refresh Hospitals
              </button>
            )}
          </div>
        </div>
        
        <div className="col-span-2">
          <h2 className="text-lg font-medium mb-2">Hospitals in {selectedState || "selected state"}</h2>
          
          {loading ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-12 bg-gray-200 rounded w-full"></div>
              <div className="h-12 bg-gray-200 rounded w-full"></div>
              <div className="h-12 bg-gray-200 rounded w-full"></div>
            </div>
          ) : hospitals.length > 0 ? (
            <ul className="bg-white border border-gray-200 rounded divide-y">
              {hospitals.map((hospital) => (
                <li key={hospital.id} className="p-3">
                  <div className="font-medium">{hospital.name}</div>
                  {hospital.city && (
                    <div className="text-sm text-gray-600">City: {hospital.city}</div>
                  )}
                  {hospital.state && hospital.state !== selectedState && (
                    <div className="text-sm text-orange-600">State: {hospital.state} (Mismatch with selected state)</div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">ID: {hospital.id}</div>
                </li>
              ))}
            </ul>
          ) : selectedState ? (
            <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
              <p className="text-yellow-800">No hospitals found for state: {selectedState}</p>
              <Link 
                href="/seed-hospitals"
                className="text-blue-600 hover:underline text-sm mt-2 inline-block"
              >
                Click here to seed hospital data
              </Link>
            </div>
          ) : (
            <div className="bg-gray-50 p-3 rounded border border-gray-200">
              <p className="text-gray-600">Select a state to view hospitals</p>
            </div>
          )}
        </div>
      </div>
      
      {apiResponse && (
        <div className="mt-6">
          <h2 className="text-lg font-medium mb-2">API Response Details</h2>
          <div className="bg-gray-50 p-4 rounded overflow-auto max-h-80">
            <pre className="text-xs">{JSON.stringify(apiResponse, null, 2)}</pre>
          </div>
        </div>
      )}
      
      <div className="mt-8 pt-4 border-t border-gray-200">
        <h3 className="text-lg font-medium mb-4">Troubleshooting Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Link 
            href="/seed-hospitals"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
          >
            Seed Hospital Data
          </Link>
          
          <Link
            href="/debug/states"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
          >
            Debug States
          </Link>
          
          <Link
            href="/user/upload"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm"
          >
            Return to Upload Page
          </Link>
        </div>
      </div>
    </div>
  );
} 