"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Clock, Upload, PlusCircle, FileText, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MedicineReminder {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  time: string;
  notes?: string;
  createdAt: string;
  isActive: boolean;
  aiGenerated: boolean;
}

export default function MedicineReminderPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpenAISetup, setIsOpenAISetup] = useState(false);
  const [isOpenManualSetup, setIsOpenManualSetup] = useState(false);
  const [reminders, setReminders] = useState<MedicineReminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  // Check for success query parameter
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      const isOfflineMode = searchParams.get('offline') === 'true';
      
      setShowSuccessAlert(true);
      
      if (isOfflineMode) {
        setDemoMode(true);
        setError("Your reminders were saved in offline mode due to database connectivity issues. They will be synced when connectivity is restored.");
      }
      
      setTimeout(() => {
        setShowSuccessAlert(false);
        // Remove the success parameter from the URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }, 5000); // Longer time for users to read the offline message
    }
  }, [searchParams]);

  // Toggle demo mode
  const [demoMode, setDemoMode] = useState(false);
  
  const toggleDemoMode = () => {
    setDemoMode(!demoMode);
    if (!demoMode) {
      // When enabling demo mode, fetch reminders again to get dummy data
      fetchReminders(true);
    } else {
      // When disabling, fetch real data
      fetchReminders(false);
    }
  };

  // Fetch medicine reminders
  const fetchReminders = useCallback(async (useDemoMode = demoMode) => {
    if (status !== "authenticated") return;
    
    // Debug the session to see if user ID is present
    console.log("Session data:", session);
    
    if (!session?.user?.id) {
      console.error("No user ID found in session", session);
      setError("No user ID found in session. Please try logging out and back in.");
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // First attempt to fetch data
      const url = useDemoMode 
        ? '/api/user/medicine-reminder?demo=true' 
        : '/api/user/medicine-reminder';
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        // Try to get error details from the response
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || `Error ${response.status}: Failed to fetch medicine reminders`;
        } catch (parseError) {
          errorMessage = `Error ${response.status}: Unable to fetch medicine reminders`;
        }
        
        if (response.status === 401) {
          console.error("Authentication error:", errorMessage);
          setError("Authentication error: Please log out and log back in to refresh your session.");
        } else {
          console.error("Error fetching reminders:", errorMessage);
          setError(`Failed to load your medicine reminders: ${errorMessage}`);
        }
        
        // If not in demo mode and we got an error, try with demo mode
        if (!useDemoMode) {
          console.log("Trying with demo mode after error");
          fetchReminders(true);
          return;
        }
        
        setReminders([]);
        setIsLoading(false);
        return;
      }
      
      // Successful response
      const data = await response.json();
      console.log("Fetched reminders:", data);
      
      if (Array.isArray(data)) {
        setReminders(data);
        if (useDemoMode && !demoMode) {
          // Only set demo mode state if it was auto-enabled due to errors
          setDemoMode(true);
        }
      } else {
        console.error("Invalid response format:", data);
        setError("Received invalid data format from server");
        setReminders([]);
      }
    } catch (err) {
      console.error("Error fetching reminders:", err);
      setError(err instanceof Error ? err.message : "Failed to load your medicine reminders. Please try again.");
      
      // If not already in demo mode, try with demo mode
      if (!useDemoMode) {
        console.log("Trying with demo mode after error");
        fetchReminders(true);
        return;
      }
      
      setReminders([]);
    } finally {
      setIsLoading(false);
    }
  }, [status, session, demoMode]);
  
  // Initial fetch on component mount
  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const handleClearAll = async () => {
    if (reminders.length === 0) return;
    
    if (!confirm("Are you sure you want to clear all medicine reminders?")) {
      return;
    }
    
    try {
      setIsDeleting(true);
      setError(null);
      
      const response = await fetch('/api/user/medicine-reminder', {
        method: 'DELETE',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        // Try to get error details from the response
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || `Error ${response.status}: Failed to clear medicine reminders`;
        } catch (parseError) {
          errorMessage = `Error ${response.status}: Unable to clear medicine reminders`;
        }
        
        console.error("Error clearing reminders:", errorMessage);
        setError(`Failed to clear medicine reminders: ${errorMessage}`);
        return;
      }
      
      setReminders([]);
      // Show success message
      setShowSuccessAlert(true);
      setTimeout(() => setShowSuccessAlert(false), 3000);
    } catch (err) {
      console.error("Error clearing reminders:", err);
      setError(err instanceof Error ? err.message : "Failed to clear medicine reminders. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatFrequency = (frequency: string) => {
    switch (frequency) {
      case 'daily': return 'Once Daily';
      case 'twice-daily': return 'Twice Daily';
      case 'thrice-daily': return 'Three Times Daily';
      case 'weekly': return 'Weekly';
      case 'biweekly': return 'Twice a Week';
      case 'monthly': return 'Monthly';
      default: return frequency;
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <svg className="inline animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Medicine Reminders</h1>
        {demoMode && (
          <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium">
            Offline Mode
          </div>
        )}
      </div>

      {error && !showSuccessAlert && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
              {error.includes('Failed to load') && (
                <button 
                  onClick={() => fetchReminders(true)}
                  className="mt-2 text-sm text-blue-600 underline"
                >
                  Use offline mode instead
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showSuccessAlert && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <div className="h-5 w-5 text-green-400">✓</div>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{error || "Medicine reminders saved successfully!"}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <p className="text-gray-500 mt-1">
            Set reminders for your medications
          </p>
        </div>
        
        {/* Demo Mode Toggle */}
        <div className="flex items-center">
          <label htmlFor="demo-mode" className="mr-2 text-sm text-gray-500">
            Demo Mode
          </label>
          <div className="relative inline-block w-10 mr-2 align-middle select-none">
            <input
              type="checkbox"
              name="demo-mode"
              id="demo-mode"
              checked={demoMode}
              onChange={toggleDemoMode}
              className="sr-only"
            />
            <div className={`block w-10 h-6 rounded-full transition-colors duration-200 ease-in-out ${demoMode ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out transform ${demoMode ? 'translate-x-4' : 'translate-x-0'}`}></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Manual Setup Card */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-4">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-white p-2 rounded-full">
                <PlusCircle className="h-6 w-6 text-indigo-600" />
              </div>
              <h2 className="ml-3 text-lg font-medium text-white">Create Medicine Reminder</h2>
            </div>
          </div>
          <div className="p-6">
            <p className="text-gray-600 mb-6">
              Manually set up reminders for your medications by specifying the medicine name, dosage, and schedule.
            </p>
            <div className="space-y-4">
              <div className="flex items-center text-gray-700">
                <Clock className="h-5 w-5 mr-2 text-indigo-500" />
                <span>Set custom reminder schedules</span>
              </div>
              <div className="flex items-center text-gray-700">
                <PlusCircle className="h-5 w-5 mr-2 text-indigo-500" />
                <span>Add multiple medications</span>
              </div>
            </div>
            <div className="mt-6">
              <Button 
                onClick={() => router.push("/user/medicine-reminder/manual")} 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md"
              >
                Set Up Manually
              </Button>
            </div>
          </div>
        </div>

        {/* AI Setup Card */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-4">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-white p-2 rounded-full">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="ml-3 text-lg font-medium text-white">AI-Assisted Setup</h2>
            </div>
          </div>
          <div className="p-6">
            <p className="text-gray-600 mb-6">
              Upload your medical reports and our AI will automatically identify medications and suggest reminder schedules.
            </p>
            <div className="space-y-4">
              <div className="flex items-center text-gray-700">
                <Upload className="h-5 w-5 mr-2 text-blue-500" />
                <span>Upload prescription or medical report</span>
              </div>
              <div className="flex items-center text-gray-700">
                <Clock className="h-5 w-5 mr-2 text-blue-500" />
                <span>AI recommends optimal timing</span>
              </div>
            </div>
            <div className="mt-6">
              <Button 
                onClick={() => router.push("/user/medicine-reminder/ai-setup")} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md"
              >
                Use AI Assistant
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Current Reminders Section */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-5 sm:px-6 flex justify-between items-center">
          <h3 className="text-lg font-medium text-white">Your Current Medicine Reminders</h3>
          {reminders.length > 0 && (
            <Button 
              variant="outline"
              size="sm"
              className="text-white border-white/30 hover:bg-indigo-700/50"
              onClick={handleClearAll}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {isDeleting ? 'Clearing...' : 'Clear All'}
            </Button>
          )}
        </div>
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <svg className="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : reminders.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No reminders set</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a medicine reminder.</p>
            </div>
          ) : (
            <div>
              <ul className="space-y-3">
                {reminders.map((reminder) => (
                  <li key={reminder.id} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center">
                          <span className="font-medium text-gray-900">{reminder.name}</span>
                          {reminder.aiGenerated && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              AI Detected
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {reminder.dosage} • {formatFrequency(reminder.frequency)} • {reminder.time}
                        </div>
                        {reminder.notes && <div className="text-sm text-gray-500 mt-1">{reminder.notes}</div>}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={async () => {
                          if (confirm(`Delete reminder for ${reminder.name}?`)) {
                            try {
                              const response = await fetch(`/api/user/medicine-reminder/${reminder.id}`, {
                                method: 'DELETE'
                              });
                              
                              if (response.ok) {
                                setReminders(reminders.filter(r => r.id !== reminder.id));
                              } else {
                                setError("Failed to delete reminder");
                              }
                            } catch (err) {
                              console.error("Error deleting reminder:", err);
                              setError("Failed to delete reminder");
                            }
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 