"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";

export default function UploadReceipt() {
  const { data: session } = useSession();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<{
    queuePosition?: number;
    hospitalName?: string;
    severity?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedHospital, setSelectedHospital] = useState<string>("");
  const [states, setStates] = useState<{ id: string; name: string }[]>([]);
  const [hospitals, setHospitals] = useState<{ id: string; name: string }[]>([]);

  // Fetch states on component mount
  useEffect(() => {
    async function fetchStates() {
      try {
        const response = await fetch('/api/states');
        if (response.ok) {
          const data = await response.json();
          // Handle both array response and object with states property
          const statesData = Array.isArray(data) ? data : (data.states || []);
          setStates(statesData);
          
          // If user has a state set in their profile, select it by default
          if (session?.user?.state) {
            setSelectedState(session.user.state);
            fetchHospitals(session.user.state);
          }
        }
      } catch (error) {
        console.error("Failed to fetch states:", error);
        setStates([]); // Set empty array on error to prevent mapping issues
      }
    }
    
    fetchStates();
  }, [session]);

  // Fetch hospitals when state changes
  async function fetchHospitals(state: string) {
    if (!state) return;
    
    try {
      const response = await fetch(`/api/hospitals?state=${encodeURIComponent(state)}`);
      if (response.ok) {
        const data = await response.json();
        // Extract hospitals from the response
        setHospitals(data.hospitals || []);
      }
    } catch (error) {
      console.error("Failed to fetch hospitals:", error);
      setHospitals([]); // Set empty array on error to prevent mapping issues
    }
  }

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setFile(file);
      
      // Create a preview URL
      const previewUrl = URL.createObjectURL(file);
      setPreviewUrl(previewUrl);
      
      // Clean up preview URL when component unmounts
      return () => URL.revokeObjectURL(previewUrl);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'image/heic': [],
      'application/pdf': []
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const state = e.target.value;
    setSelectedState(state);
    setSelectedHospital("");
    fetchHospitals(state);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError("Please upload a receipt image");
      return;
    }
    
    if (!selectedHospital) {
      setError("Please select a hospital");
      return;
    }
    
    setIsUploading(true);
    setError(null);
    setUploadStatus("Preparing image...");
    setUploadSuccess(false);
    setUploadResult(null);
    
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(",")[1]; // Remove data URL prefix
        
        setUploadStatus("Uploading medical report...");
        
        // Send to API
        const response = await fetch('/api/receipts/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: base64Data,
            hospitalId: selectedHospital
          }),
        });
        
        if (response.ok) {
          const result = await response.json();
          setUploadStatus("Analysis complete!");
          setUploadSuccess(true);
          setUploadResult(result);
          
          // Wait 3 seconds before redirecting to show the success message
          setTimeout(() => {
            router.push('/user');
          }, 3000);
        } else {
          const data = await response.json();
          setError(data.error || "Failed to upload receipt");
          setUploadStatus("");
        }
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading receipt:", error);
      setError("Failed to upload receipt");
      setUploadStatus("");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Medical Receipt</h1>
        <p className="mt-1 text-sm text-gray-600">
          Upload your medical receipt to add yourself to the hospital queue
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clipRule="evenodd"
                />
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div className="sm:col-span-3">
            <label htmlFor="state" className="block text-sm font-medium text-gray-700">
              State
            </label>
            <select
              id="state"
              name="state"
              value={selectedState}
              onChange={handleStateChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">Select a state</option>
              {states.map((state) => (
                <option key={state.id} value={state.name}>
                  {state.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="hospital" className="block text-sm font-medium text-gray-700">
              Hospital
            </label>
            <select
              id="hospital"
              name="hospital"
              value={selectedHospital}
              onChange={(e) => setSelectedHospital(e.target.value)}
              required
              disabled={!selectedState}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">Select a hospital</option>
              {hospitals.map((hospital) => (
                <option key={hospital.id} value={hospital.id}>
                  {hospital.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-6">
            <label className="block text-sm font-medium text-gray-700">
              Medical Receipt
            </label>
            <div
              {...getRootProps()}
              className={`mt-1 flex justify-center rounded-md border-2 ${
                isDragActive ? "border-indigo-500 bg-indigo-50" : "border-dashed border-gray-300"
              } px-6 pt-5 pb-6`}
            >
              <div className="space-y-3 text-center">
                {previewUrl ? (
                  <div className="relative mx-auto h-32 w-32 text-sm">
                    <Image
                      src={previewUrl}
                      alt="Receipt preview"
                      fill
                      style={{ objectFit: "contain" }}
                    />
                  </div>
                ) : (
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    xmlns="http://www.w3.org/2000/svg"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 14v20c0 4.418 7.163 8 16 8 1.381 0 2.721-.087 4-.252M8 14c0 4.418 7.163 8 16 8s16-3.582 16-8M8 14c0-4.418 7.163-8 16-8s16 3.582 16 8m0 0v14m0-4c0 4.418-7.163 8-16 8S8 28.418 8 24m32 10v6m0 0v6m0-6h6m-6 0h-6"
                    />
                  </svg>
                )}
                <div className="flex text-sm text-gray-600">
                  <input
                    {...getInputProps()}
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                  />
                  <p className="pl-1">
                    {previewUrl ? (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFile(null);
                            setPreviewUrl(null);
                          }}
                          className="font-medium text-indigo-600 hover:text-indigo-500"
                        >
                          Remove
                        </button>
                        {" or drag and drop to replace"}
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-indigo-600 hover:text-indigo-500">
                          Click to upload
                        </span>
                        {" or drag and drop"}
                      </>
                    )}
                  </p>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, HEIC, PDF up to 10MB</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => router.push('/user')}
            className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isUploading || !file || !selectedHospital}
            className="ml-3 inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin mr-2 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                {uploadStatus || "Processing..."}
              </>
            ) : (
              "Upload and Process"
            )}
          </button>
        </div>
      </form>
      
      {uploadSuccess && uploadResult && (
        <div className="mt-6 bg-green-50 border-l-4 border-green-400 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg 
                className="h-5 w-5 text-green-400" 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path 
                  fillRule="evenodd" 
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
                  clipRule="evenodd" 
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Analysis Complete</h3>
              <div className="mt-2 text-sm text-green-700">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Hospital: {uploadResult.hospitalName}</li>
                  <li>Queue Position: #{uploadResult.queuePosition}</li>
                  {uploadResult.severity !== undefined && (
                    <li>Severity Rating: {uploadResult.severity}/10</li>
                  )}
                </ul>
                <p className="mt-2">Redirecting to your dashboard...</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 