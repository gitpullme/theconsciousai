"use client";

import { useState } from 'react';
import Link from 'next/link';

export default function SeedHospitalsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; message?: string; count?: number } | null>(null);
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
      
      if (response.ok) {
        setResult({
          success: true,
          message: data.message || "Hospitals seeded successfully",
          count: data.hospitals?.length || 0
        });
      } else {
        setError(data.error || "Failed to seed hospitals");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Seed Hospital Data</h1>
      
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <p className="text-yellow-700">
          This page is for development and debugging purposes. It will add sample hospital data to the database.
        </p>
      </div>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      {result?.success && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
          <p className="text-green-700">{result.message}</p>
          {result.count > 0 && (
            <p className="text-green-700 mt-2">Added {result.count} hospitals to the database.</p>
          )}
        </div>
      )}
      
      <div className="space-y-4">
        <button
          onClick={seedHospitals}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
        >
          {loading ? "Processing..." : "Seed Sample Hospital Data"}
        </button>
        
        <div className="mt-8">
          <Link 
            href="/"
            className="text-blue-600 hover:text-blue-800 underline block mb-2"
          >
            Return to Home
          </Link>
          
          <Link 
            href="/debug/states" 
            className="text-blue-600 hover:text-blue-800 underline block"
          >
            Check Available States
          </Link>
        </div>
      </div>
    </div>
  );
} 