"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

export default function AdminDebugPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [hospitalData, setHospitalData] = useState<any>(null);
  const [message, setMessage] = useState<{type: "success" | "error", text: string} | null>(null);

  // Check if user is admin
  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login");
    } else if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      redirect("/");
    }
  }, [status, session]);

  // Function to check hospital data
  const checkHospitals = async () => {
    setLoading(true);
    setMessage(null);
    
    try {
      const response = await fetch("/api/debug/hospitals");
      
      if (!response.ok) {
        throw new Error("Failed to fetch hospital data");
      }
      
      const data = await response.json();
      setHospitalData(data);
      
      if (data.totalHospitals === 0) {
        setMessage({
          type: "error",
          text: "No hospitals found in the database. Use the 'Seed Hospitals' button to add sample data."
        });
      }
    } catch (error) {
      console.error("Error checking hospitals:", error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to check hospital data"
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to seed hospitals
  const seedHospitals = async () => {
    setLoading(true);
    setMessage(null);
    
    try {
      const response = await fetch("/api/debug/seed-hospitals", {
        method: "POST"
      });
      
      if (!response.ok) {
        throw new Error("Failed to seed hospitals");
      }
      
      const data = await response.json();
      
      if (data.success) {
        setMessage({
          type: "success",
          text: data.message
        });
        
        // Refresh hospital data
        checkHospitals();
      } else {
        setMessage({
          type: "error",
          text: data.message || "No action taken"
        });
      }
    } catch (error) {
      console.error("Error seeding hospitals:", error);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to seed hospitals"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Debug Tools</h1>
      
      {/* Message display */}
      {message && (
        <div className={`p-4 mb-6 rounded-md ${message.type === "success" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
          <p className={`text-sm ${message.type === "success" ? "text-green-700" : "text-red-700"}`}>
            {message.text}
          </p>
        </div>
      )}
      
      {/* Hospital Data Tools */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
        <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Hospital Database</h2>
          <p className="mt-1 text-sm text-gray-500">Check and manage hospital data in the system</p>
        </div>
        
        <div className="px-4 py-5 sm:p-6">
          <div className="flex space-x-4 mb-6">
            <button
              onClick={checkHospitals}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Check Hospitals"}
            </button>
            
            <button
              onClick={seedHospitals}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Seed Hospitals"}
            </button>
            
            <a
              href="/api/debug/seed-hospitals"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Direct API
            </a>
            
            <a
              href="/api/debug/seed-hospitals?override=true"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md shadow-sm text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Force Reset
            </a>
          </div>
          
          {hospitalData && (
            <div className="space-y-6">
              <div>
                <h3 className="text-md font-medium text-gray-900">Hospital Summary</h3>
                <p className="text-sm text-gray-500 mt-1">Total hospitals: {hospitalData.totalHospitals}</p>
              </div>
              
              {hospitalData.hospitalsByState && hospitalData.hospitalsByState.length > 0 && (
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-2">Hospitals by State</h3>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <ul className="divide-y divide-gray-200">
                      {hospitalData.hospitalsByState.map((item: any, index: number) => (
                        <li key={index} className="py-2">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">{item.state}</span>
                            <span className="text-sm text-gray-500">{item._count.id} hospitals</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              
              {hospitalData.sampleHospitals && hospitalData.sampleHospitals.length > 0 && (
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-2">Sample Hospitals</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">State</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {hospitalData.sampleHospitals.map((hospital: any) => (
                          <tr key={hospital.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{hospital.id}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{hospital.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{hospital.state}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{hospital.city}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-md text-sm text-gray-500">
        <p>Note: These debug tools are only available to administrators and should be used with caution in production environments.</p>
      </div>
    </div>
  );
} 