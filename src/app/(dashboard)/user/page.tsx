"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import HospitalSelector from "@/components/HospitalSelector";
import { getUserReceipts } from "@/services/queue";
import Link from "next/link";

interface Hospital {
  id: string;
  name: string;
  state: string;
  city?: string | null;
  address?: string | null;
  pincode?: string;
}

interface Receipt {
  id: string;
  status: string;
  severity: number | null;
  queuePosition: number | null;
  uploatedAt: string;
  hospital: {
    name: string;
  } | null;
}

export default function UserDashboard() {
  const { data: session, status } = useSession();
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [isLoadingReceipts, setIsLoadingReceipts] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // If not authenticated, redirect to login
  if (status === "unauthenticated") {
    redirect("/login");
  }

  // Fetch user receipts when session is available
  useEffect(() => {
    async function fetchReceipts() {
      if (session?.user?.id) {
        setIsLoadingReceipts(true);
        try {
          const userReceipts = await getUserReceipts(session.user.id);
          setReceipts(userReceipts);
        } catch (error) {
          console.error("Error fetching receipts:", error);
        } finally {
          setIsLoadingReceipts(false);
        }
      }
    }
    
    fetchReceipts();
  }, [session]);

  // Loading state
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <svg className="inline animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-2 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploadedFile(files[0]);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUploading(true);
    setError(null);
    setSuccessMessage(null);
    setUploadStatus("Preparing your receipt...");

    if (!selectedHospital) {
      setError("Please select a hospital");
      setIsUploading(false);
      setUploadStatus(null);
      return;
    }

    if (!uploadedFile) {
      setError("Please upload a medical receipt");
      setIsUploading(false);
      setUploadStatus(null);
      return;
    }

    try {
      // Convert file to base64
      setUploadStatus("Reading file...");
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (!event.target || !event.target.result) {
          throw new Error("Failed to read file");
        }
        
        const base64String = event.target.result as string;
        const base64Data = base64String.split(",")[1]; // Remove data URL prefix
        
        setUploadStatus("Sending to AI for analysis...");
        
        const response = await fetch("/api/receipts/upload", {
          method: "POST",
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: base64Data,
            hospitalId: selectedHospital.id
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          setError(errorData.error || "Failed to upload receipt");
          setIsUploading(false);
          setUploadStatus(null);
          return;
        }

        setUploadStatus("Finalizing analysis...");
        const data = await response.json();
        
        setUploadStatus("Complete!");
        setSuccessMessage(`Receipt successfully analyzed! You are number ${data.queuePosition} in the queue with severity rating: ${data.severity || 'N/A'}.`);
        setUploadedFile(null);
        
        // Reset the file input
        const fileInput = document.getElementById("receipt") as HTMLInputElement;
        if (fileInput) {
          fileInput.value = "";
        }
        
        // Refresh receipts after upload
        if (session?.user?.id) {
          const userReceipts = await getUserReceipts(session.user.id);
          setReceipts(userReceipts);
        }
        setIsUploading(false);
      };
      
      reader.onerror = () => {
        setError("Failed to read file");
        setIsUploading(false);
        setUploadStatus(null);
      };
      
      // Start reading the file
      reader.readAsDataURL(uploadedFile);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during upload");
      console.error("Upload error:", err);
      setIsUploading(false);
      setUploadStatus(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Your Medical Receipts</h1>
        <Link
          href="/user/upload"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Upload New Receipt
        </Link>
      </div>

      {!session?.user?.state && (
        <div className="rounded-md bg-yellow-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8.485 3.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 3.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Attention needed</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  Please update your profile to select your state to receive better service.{" "}
                  <Link href="/profile" className="font-medium text-yellow-700 underline hover:text-yellow-600">
                    Update profile
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoadingReceipts ? (
        <div className="text-center py-4">
          <svg className="inline animate-spin h-6 w-6 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-2 text-gray-600">Loading your receipts...</p>
        </div>
      ) : receipts.length === 0 ? (
        <div className="rounded-md bg-gray-50 p-8 text-center">
          <h3 className="mt-2 text-sm font-medium text-gray-900">No receipts found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by uploading a new medical receipt.
          </p>
          <div className="mt-6">
            <Link
              href="/user/upload"
              className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <svg
                className="-ml-0.5 mr-1.5 h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              New Receipt
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md bg-white shadow">
          <ul role="list" className="divide-y divide-gray-200">
            {receipts.map((receipt) => (
              <li key={receipt.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {receipt.hospital?.name || "Unknown Hospital"}
                    </p>
                    <p className="text-sm text-gray-500">
                      Uploaded on {new Date(receipt.uploatedAt).toLocaleDateString()}
                    </p>
                    <div className="mt-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          receipt.status === "QUEUED"
                            ? "bg-green-100 text-green-800"
                            : receipt.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-800"
                            : receipt.status === "PROCESSED"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {receipt.status}
                      </span>
                      {receipt.status === "QUEUED" && receipt.queuePosition && (
                        <span className="ml-2 text-xs text-gray-500">
                          Queue Position: {receipt.queuePosition}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center">
                    {receipt.severity !== null && (
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium mr-2 ${
                          receipt.severity > 7
                            ? "bg-red-100 text-red-800"
                            : receipt.severity > 4
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        Severity: {receipt.severity}
                      </span>
                    )}
                    <Link
                      href={`/user/receipt/${receipt.id}`}
                      className="ml-2 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="max-w-4xl mx-auto mt-6">
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Upload Medical Receipt
          </h2>
          <p className="text-gray-600 mb-4">
            Upload your medical receipt to analyze symptoms and get a queue position at your selected hospital.
          </p>
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {successMessage && (
            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-green-700">{successMessage}</p>
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Select Hospital</h3>
              <HospitalSelector
                onSelectHospital={setSelectedHospital}
                selectedHospitalId={selectedHospital?.id}
              />
              
              {selectedHospital && (
                <div className="mt-4 p-3 bg-blue-50 rounded-md">
                  <h4 className="font-medium text-blue-800">Selected Hospital</h4>
                  <p className="text-sm text-blue-700">{selectedHospital.name}</p>
                  <p className="text-sm text-blue-600">
                    {selectedHospital.address && `${selectedHospital.address}, `}
                    {selectedHospital.city && `${selectedHospital.city}, `}
                    {selectedHospital.state}
                    {selectedHospital.pincode && ` - ${selectedHospital.pincode}`}
                  </p>
                </div>
              )}
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Upload Medical Receipt</h3>
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="receipt"
                  className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg
                      className="w-10 h-10 mb-3 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      ></path>
                    </svg>
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">JPG, PNG or PDF (MAX. 10MB)</p>
                    {uploadedFile && (
                      <p className="mt-2 text-sm text-green-600">
                        Selected: {uploadedFile.name}
                      </p>
                    )}
                  </div>
                  <input
                    id="receipt"
                    type="file"
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            </div>
            
            <div>
              <button
                type="submit"
                disabled={isUploading || !selectedHospital || !uploadedFile}
                className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isUploading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {uploadStatus || "Processing..."}
                  </span>
                ) : (
                  "Upload Receipt"
                )}
              </button>
              
              {isUploading && (
                <p className="mt-2 text-xs text-gray-500 text-center">
                  Please wait while we upload and analyze your medical receipt. This may take a few moments.
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 