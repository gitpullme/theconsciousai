"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export default function StatesDebugPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [stateData, setStateData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [userState, setUserState] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.state) {
      setUserState(session.user.state);
    }
    fetchStateData();
  }, [session]);

  async function fetchStateData() {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/hospitals');
      
      if (!response.ok) {
        throw new Error(`Error fetching state data: ${response.status}`);
      }
      
      const data = await response.json();
      setStateData(data);
    } catch (err) {
      console.error("Error fetching state data:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch state data");
    } finally {
      setLoading(false);
    }
  }

  const testHospitalFetch = async (state: string) => {
    try {
      const response = await fetch(`/api/hospitals?state=${encodeURIComponent(state)}`);
      const data = await response.json();
      alert(`Found ${data.hospitals?.length || 0} hospitals in "${state}"`);
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : "Failed to fetch hospitals"}`);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">States & Hospitals Debug</h1>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">States & Hospitals Debug</h1>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <p className="text-red-700">{error}</p>
          <button 
            onClick={fetchStateData}
            className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}
      
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
        <p className="text-blue-700">
          <strong>Your current state:</strong> {userState || "Not set"}
        </p>
        {!userState && (
          <p className="text-sm text-blue-600 mt-1">
            You need to set your state in your profile to use location-based features.
          </p>
        )}
      </div>
      
      {stateData && (
        <>
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium mb-4">Hospital Data Summary</h2>
            <p className="mb-2">Total hospitals: <strong>{stateData.totalHospitals}</strong></p>
            <p className="text-sm text-gray-500">Environment: {stateData.environment}</p>
            <p className="text-sm text-gray-500">Last updated: {new Date(stateData.timestamp).toLocaleString()}</p>
          </div>
          
          {stateData.hospitalsByState && stateData.hospitalsByState.length > 0 ? (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium mb-4">Hospitals by State</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stateData.hospitalsByState.map((item: any, index: number) => (
                  <div 
                    key={index} 
                    className={`p-4 rounded-lg border ${
                      userState === item.state ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{item.state}</span>
                      <span className="text-gray-700">{item._count.id} hospitals</span>
                    </div>
                    <div className="mt-2 flex space-x-2">
                      <button
                        onClick={() => testHospitalFetch(item.state)}
                        className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                      >
                        Test Fetch
                      </button>
                      {userState !== item.state && (
                        <button
                          onClick={() => alert(`To change your state to ${item.state}, go to your profile page.`)}
                          className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                        >
                          Set as My State
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="text-yellow-700">No state data available. Try seeding hospitals first.</p>
              <a 
                href="/debug/seed-hospitals" 
                className="mt-2 inline-block px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
              >
                Go to Seed Hospitals Tool
              </a>
            </div>
          )}
        </>
      )}
    </div>
  );
} 