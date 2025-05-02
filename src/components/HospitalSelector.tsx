"use client";

import { useState, useEffect } from "react";
import { indianStates } from "@/lib/states";

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
  selectedHospitalId?: string;
}

export default function HospitalSelector({ onSelectHospital, selectedHospitalId }: HospitalSelectorProps) {
  const [selectedState, setSelectedState] = useState<string>("");
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch all hospitals on component mount
  useEffect(() => {
    fetchHospitals();
  }, []);
  
  // Fetch hospitals filtered by state when state changes
  useEffect(() => {
    if (selectedState) {
      fetchHospitals(selectedState);
    }
  }, [selectedState]);
  
  const fetchHospitals = async (state?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const url = state 
        ? `/api/hospitals?state=${encodeURIComponent(state)}` 
        : '/api/hospitals';
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch hospitals');
      }
      
      const data = await response.json();
      
      // Process the hospital data to extract pincode if it's embedded in the address
      const processedHospitals = data.hospitals.map((hospital: Hospital) => {
        // Try to extract pincode from address if it's in format "address, pincode"
        const addressParts = hospital.address?.split(',') || [];
        const potentialPincode = addressParts[addressParts.length - 1]?.trim();
        
        return {
          ...hospital,
          pincode: potentialPincode && /^\d{5,6}$/.test(potentialPincode) 
            ? potentialPincode 
            : undefined
        };
      });
      
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
  };
  
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
    <div className="space-y-4">
      <div>
        <label htmlFor="state" className="block text-sm font-medium text-gray-700">
          State
        </label>
        <select
          id="state"
          name="state"
          value={selectedState}
          onChange={handleStateChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          <option value="">All States</option>
          {indianStates.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>
      </div>
      
      <div>
        <label htmlFor="hospital" className="block text-sm font-medium text-gray-700">
          Hospital
        </label>
        <select
          id="hospital"
          name="hospital"
          value={selectedHospitalId || ""}
          onChange={handleHospitalChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          disabled={loading}
        >
          <option value="">Select a Hospital</option>
          {hospitals.length > 0 && hospitals.map(hospital => (
            <option key={hospital.id} value={hospital.id}>
              {hospital.name}{hospital.city ? ` - ${hospital.city}` : ""}, {hospital.state}
            </option>
          ))}
        </select>
        
        {loading && (
          <p className="mt-1 text-sm text-gray-500">Loading hospitals...</p>
        )}
        
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
        
        {!loading && !error && hospitals.length === 0 && (
          <p className="mt-1 text-sm text-yellow-600">No hospitals found. Please select a different state or contact support.</p>
        )}
      </div>
    </div>
  );
} 