"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";

interface HospitalDetails {
  id: string;
  name: string;
  state: string;
  city?: string | null;
  address?: string | null;
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // UI state
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  
  // User profile fields
  const [userName, setUserName] = useState("");
  const [userState, setUserState] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [userAddress, setUserAddress] = useState<string>("");
  const [states, setStates] = useState<{ id: string; name: string }[]>([]);
  const [profileComplete, setProfileComplete] = useState(false);
  
  // Password reset fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Hospital admin fields
  const [hospitalName, setHospitalName] = useState("");
  const [hospitalAddress, setHospitalAddress] = useState("");
  const [hospitalCity, setHospitalCity] = useState("");
  const [hospitalState, setHospitalState] = useState("");
  const [hospitalDetails, setHospitalDetails] = useState<HospitalDetails | null>(null);
  const [isLoadingHospital, setIsLoadingHospital] = useState(false);

  useEffect(() => {
    // Load states for dropdowns
    async function fetchStates() {
      try {
        const response = await fetch('/api/states');
        if (response.ok) {
          const data = await response.json();
          const statesList = Array.isArray(data) ? data : (data.states || []);
          setStates(statesList);
        }
      } catch (error) {
        console.error("Failed to fetch states:", error);
      }
    }
    
    fetchStates();
  }, []);

  // Utility function for retrying API requests
  async function fetchWithRetry(url: string, options: RequestInit = {}, maxRetries = 3) {
    let retries = 0;
    
    while (retries < maxRetries) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            ...(options.headers || {}),
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        retries++;
        console.error(`Request failed (attempt ${retries}/${maxRetries}):`, error);
        
        if (retries >= maxRetries) {
          throw error;
        }
        
        // Exponential backoff
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, retries - 1)));
      }
    }
    
    throw new Error("Maximum retries exceeded");
  }

  // Fetch complete user profile data with retry
  async function fetchUserProfile() {
    try {
      const userData = await fetchWithRetry('/api/user/profile');
      console.log("Complete user profile loaded:", userData);
      
      // Set all user profile fields
      setUserName(userData.name || "");
      setUserState(userData.state || "");
      
      // Set date of birth if available
      if (userData.dateOfBirth) {
        const date = new Date(userData.dateOfBirth);
        setDateOfBirth(date.toISOString().split('T')[0]);
      }
      
      setGender(userData.gender || "");
      setPhone(userData.phone || "");
      setUserAddress(userData.address || "");
      
      // Check if profile is complete
      const isComplete = Boolean(
        userData.name && 
        userData.state && 
        userData.dateOfBirth && 
        userData.gender
      );
      setProfileComplete(isComplete);
      
      // If user is a hospital admin, fetch hospital details
      if (userData.role === "HOSPITAL" && userData.hospital) {
        fetchHospitalDetails(userData.hospital);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setMessage({ 
        type: "error", 
        text: "Failed to load your profile. Please try refreshing the page." 
      });
    }
  }

  useEffect(() => {
    // Set initial values from session (basic info) and API (complete info)
    if (session?.user) {
      // Set minimal data available from session
      if (session.user.name) {
        setUserName(session.user.name);
      }
      
      // Load complete user profile data from API
      fetchUserProfile();
    }
  }, [session?.user?.id]);

  // Ensure hospital associations are properly loaded
  useEffect(() => {
    if (session?.user?.role === "HOSPITAL") {
      // If we have a hospital ID in the session, use it
      if (session.user.hospital) {
        console.log("Loading hospital from session ID:", session.user.hospital);
        fetchHospitalDetails(session.user.hospital);
      } else {
        // Otherwise, check if the user has a hospital ID in the database
        console.log("No hospital ID in session, checking database...");
        fetch('/api/user/profile')
          .then(response => response.json())
          .then(userData => {
            if (userData.hospital) {
              console.log("Found hospital ID in user data:", userData.hospital);
              fetchHospitalDetails(userData.hospital);
              
              // Update the session with the hospital ID
              update({ 
                user: { hospital: userData.hospital }
              }).catch(error => {
                console.error("Error updating session:", error);
              });
            }
          })
          .catch(error => {
            console.error("Error checking for hospital ID:", error);
          });
      }
    }
  }, [session?.user?.role]);

  // Fetch hospital details
  async function fetchHospitalDetails(hospitalId: string) {
    // Skip if hospital ID is empty, undefined or just whitespace
    if (!hospitalId || hospitalId.trim() === "") {
      console.log("Skipping hospital fetch - invalid ID");
      setMessage({ 
        type: "error", 
        text: "Your account is not linked to a hospital. Please contact support." 
      });
      return;
    }
    
    console.log("Fetching hospital details for ID:", hospitalId);
    setIsLoadingHospital(true);
    try {
      // First try to fetch by ID with retry
      const data = await fetchWithRetry(`/api/hospitals/${hospitalId}`);
      console.log("Hospital data received:", data);
      setHospitalDetails(data);
      setHospitalName(data.name || "");
      setHospitalState(data.state || "");
      setHospitalCity(data.city || "");
      setHospitalAddress(data.address || "");
    } catch (error) {
      console.error("Error fetching hospital details:", error);
      setMessage({ 
        type: "error", 
        text: "Error loading hospital information. Please try again later." 
      });
      
      // Try to find hospital by name if ID lookup failed
      if (typeof hospitalId === 'string' && !hospitalId.match(/^[0-9a-f-]+$/i)) {
        // If hospitalId doesn't look like an ID but more like a name, try name lookup
        await findHospitalByName(hospitalId);
      }
    } finally {
      setIsLoadingHospital(false);
    }
  }

  // Find hospital by name (fallback for older accounts)
  async function findHospitalByName(name: string) {
    console.log("Trying to find hospital by name:", name);
    try {
      // Fetch all hospitals with retry
      const data = await fetchWithRetry('/api/hospitals');
      
      if (data.hospitals && Array.isArray(data.hospitals)) {
        const hospital = data.hospitals.find((h: HospitalDetails) => h.name === name);
        
        if (hospital) {
          console.log("Found hospital by name:", hospital);
          setHospitalDetails(hospital);
          setHospitalName(hospital.name || "");
          setHospitalState(hospital.state || "");
          setHospitalCity(hospital.city || "");
          setHospitalAddress(hospital.address || "");
          
          // Update the user's hospital field to use the ID instead of name
          if (session?.user) {
            console.log("Updating user hospital field to use ID:", hospital.id);
            updateUserHospitalId(hospital.id);
          }
        } else {
          console.error("Hospital not found by name", name);
          setMessage({ 
            type: "error", 
            text: "Could not find your hospital. Please contact support." 
          });
        }
      }
    } catch (error) {
      console.error("Error finding hospital by name:", error);
      setMessage({ 
        type: "error", 
        text: "Failed to search for hospital. Please try again later." 
      });
    }
  }

  // Update user's hospital field to use ID instead of name
  async function updateUserHospitalId(hospitalId: string) {
    try {
      await fetchWithRetry('/api/user/update-hospital', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hospitalId,
        }),
      });

      console.log("User hospital ID updated successfully");
      // The session will be updated on next login or page refresh
    } catch (error) {
      console.error("Error updating user hospital ID:", error);
    }
  }

  // Update user profile
  async function handleUserUpdateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsUpdating(true);
    setMessage(null);

    try {
      // Validate the date format before sending
      let formattedDate = null;
      if (dateOfBirth) {
        try {
          // Make sure it's a valid date
          const date = new Date(dateOfBirth);
          if (!isNaN(date.getTime())) {
            formattedDate = dateOfBirth; // Keep the ISO format for the API
          } else {
            throw new Error("Invalid date format");
          }
        } catch (err) {
          throw new Error("Please enter a valid date of birth");
        }
      }

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: userName,
          state: userState,
          dateOfBirth: formattedDate,
          gender: gender || null,
          phone: phone || null,
          address: userAddress || null,
        }),
      });

      if (response.ok) {
        // Get the updated user data
        const result = await response.json();
        
        // Check if profile is now complete
        const isComplete = Boolean(
          result.user.name && 
          result.user.state && 
          result.user.dateOfBirth && 
          result.user.gender
        );
        setProfileComplete(isComplete);
        
        // Update the session with the new data
        console.log("Updating session with new user data");
        
        try {
          // Update just the changed fields, don't overwrite the entire user object
          await update({
            user: {
              name: userName,
              state: userState,
              dateOfBirth: formattedDate,
              gender: gender || null,
              phone: phone || null,
              address: userAddress || null,
            }
          });
          
          // Show success message
          setMessage({ type: "success", text: "Profile updated successfully!" });
          setShowEditProfile(false);
          
          // Force a page reload to get fresh session data
          window.location.reload();
        } catch (sessionError) {
          console.error("Error updating session:", sessionError);
          // Still show success message because the data was saved to DB
          setMessage({ type: "success", text: "Profile saved, but session update failed. Please refresh the page." });
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || error.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to update profile" });
    } finally {
      setIsUpdating(false);
    }
  }

  // Update hospital profile
  async function handleHospitalUpdateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.user.hospital) return;
    
    setIsUpdating(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/hospitals/${session.user.hospital}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: hospitalName,
          state: hospitalState,
          city: hospitalCity,
          address: hospitalAddress,
        }),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "Hospital details updated successfully!" });
        setShowEditProfile(false);
        
        // Set the hospital details locally instead of refetching
        setHospitalDetails({
          id: session.user.hospital,
          name: hospitalName,
          state: hospitalState,
          city: hospitalCity,
          address: hospitalAddress
        });
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to update hospital details");
      }
    } catch (error) {
      console.error("Error updating hospital details:", error);
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to update hospital details" });
    } finally {
      setIsUpdating(false);
    }
  }

  // Reset password
  async function handlePasswordResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" });
      return;
    }
    
    setIsUpdating(true);
    setMessage(null);

    try {
      await fetchWithRetry('/api/user/reset-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      setMessage({ type: "success", text: "Password updated successfully!" });
      setShowPasswordReset(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Error updating password:", error);
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to update password" });
    } finally {
      setIsUpdating(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return redirect("/login");
  }

  return (
    <div className="space-y-8">
      {message && (
        <div className={`p-4 rounded-md ${message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
          {message.text}
        </div>
      )}

      {/* Render different forms based on user role */}
      {session?.user.role === "HOSPITAL" ? (
        <div className="overflow-hidden bg-white shadow sm:rounded-lg mt-6">
          <div className="px-4 py-5 sm:px-6 bg-indigo-50 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium leading-6 text-indigo-900">Hospital Information</h3>
              <p className="mt-1 max-w-2xl text-sm text-indigo-700">Manage your hospital details</p>
            </div>
            <button
              onClick={() => setShowEditProfile(!showEditProfile)}
              className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {showEditProfile ? "Cancel Editing" : "Update Hospital Profile"}
            </button>
          </div>

          {isLoadingHospital ? (
            <div className="p-6 text-center">
              <svg className="inline animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="mt-2 text-indigo-700">Loading hospital information...</p>
            </div>
          ) : hospitalDetails ? (
            <div className="border-t border-gray-200">
              <dl>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Hospital name</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0 font-medium">
                    {hospitalDetails.name}
                  </dd>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">State</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                    {hospitalDetails.state}
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">City</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                    {hospitalDetails.city || "Not specified"}
                  </dd>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Address</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0 whitespace-pre-line">
                    {hospitalDetails.address || "Not specified"}
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Hospital Administrator</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0 flex items-center">
                    <span className="font-medium">{session?.user?.name}</span>
                    <span className="ml-3 inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                      Admin
                    </span>
                  </dd>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Contact Email</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                    {session?.user?.email}
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-red-600">
                Hospital information not found. Please contact support if this issue persists.
              </p>
              <div className="mt-4">
                <Link 
                  href="/profile/fix-hospital" 
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Repair Hospital Association
                </Link>
              </div>
            </div>
          )}

          {showEditProfile && hospitalDetails && (
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6 bg-gray-50">
              <h4 className="text-md font-medium text-gray-900 mb-4">Update Hospital Information</h4>
              <form onSubmit={handleHospitalUpdateSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-6">
                    <label htmlFor="hospitalName" className="block text-sm font-medium text-gray-700">
                      Hospital Name
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        id="hospitalName"
                        name="hospitalName"
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        value={hospitalName}
                        onChange={(e) => setHospitalName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="hospitalState" className="block text-sm font-medium text-gray-700">
                      State
                    </label>
                    <div className="mt-1">
                      <select
                        id="hospitalState"
                        name="hospitalState"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-700 py-2.5 px-4"
                        value={hospitalState}
                        onChange={(e) => setHospitalState(e.target.value)}
                        required
                      >
                        <option value="" className="text-gray-700">Select a state</option>
                        {states.map((state) => (
                          <option key={state.id} value={state.name} className="text-gray-700">
                            {state.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="hospitalCity" className="block text-sm font-medium text-gray-700">
                      City
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        id="hospitalCity"
                        name="hospitalCity"
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        value={hospitalCity}
                        onChange={(e) => setHospitalCity(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-6">
                    <label htmlFor="hospitalAddress" className="block text-sm font-medium text-gray-700">
                      Address
                    </label>
                    <div className="mt-1">
                      <textarea
                        id="hospitalAddress"
                        name="hospitalAddress"
                        rows={3}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        value={hospitalAddress}
                        onChange={(e) => setHospitalAddress(e.target.value)}
                      />
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      Enter the full hospital address with pin/zip code
                    </p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowEditProfile(false)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {isUpdating ? "Updating..." : "Update Hospital"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">User Profile</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Your personal information.</p>
          </div>
          
          {/* User Profile Details Card */}
          <div className="overflow-hidden bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium leading-6 text-gray-900">Personal Information</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Your personal details and preferences</p>
              </div>
              <div className="flex items-center">
                {profileComplete ? (
                  <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-0.5 text-sm font-medium text-green-800 mr-4">
                    <svg className="-ml-1 mr-1.5 h-2 w-2 text-green-400" fill="currentColor" viewBox="0 0 8 8">
                      <circle cx="4" cy="4" r="3" />
                    </svg>
                    Complete
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-yellow-100 px-3 py-0.5 text-sm font-medium text-yellow-800 mr-4">
                    <svg className="-ml-1 mr-1.5 h-2 w-2 text-yellow-400" fill="currentColor" viewBox="0 0 8 8">
                      <circle cx="4" cy="4" r="3" />
                    </svg>
                    Incomplete
                  </span>
                )}
                <button
                  onClick={() => setShowEditProfile(!showEditProfile)}
                  className="inline-flex items-center rounded-md border border-transparent bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  {showEditProfile ? "Cancel Editing" : "Update Profile"}
                </button>
              </div>
            </div>
            <div className="border-t border-gray-200">
              <dl>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Full name</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                    {session?.user?.name || "Not set"}
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Email address</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                    {session?.user?.email}
                  </dd>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">State</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                    {session?.user?.state || (
                      <span className="text-yellow-600 font-medium">Not set - required for hospital selection</span>
                    )}
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                    {session?.user?.dateOfBirth ? (
                      (() => {
                        try {
                          const date = new Date(session.user.dateOfBirth);
                          if (!isNaN(date.getTime())) {
                            return date.toLocaleDateString();
                          }
                          return "Invalid date format";
                        } catch (e) {
                          return "Invalid date format";
                        }
                      })()
                    ) : (
                      <span className="text-yellow-600 font-medium">Not set</span>
                    )}
                  </dd>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Gender</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                    {session?.user?.gender || (
                      <span className="text-yellow-600 font-medium">Not set</span>
                    )}
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Phone Number</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                    {session?.user?.phone || "Not provided"}
                  </dd>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Address</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0 whitespace-pre-line">
                    {session?.user?.address || "Not provided"}
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Account Type</dt>
                  <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-0.5 text-sm font-medium text-blue-800">
                      {session?.user?.role === "HOSPITAL" ? "Hospital Administrator" : "Patient"}
                    </span>
                  </dd>
                </div>
              </dl>
              <div className="bg-gray-50 px-4 py-4 sm:px-6">
                <div className="text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordReset(!showPasswordReset);
                      setShowEditProfile(false);
                    }}
                    className="font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    Change your password
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Edit User Form */}
          {showEditProfile && (
            <div className="mt-6 bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">Update Profile Information</h4>
                <form onSubmit={handleUserUpdateSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-6">
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <div className="mt-1">
                        <input
                          type="text"
                          id="name"
                          name="name"
                          autoComplete="name"
                          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          value={userName}
                          onChange={(e) => setUserName(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-3">
                      <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                        State <span className="text-red-500">*</span>
                      </label>
                      <div className="mt-1">
                        <select
                          id="state"
                          name="state"
                          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md bg-white text-gray-700"
                          value={userState}
                          onChange={(e) => setUserState(e.target.value)}
                          required
                        >
                          <option value="" className="text-gray-700">Select a state</option>
                          {states.map((state) => (
                            <option key={state.id} value={state.name} className="text-gray-700">
                              {state.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="sm:col-span-3">
                      <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">
                        Date of Birth <span className="text-red-500">*</span>
                      </label>
                      <div className="mt-1">
                        <input
                          type="date"
                          id="dateOfBirth"
                          name="dateOfBirth"
                          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          value={dateOfBirth}
                          onChange={(e) => setDateOfBirth(e.target.value)}
                          required
                          max={new Date().toISOString().split('T')[0]} // Set max date to today
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-3">
                      <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
                        Gender <span className="text-red-500">*</span>
                      </label>
                      <div className="mt-1">
                        <select
                          id="gender"
                          name="gender"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white text-gray-700"
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                          required
                        >
                          <option value="" className="text-gray-700">Select gender</option>
                          <option value="Male" className="text-gray-700">Male</option>
                          <option value="Female" className="text-gray-700">Female</option>
                          <option value="Other" className="text-gray-700">Other</option>
                          <option value="Prefer not to say" className="text-gray-700">Prefer not to say</option>
                        </select>
                      </div>
                    </div>

                    <div className="sm:col-span-3">
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                        Phone Number
                      </label>
                      <div className="mt-1">
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          autoComplete="tel"
                          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-6">
                      <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                        Address
                      </label>
                      <div className="mt-1">
                        <textarea
                          id="address"
                          name="address"
                          rows={3}
                          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          value={userAddress}
                          onChange={(e) => setUserAddress(e.target.value)}
                        />
                      </div>
                      <p className="mt-2 text-sm text-gray-500">
                        Enter your full address including city and pin/zip code
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowEditProfile(false)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isUpdating}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      {isUpdating ? "Updating..." : "Update Profile"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          
          {/* Password Reset Form */}
          {showPasswordReset && (
            <div className="border-t border-gray-200">
              <form onSubmit={handlePasswordResetSubmit} className="px-4 py-5 sm:p-6 bg-gray-50">
                <h4 className="text-md font-medium text-gray-900 mb-4">Reset Password</h4>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">Current Password</label>
                    <input
                      type="password"
                      id="currentPassword"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">New Password</label>
                    <input
                      type="password"
                      id="newPassword"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                    <input
                      type="password"
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {isUpdating ? "Updating..." : "Reset Password"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}