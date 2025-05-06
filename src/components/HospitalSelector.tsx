"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { indianStates } from "@/lib/states";
import { INDIAN_STATES } from "@/lib/constants";

// Match the Hospital model from the Prisma schema
interface Hospital {
  id: string;
  name: string;
  state: string;
  city?: string | null;
  address?: string | null;
  // Extracted from address for display purposes
  pincode?: string;
}

interface HospitalSelectorProps {
  onSelectHospital: (hospital: Hospital | null) => void;
  selectedHospitalId?: string | null;
  initialStateFilter?: string;
}

// Cache for hospitals to avoid repeated fetches
const GLOBAL_HOSPITALS_CACHE = new Map<string, {
  data: Hospital[],
  timestamp: number
}>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

export default function HospitalSelector({ onSelectHospital, selectedHospitalId, initialStateFilter }: HospitalSelectorProps) {
  const [selectedState, setSelectedState] = useState<string>(initialStateFilter || "");
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use static states
  const states = useMemo(() => INDIAN_STATES.map(state => state.name), []);
  
  // Fetch hospitals on component mount and when state changes
  useEffect(() => {
    if (selectedState) {
      fetchHospitals(selectedState);
    } else {
      fetchHospitals(); // Fetch all hospitals when no state is selected
    }
  }, [selectedState]);
  
  const fetchHospitals = useCallback(async (state?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Create cache key
      const cacheKey = state || 'all';
      
      // Check cache first
      const cachedData = GLOBAL_HOSPITALS_CACHE.get(cacheKey);
      if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_TTL) {
        setHospitals(cachedData.data);
        
        // If there was a previously selected hospital ID, find it in the cached list
        if (selectedHospitalId) {
          const selectedHospital = cachedData.data.find(h => h.id === selectedHospitalId);
          if (selectedHospital) {
            onSelectHospital(selectedHospital);
          } else {
            onSelectHospital(null);
          }
        }
        
        setLoading(false);
        return;
      }
      
      // Build the API endpoint URL with state filter if provided
      const endpoint = state 
        ? `/api/hospitals?state=${encodeURIComponent(state)}`
        : '/api/hospitals';
      
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch hospitals: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Process and store the hospital data
      let processedHospitals: Hospital[] = [];
      
      if (data.hospitals && Array.isArray(data.hospitals)) {
        processedHospitals = data.hospitals;
      } else if (Array.isArray(data)) {
        processedHospitals = data;
      } else {
        throw new Error('Unexpected response format');
      }
      
      // Update cache
      GLOBAL_HOSPITALS_CACHE.set(cacheKey, {
        data: processedHospitals,
        timestamp: Date.now()
      });
      
      // Update state
      setHospitals(processedHospitals);
      
      // If there was a previously selected hospital ID, find it in the new list
      if (selectedHospitalId) {
        const selectedHospital = processedHospitals.find(
          (h: Hospital) => h.id === selectedHospitalId
        );
        if (selectedHospital) {
          onSelectHospital(selectedHospital);
        } else {
          onSelectHospital(null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching hospitals:', err);
    } finally {
      setLoading(false);
    }
  }, [onSelectHospital, selectedHospitalId]);
  
  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedState(e.target.value);
    onSelectHospital(null); // Clear selected hospital when state changes
  };
  
  const handleHospitalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const hospitalId = e.target.value;
    if (!hospitalId) {
      onSelectHospital(null);
      return;
    }
    
    const selectedHospital = hospitals.find(h => h.id === hospitalId) || null;
    onSelectHospital(selectedHospital);
  };
  
  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
          State
        </label>
        <div className="relative">
          <select
            id="state"
            name="state"
            value={selectedState}
            onChange={handleStateChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white text-gray-700 py-2.5 pl-4 pr-10"
          >
            <option value="" className="text-gray-700">All States</option>
            {states.map((state) => (
              <option key={state} value={state} className="text-gray-700">
                {state}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <div>
        <label htmlFor="hospital" className="block text-sm font-medium text-gray-700 mb-1">
          Hospital
        </label>
        <div className="relative">
          <select
            id="hospital"
            name="hospital"
            value={selectedHospitalId || ""}
            onChange={handleHospitalChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white text-gray-700 py-2.5 pl-4 pr-10"
            disabled={loading}
          >
            <option value="" className="text-gray-700">Select a Hospital</option>
            {hospitals.length > 0 && hospitals.map(hospital => (
              <option key={hospital.id} value={hospital.id} className="text-gray-700">
                {hospital.name}{hospital.city ? ` - ${hospital.city}` : ""}, {hospital.state}
              </option>
            ))}
          </select>
        </div>
        
        {loading && (
          <div className="mt-2 flex items-center text-sm text-indigo-500">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading hospitals...
          </div>
        )}
        
        {error && (
          <p className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded-md border border-red-200">{error}</p>
        )}
      </div>
    </div>
  );
} 