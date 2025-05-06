"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

type Hospital = {
  id: string;
  name: string;
  city?: string | null;
  address?: string | null;
};

export default function EmergencyButton() {
  const { data: session } = useSession();
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showInitialWarning, setShowInitialWarning] = useState(false);
  const [response, setResponse] = useState<{ success?: boolean; message?: string; hospitalInfo?: any } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>("");
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  // Fetch hospitals in user's state when modal opens
  useEffect(() => {
    if (showConfirm && session?.user?.state) {
      fetchHospitalsInState();
    }
  }, [showConfirm, session?.user?.state]);

  // Function to fetch hospitals in the user's state
  const fetchHospitalsInState = async () => {
    if (!session?.user?.state) {
      setError("State information is missing. Please update your profile.");
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setHospitals([]);
    setSelectedHospitalId("");
    
    // Add more detailed debug info
    const debugMsg = `Fetching hospitals for state: ${session.user.state}`;
    console.log(debugMsg);
    setDebugInfo(debugMsg);
    
    try {
      const apiUrl = `/api/hospitals?state=${encodeURIComponent(session.user.state)}`;
      setDebugInfo(prev => `${prev}\nFetching from: ${apiUrl}`);
      console.log(`Making API request to: ${apiUrl}`);
      
      const response = await fetch(apiUrl);
      const responseStatus = response.status;
      setDebugInfo(prev => `${prev}\nAPI Response status: ${responseStatus}`);
      console.log(`API Response status: ${responseStatus}`);
      
      let responseText = '';
      try {
        responseText = await response.text();
        console.log('Raw response text:', responseText);
        setDebugInfo(prev => `${prev}\nRaw response: ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`);
      } catch (textError) {
        console.error('Error reading response text:', textError);
        setDebugInfo(prev => `${prev}\nError reading response: ${textError instanceof Error ? textError.message : String(textError)}`);
        throw new Error('Failed to read response from server');
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Parsed response data:', data);
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
        setDebugInfo(prev => `${prev}\nJSON parse error: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
        throw new Error('Invalid response format from server');
      }
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch hospitals");
      }
      
      // More detailed debug info about the response data
      setDebugInfo(prev => `${prev}\nResponse data: ${JSON.stringify(data, null, 2)}`);
      
      if (data.hospitals && Array.isArray(data.hospitals)) {
        console.log(`Found ${data.hospitals.length} hospitals in state ${session.user.state}`);
        
        if (data.hospitals.length === 0) {
          setDebugInfo(prev => `${prev}\nNo hospitals found in state ${session.user.state}`);
          setError(`No hospitals found in ${session.user.state}. Please contact support.`);
        } else {
          setHospitals(data.hospitals);
          setDebugInfo(prev => `${prev}\nFound ${data.hospitals.length} hospitals`);
          
          // Auto-select the first hospital if available
          if (data.hospitals.length > 0) {
            setSelectedHospitalId(data.hospitals[0].id);
            setDebugInfo(prev => `${prev}\nAuto-selected hospital: ${data.hospitals[0].name} (${data.hospitals[0].id})`);
          }
        }
      } else {
        setHospitals([]);
        setError("Invalid response format from server. Please try again later.");
        setDebugInfo(prev => `${prev}\nNo hospitals array found in response or invalid format`);
        console.error("Invalid response format:", data);
      }
    } catch (error) {
      console.error("Error fetching hospitals:", error);
      setError(error instanceof Error ? error.message : "Failed to load hospitals. Please try again.");
      setDebugInfo(prev => `${prev}\nError: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to send emergency alert
  const sendEmergencyAlert = async () => {
    if (!session?.user?.id) {
      setError("Session not found. Please try logging in again.");
      setIsSending(false);
      return;
    }
    
    // Check if user has state information
    if (!session?.user?.state) {
      setError("User location not found. Please update your profile with your state information.");
      setIsSending(false);
      return;
    }
    
    // Check if a hospital is selected
    if (!selectedHospitalId) {
      setError("Please select a hospital first.");
      return;
    }
    
    // Check if user profile has essential information for emergency situations
    const missingFields = [];
    if (!session.user.name) missingFields.push("name");
    if (!session.user.phone && !session.user.email) missingFields.push("contact information (phone or email)");
    if (missingFields.length > 0) {
      setError(`Please update your profile with your ${missingFields.join(" and ")} before sending an emergency alert.`);
      setIsSending(false);
      return;
    }
    
    setIsSending(true);
    setError(null);
    setResponse(null);
    setDebugInfo(`Preparing to send alert to hospital: ${selectedHospitalId}`);
    
    try {
      const requestBody = {
        hospitalId: selectedHospitalId
      };
      
      setDebugInfo(prev => `${prev}\nRequest body: ${JSON.stringify(requestBody)}`);
      console.log(`Sending emergency alert for user in state: ${session.user.state} to hospital: ${selectedHospitalId}`);
      
      const response = await fetch('/api/user/emergency-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      const responseText = await response.text();
      setDebugInfo(prev => `${prev}\nAPI Response status: ${response.status}\nResponse text: ${responseText}`);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Invalid JSON response: ${responseText}`);
      }
      
      console.log("Emergency alert API response:", data);
      
      if (!response.ok) {
        // Enhanced error handling with specific messages
        let errorMessage = data.error || "Failed to send emergency alert";
        
        if (data.details) {
          console.error("Error details:", data.details);
          setDebugInfo(prev => `${prev}\nError details: ${data.details}`);
          
          // Display user-friendly message based on error type
          if (data.details.includes("Foreign key constraint")) {
            errorMessage = "The selected hospital is not available. Please choose another hospital.";
          } else if (data.details.includes("timeout") || data.details.includes("connection")) {
            errorMessage = "Connection to the server timed out. Please try again later.";
          } else if (data.details.includes("syntax") || data.details.includes("invalid")) {
            errorMessage = "There was an issue with your profile data. Please update your profile and try again.";
          }
        }
        
        throw new Error(errorMessage);
      }
      
      setResponse(data);
      setShowConfirm(false);
    } catch (error) {
      console.error("Error sending emergency alert:", error);
      setError(error instanceof Error ? error.message : "Failed to send emergency alert. Please try again later.");
      setDebugInfo(prev => `${prev}\nError: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSending(false);
    }
  };

  const closeResponse = () => {
    setResponse(null);
  };

  const openConfirmDialog = () => {
    setShowInitialWarning(true);
    setError(null);
  };

  const proceedToFullDialog = () => {
    setShowInitialWarning(false);
    setShowConfirm(true);
    setSelectedHospitalId("");
    setHospitals([]);
    setError(null);
    setDebugInfo("Opening confirmation dialog");
  };

  return (
    <>
      <button
        onClick={openConfirmDialog}
        className="px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        aria-label="Emergency Medical Assistance"
        data-emergency-trigger
      >
        Emergency Alert
      </button>

      {/* Initial Warning Modal */}
      {showInitialWarning && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowInitialWarning(false)}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="relative inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-red-900" id="modal-title">
                    Emergency Alert Warning
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-700 font-medium">
                      You are about to trigger an emergency medical alert.
                    </p>
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md text-left">
                      <p className="text-sm font-bold text-red-600 mb-2">
                        IMPORTANT: This feature is for REAL emergencies only
                      </p>
                      <ul className="text-sm text-gray-700 list-disc pl-5 space-y-2">
                        <li>Use only in genuine medical emergencies requiring immediate attention</li>
                        <li>False alarms are a criminal offense that can result in legal actions and fines</li>
                        <li>Your personal data including medical history will be shared with hospitals</li>
                        <li>Emergency services will be alerted and resources dispatched</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="button"
                  onClick={proceedToFullDialog}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:col-start-2 sm:text-sm"
                >
                  I understand, proceed
                </button>
                <button
                  type="button"
                  onClick={() => setShowInitialWarning(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Alert Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => !isSending && setShowConfirm(false)}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="relative inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    Send Emergency Medical Alert
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Select a hospital from your state and send your medical history and contact information. Only use this feature for genuine medical emergencies.
                    </p>
                    
                    {/* Warning message about false alarms */}
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <div className="flex">
                        <svg className="h-5 w-5 text-yellow-600 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div className="text-left">
                          <p className="text-sm font-medium text-yellow-700">
                            Important Warning
                          </p>
                          <p className="mt-1 text-sm text-yellow-600">
                            Using this emergency alert for non-emergency situations is a criminal offense that can result in legal actions and fines. 
                          </p>
                          <p className="mt-1 text-sm text-yellow-600">
                            By clicking "Send Emergency Alert", you confirm this is a genuine emergency and your personal data (including medical history and location) will be sent to the selected hospital.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {session?.user?.state ? (
                      <div className="mt-2">
                        <p className="text-sm text-gray-700 font-medium">
                          Your state: {session.user.state}
                        </p>
                        
                        {/* Hospital Selection */}
                        <div className="mt-4">
                          <label htmlFor="hospital-select" className="block text-sm font-medium text-gray-700 text-left">
                            Select Hospital
                          </label>
                          
                          {isLoading ? (
                            <div className="mt-2 flex justify-center">
                              <svg className="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            </div>
                          ) : hospitals.length > 0 ? (
                            <select
                              id="hospital-select"
                              value={selectedHospitalId}
                              onChange={(e) => setSelectedHospitalId(e.target.value)}
                              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                              required
                            >
                              <option value="" disabled>Select a hospital</option>
                              {hospitals.map(hospital => (
                                <option key={hospital.id} value={hospital.id}>
                                  {hospital.name} {hospital.city ? `- ${hospital.city}` : ''}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="mt-2 text-sm text-red-600">
                              No hospitals found in your state. Please contact support or try again later.
                            </div>
                          )}
                          
                          {selectedHospitalId && (
                            <div className="mt-2 p-3 bg-gray-50 rounded-md text-left">
                              <p className="text-sm font-medium text-gray-700">Selected hospital:</p>
                              <p className="text-sm text-gray-600">
                                {hospitals.find(h => h.id === selectedHospitalId)?.name}
                              </p>
                              {hospitals.find(h => h.id === selectedHospitalId)?.address && (
                                <p className="text-sm text-gray-600">
                                  {hospitals.find(h => h.id === selectedHospitalId)?.address}
                                  {hospitals.find(h => h.id === selectedHospitalId)?.city ? `, ${hospitals.find(h => h.id === selectedHospitalId)?.city}` : ''}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-red-600">
                        You need to set your state in your profile first.
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {error && (
                <div className="mt-3 p-3 bg-red-50 rounded-md border border-red-200">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
              
              {debugInfo && process.env.NODE_ENV === 'development' && (
                <div className="mt-3 p-3 bg-gray-50 rounded-md border border-gray-200 text-left">
                  <p className="text-xs font-medium text-gray-700">Debug Information:</p>
                  <pre className="mt-1 text-xs text-gray-600 overflow-auto max-h-40">
                    {debugInfo}
                  </pre>
                </div>
              )}
              
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="button"
                  onClick={sendEmergencyAlert}
                  disabled={isSending || isLoading || !selectedHospitalId || !session?.user?.state}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:col-start-2 sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending Alert...
                    </>
                  ) : "Send Emergency Alert"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  disabled={isSending}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Response Modal */}
      {response?.success && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={closeResponse}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="relative inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    Emergency Alert Sent
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      {response.message}
                    </p>
                    {response.hospitalInfo && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-md">
                        <p className="font-medium text-gray-700">Hospital Information:</p>
                        <p className="text-sm text-gray-600">{response.hospitalInfo.name}</p>
                        <p className="text-sm text-gray-600">
                          {[response.hospitalInfo.address, response.hospitalInfo.city].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6">
                <button
                  type="button"
                  onClick={closeResponse}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Response */}
      {error && !showConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setError(null)}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="relative inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    Error Sending Alert
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-red-600">
                      {error}
                    </p>
                    {error.includes("location") || error.includes("state") ? (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm text-gray-700">
                          Please update your profile with your state information to use the emergency alert feature.
                        </p>
                        <a 
                          href="/profile" 
                          className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          Update Profile
                        </a>
                      </div>
                    ) : null}
                    
                    {debugInfo && process.env.NODE_ENV === 'development' && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md border border-gray-200 text-left">
                        <p className="text-xs font-medium text-gray-700">Debug Information:</p>
                        <pre className="mt-1 text-xs text-gray-600 overflow-auto max-h-40">
                          {debugInfo}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6">
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 