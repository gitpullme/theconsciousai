"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function HospitalSettings() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // State for modal dialogs
  const [showClearDataConfirm, setShowClearDataConfirm] = useState(false);
  const [showDeleteHospitalConfirm, setShowDeleteHospitalConfirm] = useState(false);
  
  // Operation states
  const [isClearing, setIsClearing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Confirmation text state
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  // Refs for modal content
  const clearModalRef = useRef<HTMLDivElement>(null);
  const deleteModalRef = useRef<HTMLDivElement>(null);

  // Check authentication
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <svg className="inline animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-2 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (status !== "authenticated" || session?.user?.role !== "HOSPITAL") {
    router.push("/");
    return null;
  }

  // Function to clear all patient data for this hospital
  const clearAllData = async () => {
    if (!session?.user?.hospital) return;
    
    setIsClearing(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/hospital/clear-data', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      let errorData;
      try {
        const data = await response.json();
      
      if (!response.ok) {
          errorData = data;
          throw new Error(data.error || "Failed to clear hospital data");
        }
        
        // Success case with detailed message
        let successMessage = "All patient data has been successfully cleared.";
        if (data.details) {
          // Build a more detailed success message
          const details = data.details;
          const detailsArray = [];
          
          if (details.appointments) detailsArray.push(`${details.appointments} appointments`);
          if (details.receipts) detailsArray.push(`${details.receipts} receipts`);
          if (details.emergencyAlerts) detailsArray.push(`${details.emergencyAlerts} emergency alerts`);
          
          if (detailsArray.length > 0) {
            successMessage += ` Cleared: ${detailsArray.join(', ')}.`;
          }
        }
        
        setSuccess(successMessage);
        setShowClearDataConfirm(false);
      } catch (jsonError) {
        console.error("Error parsing response:", jsonError);
        if (errorData) {
        throw new Error(errorData.error || "Failed to clear hospital data");
        } else {
          throw new Error("Server returned an invalid response format");
        }
      }
    } catch (error) {
      console.error("Error clearing hospital data:", error);
      setError(error instanceof Error ? error.message : "Failed to clear hospital data");
    } finally {
      setIsClearing(false);
    }
  };

  // Function to delete the hospital account
  const deleteHospitalAccount = async () => {
    if (!session?.user?.hospital) return;
    
    // Check if confirmation text matches "DELETE"
    if (deleteConfirmText !== "DELETE") {
      setError("Please type DELETE to confirm account deletion");
      return;
    }
    
    setIsDeleting(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/hospital/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete hospital account");
      }
      
      // Sign out and redirect to home page after successful deletion
      router.push('/api/auth/signout');
    } catch (error) {
      console.error("Error deleting hospital account:", error);
      setError(error instanceof Error ? error.message : "Failed to delete hospital account");
      setIsDeleting(false);
    }
  };

  // Render the Clear Data Confirmation Modal
  const renderClearDataConfirmationModal = () => {
    if (!showClearDataConfirm) return null;
    
    const stopPropagation = (e: React.MouseEvent) => {
      e.stopPropagation();
    };
    
    return (
      <div 
        ref={clearModalRef}
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] bg-white rounded-lg w-[480px] p-6 shadow-lg"
        style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' }}
        onClick={stopPropagation}
      >
        <div className="text-center mb-4">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
            <svg className="h-6 w-6 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            Clear All Patient Data
          </h3>
          <p className="text-gray-600 mb-6">
            This will delete all appointments, medical records, and other patient data for your hospital. This action cannot be undone.
          </p>
        </div>
        <div className="flex justify-center space-x-3">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowClearDataConfirm(false);
            }}
            disabled={isClearing}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              clearAllData();
            }}
            disabled={isClearing}
            className="flex-1 py-2 px-4 bg-amber-600 text-white rounded-md hover:bg-amber-700 focus:outline-none"
          >
            {isClearing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Clearing...
              </>
            ) : "Yes, Clear All Data"}
          </button>
        </div>
      </div>
    );
  };

  // Render the Delete Hospital Confirmation Modal
  const renderDeleteHospitalConfirmationModal = () => {
    if (!showDeleteHospitalConfirm) return null;
    
    const stopPropagation = (e: React.MouseEvent) => {
      e.stopPropagation();
    };
    
    return (
      <div 
        ref={deleteModalRef}
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[9999] bg-white rounded-lg w-[480px] p-6 shadow-lg"
        style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' }}
        onClick={stopPropagation}
      >
        <div className="text-center mb-4">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            Delete Hospital Account
          </h3>
          <p className="text-gray-600 mb-4">
            Are you absolutely sure you want to delete your hospital account? All of your data will be permanently removed. This action cannot be undone.
          </p>
          <div className="mb-6">
            <p className="text-sm font-medium text-red-600 mb-1">
              Please type "DELETE" to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-red-500"
              placeholder="Type DELETE"
            />
          </div>
        </div>
        <div className="flex justify-center space-x-3">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowDeleteHospitalConfirm(false);
              setDeleteConfirmText('');
            }}
            disabled={isDeleting}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              deleteHospitalAccount();
            }}
            disabled={isDeleting || deleteConfirmText !== "DELETE"}
            className={`flex-1 py-2 px-4 rounded-md text-white focus:outline-none ${deleteConfirmText === "DELETE" ? 'bg-red-600 hover:bg-red-700' : 'bg-red-300 cursor-not-allowed'}`}
          >
            {isDeleting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Deleting...
              </>
            ) : "Delete Account"}
          </button>
        </div>
      </div>
    );
  };

  // Add a useEffect to prevent scrolling when modals are open
  useEffect(() => {
    if (showClearDataConfirm || showDeleteHospitalConfirm) {
      // Prevent scrolling on the body
      document.body.style.overflow = 'hidden';
    } else {
      // Restore scrolling
      document.body.style.overflow = 'auto';
    }
    
    // Cleanup function to ensure we restore scrolling when component unmounts
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showClearDataConfirm, showDeleteHospitalConfirm]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between bg-white rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Hospital Settings</h1>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 border border-red-200 shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
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
        <div className="rounded-lg bg-green-50 p-4 border border-green-200 shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Success</h3>
              <div className="mt-2 text-sm text-green-700">
                <p>{success}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hospital Information Section */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 bg-slate-50">
          <h2 className="text-lg font-medium text-slate-900">Hospital Information</h2>
          <p className="mt-1 text-sm text-slate-500">Hospital profile and contact details</p>
        </div>
        <div className="px-6 py-5">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Hospital Name</label>
              <div className="mt-1 text-sm text-slate-900 font-medium">{session?.user?.name || "Not set"}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <div className="mt-1 text-sm text-slate-900 font-medium">{session?.user?.email || "Not set"}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Location</label>
              <div className="mt-1 text-sm text-slate-900 font-medium">
                {session?.user?.state && (session?.user as any)?.city
                  ? `${(session.user as any).city}, ${session.user.state}` 
                  : session?.user?.state || "Location not set"}
              </div>
            </div>
          </div>
          <div className="mt-6">
            <Link
              href="/profile"
              className="inline-flex items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors duration-200"
            >
              Edit Hospital Profile
            </Link>
          </div>
        </div>
      </div>

      {/* Staff Management Section */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 bg-slate-50">
          <h2 className="text-lg font-medium text-slate-900">Staff Management</h2>
          <p className="mt-1 text-sm text-slate-500">Manage doctors and hospital staff</p>
        </div>
        <div className="px-6 py-5">
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Add, edit, or remove doctors from your hospital. Assign specialties and manage availability.
            </p>
            <div>
              <Link
                href="/hospital/doctors"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-slate-700 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors duration-200"
              >
                Manage Staff
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Queue Management Section */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 bg-slate-50">
          <h2 className="text-lg font-medium text-slate-900">Queue Management</h2>
          <p className="mt-1 text-sm text-slate-500">Settings for patient queue handling</p>
        </div>
        <div className="px-6 py-5">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="auto-queue" className="block text-sm font-medium text-slate-700">Auto-Queue New Patients</label>
                <p className="text-xs text-slate-500 mt-1">Automatically add patients to the queue when reports are uploaded</p>
                <div className="mt-2">
                  <select
                    id="auto-queue"
                    className="block w-full rounded-md border-slate-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm"
                    defaultValue="enabled"
                  >
                    <option value="enabled">Enabled</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="severity-threshold" className="block text-sm font-medium text-slate-700">High Priority Threshold</label>
                <p className="text-xs text-slate-500 mt-1">Severity level threshold for high priority patients</p>
                <div className="mt-2">
                  <select
                    id="severity-threshold"
                    className="block w-full rounded-md border-slate-300 shadow-sm focus:border-slate-500 focus:ring-slate-500 sm:text-sm"
                    defaultValue="8"
                  >
                    <option value="5">5+</option>
                    <option value="6">6+</option>
                    <option value="7">7+</option>
                    <option value="8">8+</option>
                    <option value="9">9+</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="pt-4">
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-slate-700 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors duration-200"
              >
                Save Queue Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Data Management Section */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 bg-slate-50">
          <h2 className="text-lg font-medium text-slate-900">Data Management</h2>
          <p className="mt-1 text-sm text-slate-500">Manage your hospital data</p>
        </div>
        <div className="px-6 py-5 space-y-6">
          {/* Clear All Data */}
          <div>
            <h3 className="text-md font-medium text-slate-800">Clear Patient Data</h3>
            <div className="mt-2 max-w-xl text-sm text-slate-500">
              <p>
                Remove all patient appointments, medical records, and other data. This action cannot be undone.
              </p>
            </div>
            <div className="mt-3">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setShowClearDataConfirm(true);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors duration-200"
              >
                Clear All Patient Data
              </button>
            </div>
          </div>

          <div className="pt-5 border-t border-gray-200">
            <h3 className="text-md font-medium text-red-600">Danger Zone</h3>
            <div className="mt-2 max-w-xl text-sm text-slate-500">
              <p>
                Delete your hospital account permanently. This will remove all associated data and cannot be undone.
              </p>
            </div>
            <div className="mt-3">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setShowDeleteHospitalConfirm(true);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
              >
                Delete Hospital Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {renderClearDataConfirmationModal()}
      {renderDeleteHospitalConfirmationModal()}
    </div>
  );
} 