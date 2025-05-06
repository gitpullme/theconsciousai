"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { INDIAN_STATES } from "@/lib/constants";

interface UploadResult {
  id: string;
  queuePosition?: number;
  hospitalName?: string;
  severity?: number;
  aiAnalysis?: string;
  doctor?: {
    name: string;
    specialty: string;
  } | null;
}

// Processing steps for better user feedback
const PROCESSING_STEPS = [
  { key: 'initializing', label: 'Initializing upload...', percent: 5 },
  { key: 'preparing', label: 'Preparing image...', percent: 10 },
  { key: 'compressing', label: 'Optimizing file size...', percent: 20 },
  { key: 'uploading', label: 'Uploading medical report...', percent: 35 },
  { key: 'validating', label: 'Validating document...', percent: 45 },
  { key: 'analyzing', label: 'AI analyzing your medical report...', percent: 65 },
  { key: 'extracting', label: 'Extracting medical data...', percent: 75 },
  { key: 'queueing', label: 'Determining queue position...', percent: 85 },
  { key: 'finalizing', label: 'Finalizing your request...', percent: 95 },
  { key: 'complete', label: 'Analysis complete!', percent: 100 }
];

// Additional tips for each processing step to make waiting feel shorter
const PROCESSING_TIPS = {
  initializing: "We're preparing everything for a smooth upload experience.",
  preparing: "Image quality matters for accurate analysis. We'll ensure your report is clear and legible.",
  compressing: "Optimizing your file for faster analysis without losing important details.",
  uploading: "Your data is being transferred through a secure connection to ensure privacy.",
  validating: "We're making sure your document meets all requirements for accurate analysis.",
  analyzing: "Our advanced AI is examining your medical data for key health indicators.",
  extracting: "Identifying important medical terms, diagnoses, and recommendations from your report.",
  queueing: "Calculating your priority based on medical urgency and current hospital capacity.",
  finalizing: "Almost done! Putting together all the information to provide you with accurate results.",
  complete: "Processing complete. You'll see your results in just a moment."
};

export default function UploadReport() {
  const { data: session } = useSession();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [progressStep, setProgressStep] = useState<string>("");
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedHospital, setSelectedHospital] = useState<string>("");
  const [hospitals, setHospitals] = useState<{ id: string; name: string }[]>([]);
  const [showAnalysisDetails, setShowAnalysisDetails] = useState(false);
  const [isLoadingHospitals, setIsLoadingHospitals] = useState(false);

  // Instead of fetching states, use the static data
  const states = useMemo(() => INDIAN_STATES, []);

  // Set user's state if available in session
  useEffect(() => {
    if (session?.user?.state) {
      setSelectedState(session.user.state);
      fetchHospitals(session.user.state);
    }
  }, [session]);

  // Cache for hospitals to avoid repeated fetches
  const hospitalsCache = useMemo(() => new Map<string, any[]>(), []);

  // Optimized function to fetch hospitals with caching
  async function fetchHospitals(state: string) {
    if (!state) return;
    
    setIsLoadingHospitals(true);
    setError(null);
    
    try {
      // Check cache first
      if (hospitalsCache.has(state)) {
        setHospitals(hospitalsCache.get(state) || []);
        
        // Auto-select first hospital if available
        const cachedHospitals = hospitalsCache.get(state) || [];
        if (cachedHospitals.length > 0) {
          setSelectedHospital(cachedHospitals[0].id);
        }
        
        setIsLoadingHospitals(false);
        return;
      }
      
      // Fetch from API if not in cache
      const response = await fetch(`/api/hospitals?state=${encodeURIComponent(state)}`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Process the response data
        if (data.hospitals && Array.isArray(data.hospitals)) {
          // Store in cache
          hospitalsCache.set(state, data.hospitals);
          
          // Update state
          setHospitals(data.hospitals);
          
          if (data.hospitals.length > 0) {
            // Auto-select the first hospital
            setSelectedHospital(data.hospitals[0].id);
          } else {
            setError(`No hospitals found in ${state}. Try another state or contact support.`);
          }
        } else if (Array.isArray(data)) {
          // Store in cache
          hospitalsCache.set(state, data);
          
          // Update state
          setHospitals(data);
          
          if (data.length > 0) {
            // Auto-select the first hospital
            setSelectedHospital(data[0].id);
          } else {
            setError(`No hospitals found in ${state}. Try another state or contact support.`);
          }
        } else {
          setError("Received unexpected data format from the server.");
        }
      } else {
        // Handle error
        let errorText = "Failed to load hospitals. Please try again.";
        
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorText = errorData.error;
          }
        } catch (e) {
          // Couldn't parse error response
        }
        
        setError(errorText);
      }
    } catch (error) {
      setError("Network error while fetching hospitals. Check your connection and try again.");
    } finally {
      setIsLoadingHospitals(false);
    }
  }

  // Optimized handler for state change
  const handleStateChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const state = e.target.value;
    setSelectedState(state);
    setSelectedHospital("");
    
    if (state) {
      fetchHospitals(state);
    } else {
      setHospitals([]);
    }
  }, []);

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

  // Function to update progress based on current step with auto-progression
  const updateProgress = (step: string) => {
    const currentStepInfo = PROCESSING_STEPS.find(s => s.key === step);
    if (currentStepInfo) {
      setProgressStep(step);
      setUploadStatus(currentStepInfo.label);
      
      // Animate the progress smoothly to the target percentage
      // Start from current percent and animate to the target
      const startPercent = progressPercent;
      const targetPercent = currentStepInfo.percent;
      const duration = 700; // milliseconds
      const increment = 10; // update every 10ms
      const steps = duration / increment;
      const percentIncrement = (targetPercent - startPercent) / steps;
      
      let stepCount = 0;
      const intervalId = setInterval(() => {
        stepCount++;
        const newPercent = startPercent + (percentIncrement * stepCount);
        setProgressPercent(Math.min(newPercent, targetPercent));
        
        if (stepCount >= steps) {
          clearInterval(intervalId);
        }
      }, increment);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError("Please upload a report image");
      return;
    }
    
    if (!selectedHospital) {
      setError("Please select a hospital");
      return;
    }
    
    setIsUploading(true);
    setError(null);
    setUploadSuccess(false);
    setUploadResult(null);
    
    // Start with initializing
    updateProgress('initializing');
    
    try {
      // Add a small timeout to make the UI feel more responsive
      // This creates a perception that work is happening immediately
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Optimize image before uploading if it's an image file
      updateProgress('preparing');
      
      // Add slight delay before next step for better UX
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Process the file with web workers if available for better performance
      const processFile = () => {
        return new Promise<string>((resolve, reject) => {
          // Set up a worker if browser supports it
          if (typeof window !== 'undefined' && window.Worker) {
            try {
              // Use a separate thread for processing to prevent UI blocking
              updateProgress('compressing');
              
              const reader = new FileReader();
              reader.onloadend = () => {
                // File is ready as data URL
                const base64String = reader.result as string;
                const base64Data = base64String.split(",")[1]; // Remove data URL prefix
                resolve(base64Data);
              };
              reader.onerror = () => {
                reject(new Error("Failed to read the file"));
              };
              reader.readAsDataURL(file);
            } catch (err) {
              // Fallback to synchronous processing
              reject(err);
            }
          } else {
            // Fallback for browsers without worker support
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64String = reader.result as string;
              const base64Data = base64String.split(",")[1];
              resolve(base64Data);
            };
            reader.onerror = () => {
              reject(new Error("Failed to read the file"));
            };
            reader.readAsDataURL(file);
          }
        });
      };
      
      // Process the file and get base64 data
      const base64Data = await processFile();
      
      // Short delay to make the compression step visible
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Update to uploading step
      updateProgress('uploading');
      
      // Use AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      // Track upload progress
      const uploadStartTime = Date.now();
      
      // Pre-emptively update progress to validating after a short delay
      // This gives the perception of faster processing
      const validatingTimeout = setTimeout(() => {
        if (progressStep === 'uploading') {
          updateProgress('validating');
        }
      }, 1000);
      
      // Set up staged progress updates during analysis
      // These updates happen in parallel with the actual processing
      // to give users feedback while they wait
      const progressUpdateInterval = setInterval(() => {
        if (progressStep === 'validating') {
          updateProgress('analyzing');
        } else if (progressStep === 'analyzing') {
          updateProgress('extracting');
        } else if (progressStep === 'extracting') {
          updateProgress('queueing');
        } else if (progressStep === 'queueing') {
          updateProgress('finalizing');
        }
      }, 2200); // Slightly faster progress updates
      
      // Send to API with timeout handling
      try {
        const response = await fetch('/api/reports/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: base64Data,
            hospitalId: selectedHospital
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        clearTimeout(validatingTimeout);
        clearInterval(progressUpdateInterval);
        
        if (response.ok) {
          // Update to complete step
          updateProgress('complete');
          
          // Set a minimum display time for the completion animation
          // This ensures users see the "complete" state
          setTimeout(async () => {
            const result = await response.json();
            setUploadSuccess(true);
            setUploadResult(result);
            
            // Update cache by invalidating it to show latest records
            try {
              await fetch('/api/user/reports', { 
                method: 'GET',
                headers: { 'Cache-Control': 'no-cache' }
              });
            } catch (e) {
              // Silent fail, this is just for cache preloading
              console.log('Cache refresh attempted');
            }
            
            setIsUploading(false);
          }, 800);
        } else {
          const data = await response.json();
          setError(data.error || "Failed to upload report");
          setUploadStatus("");
          setProgressPercent(0);
          setIsUploading(false);
        }
      } catch (error) {
        clearInterval(progressUpdateInterval);
        clearTimeout(validatingTimeout);
        
        if (error instanceof DOMException && error.name === "AbortError") {
          setError("Request timed out. Please try again with a smaller file or check your connection.");
        } else {
          console.error("Error during API call:", error);
          setError("Connection error. Please try again.");
        }
        
        setUploadStatus("");
        setProgressPercent(0);
        setIsUploading(false);
      }
    } catch (error) {
      console.error("Error processing file:", error);
      setError(error instanceof Error ? error.message : "Failed to process file");
      setUploadStatus("");
      setProgressPercent(0);
      setIsUploading(false);
    }
  };

  // Function to format the AI analysis with line breaks
  const formatAnalysis = (analysis: string | null) => {
    if (!analysis) return null;
    
    return analysis.split('\n').map((line, index) => {
      // Handle different types of lines with appropriate styling
      if (line.trim().startsWith('Severity:')) {
        return (
          <p key={index} className="font-bold text-gray-900">
            {line}
          </p>
        );
      } else if (line.trim().startsWith('Priority Level:')) {
        return (
          <p key={index} className="text-gray-800 font-medium">
            {line}
          </p>
        );
      } else if (line.trim().startsWith('Patient Condition:') || 
                line.trim().startsWith('Recommended Actions:') ||
                line.trim().startsWith('Waiting Time Impact:') ||
                line.trim().startsWith('Specialist Recommendation:') ||
                line.trim().startsWith('Queue Information:')) {
        return (
          <p key={index} className="text-gray-800 font-medium mt-2">
            {line}
          </p>
        );
      } else if (!line.trim()) {
        // Empty line
        return <div key={index} className="h-2"></div>;
      } else {
        // Regular text
        return (
          <p key={index} className="text-gray-700">
            {line}
          </p>
        );
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Medical Report</h1>
        <p className="mt-1 text-sm text-gray-600">
          Upload your medical report to add yourself to the hospital queue
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

      {isUploading && (
        <div className="rounded-md bg-indigo-50 p-6 my-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg
                  className="h-5 w-5 animate-spin mr-3 text-indigo-500"
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
                <h3 className="text-sm font-medium text-indigo-800">{uploadStatus}</h3>
              </div>
              <span className="text-sm font-medium text-indigo-600">{Math.round(progressPercent)}%</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-out" 
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            
            <div className="grid grid-cols-5 gap-1 overflow-x-auto pb-2">
              {PROCESSING_STEPS.slice(0, 5).map((step) => (
                <div key={step.key} className="flex flex-col items-center">
                  <div 
                    className={`h-3 w-3 rounded-full mb-1 transition-all duration-300 ${
                      progressPercent >= step.percent 
                        ? 'bg-indigo-600 scale-110' 
                        : progressPercent >= step.percent - 10
                        ? 'bg-indigo-300'
                        : 'bg-gray-300'
                    }`}
                  ></div>
                  <span className={`text-xs ${
                    progressPercent >= step.percent 
                      ? 'font-medium text-indigo-700' 
                      : progressPercent >= step.percent - 10
                      ? 'font-normal text-indigo-500'
                      : 'text-gray-500'
                  } text-center transition-colors duration-300`}>
                    {step.key === 'initializing' ? 'Initialize' : 
                     step.key === 'preparing' ? 'Prepare' : 
                     step.key === 'compressing' ? 'Compress' : 
                     step.key === 'uploading' ? 'Upload' : 
                     step.key === 'validating' ? 'Validate' : ''}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-5 gap-1 overflow-x-auto">
              {PROCESSING_STEPS.slice(5).map((step) => (
                <div key={step.key} className="flex flex-col items-center">
                  <div 
                    className={`h-3 w-3 rounded-full mb-1 transition-all duration-300 ${
                      progressPercent >= step.percent 
                        ? 'bg-indigo-600 scale-110' 
                        : progressPercent >= step.percent - 10
                        ? 'bg-indigo-300'
                        : 'bg-gray-300'
                    }`}
                  ></div>
                  <span className={`text-xs ${
                    progressPercent >= step.percent 
                      ? 'font-medium text-indigo-700' 
                      : progressPercent >= step.percent - 10
                      ? 'font-normal text-indigo-500'
                      : 'text-gray-500'
                  } text-center transition-colors duration-300`}>
                    {step.key === 'analyzing' ? 'Analyze' : 
                     step.key === 'extracting' ? 'Extract' : 
                     step.key === 'queueing' ? 'Queue' : 
                     step.key === 'finalizing' ? 'Finalize' :
                     step.key === 'complete' ? 'Complete' : ''}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="mt-2">
              <p className="text-sm text-indigo-700 bg-indigo-100 p-3 rounded-md border border-indigo-200">
                {PROCESSING_TIPS[progressStep as keyof typeof PROCESSING_TIPS]}
              </p>
            </div>
          </div>
        </div>
      )}

      {!uploadSuccess && !isUploading && (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div className="sm:col-span-3">
            <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <select
              id="state"
              name="state"
              value={selectedState}
              onChange={handleStateChange}
              required
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white text-gray-700 py-2.5 px-4"
            >
              <option value="" className="text-gray-700">Select a state</option>
              {states.map((state) => (
                <option key={state.id} value={state.name} className="text-gray-700">
                  {state.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="hospital" className="block text-sm font-medium text-gray-700 mb-1">
              Hospital
            </label>
            <select
              id="hospital"
              name="hospital"
              value={selectedHospital}
              onChange={(e) => setSelectedHospital(e.target.value)}
              required
              disabled={!selectedState || isLoadingHospitals}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-white text-gray-700 py-2.5 px-4"
            >
              <option value="" className="text-gray-700">
                {isLoadingHospitals ? "Loading hospitals..." : "Select a hospital"}
              </option>
              {hospitals.map((hospital) => (
                <option key={hospital.id} value={hospital.id} className="text-gray-700">
                  {hospital.name}
                </option>
              ))}
            </select>
            {isLoadingHospitals && (
              <div className="mt-2 flex items-center text-sm text-indigo-500">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading hospitals...
              </div>
            )}
          </div>

          <div className="sm:col-span-6">
            <label className="block text-sm font-medium text-gray-700">
              Medical Report
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
                      alt="Report preview"
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
            <Link
              href="/user"
            className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Cancel
            </Link>
          <button
            type="submit"
            disabled={isUploading || !file || !selectedHospital}
            className="ml-3 inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            Upload and Process
          </button>
        </div>
      </form>
      )}
      
      {uploadSuccess && uploadResult && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-green-50">
            <div className="flex items-center">
              <svg 
                className="h-6 w-6 text-green-500 mr-3" 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path 
                  fillRule="evenodd" 
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
                  clipRule="evenodd" 
                />
              </svg>
              <h3 className="text-lg font-medium text-green-800">Upload Successful!</h3>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-green-700">
              Your medical report has been analyzed and added to the queue.
            </p>
          </div>
          
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Hospital</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2">
                  {uploadResult.hospitalName}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Queue Position</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2">
                  <span className="text-xl font-semibold">#{uploadResult.queuePosition}</span>
                </dd>
              </div>
              {uploadResult.doctor && (
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Assigned Doctor</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2">
                    <div className="flex items-center">
                      <span className="font-medium">{uploadResult.doctor.name}</span>
                      <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                        {uploadResult.doctor.specialty}
                      </span>
                    </div>
                  </dd>
                </div>
              )}
              {uploadResult.severity !== undefined && (
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Severity Rating</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                        uploadResult.severity > 7
                          ? "bg-red-100 text-red-800"
                          : uploadResult.severity > 4
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {uploadResult.severity}/10
                    </span>
                    <span className="ml-2 text-sm text-gray-500">
                      {uploadResult.severity > 7
                        ? "(High Priority)"
                        : uploadResult.severity > 4
                        ? "(Medium Priority)"
                        : "(Low Priority)"}
                    </span>
                  </dd>
                </div>
              )}
              
              {uploadResult.aiAnalysis && (
                <>
                  <div className="bg-gray-50 px-4 py-5 sm:px-6">
                    <button
                      onClick={() => setShowAnalysisDetails(!showAnalysisDetails)}
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none flex items-center"
                    >
                      {showAnalysisDetails ? (
                        <>
                          <svg className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                          </svg>
                          Hide AI Analysis Details
                        </>
                      ) : (
                        <>
                          <svg className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          Show AI Analysis Details
                        </>
                      )}
                    </button>
                  </div>
                  
                  {showAnalysisDetails && (
                    <div className="bg-white px-4 py-5 sm:px-6">
                      <div className="bg-gray-50 p-5 rounded-md border border-gray-200 shadow-sm">
                        <h4 className="text-lg font-medium text-gray-900 mb-3">Medical Analysis</h4>
                        <div className="space-y-1 text-sm">
                          {formatAnalysis(uploadResult.aiAnalysis)}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </dl>
          </div>
          
          <div className="px-4 py-5 sm:px-6 bg-gray-50 flex justify-between">
            <Link
              href={`/user/report/${uploadResult.id}`}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              View Report Details
            </Link>
            
            <Link
              href="/user"
              className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
} 