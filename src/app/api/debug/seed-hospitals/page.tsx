"use client";

import { useState } from "react";
import Link from "next/link";

export default function SeedHospitalsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const seedHospitals = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await fetch('/api/debug/seed-hospitals', {
        method: 'POST',
      });
      
      const data = await response.json();
      setResult(data);
      
      if (!response.ok) {
        setError(data.error || "Failed to seed hospitals");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const resetHospitals = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await fetch('/api/debug/seed-hospitals?override=true', {
        method: 'POST',
      });
      
      const data = await response.json();
      setResult(data);
      
      if (!response.ok) {
        setError(data.error || "Failed to reset and seed hospitals");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Seed Hospitals Tool</h1>
      
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <p className="text-yellow-700">
          This tool is for development and debugging purposes only. It will add sample hospital data to the database.
        </p>
      </div>
      
      <div className="flex space-x-4 mb-8">
        <button
          onClick={seedHospitals}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Seed Hospitals"}
        </button>
        
        <button
          onClick={resetHospitals}
          disabled={loading}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Reset & Seed Hospitals"}
        </button>
        
        <Link href="/api/debug/hospitals" className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 inline-block">
          View Hospital Debug Info
        </Link>
      </div>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      {result && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">Result</h2>
          
          {result.success ? (
            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
              <p className="text-green-700">{result.message}</p>
            </div>
          ) : (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <p className="text-yellow-700">{result.message || "No action taken"}</p>
            </div>
          )}
          
          {result.hospitalsByState && (
            <div className="mt-4">
              <h3 className="text-md font-medium mb-2">Hospitals by State</h3>
              <div className="bg-gray-50 p-4 rounded">
                <ul className="divide-y divide-gray-200">
                  {result.hospitalsByState.map((item: any, index: number) => (
                    <li key={index} className="py-2 flex justify-between">
                      <span>{item.state}</span>
                      <span className="text-gray-500">{item._count.id} hospitals</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          {result.hospitals && result.hospitals.length > 0 && (
            <div className="mt-4">
              <h3 className="text-md font-medium mb-2">Sample Hospitals Created</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">State</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {result.hospitals.map((hospital: any) => (
                      <tr key={hospital.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{hospital.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{hospital.state}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          <div className="mt-4 text-sm text-gray-500">
            <p>Process completed at: {new Date().toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  );
} 