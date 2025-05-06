"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { use } from "react";

type PatientHistoryProps = {
  params: {
    id: string;
  };
};

type HistoryItem = {
  id: string;
  createdAt: string;
  type: 'REPORT' | 'APPOINTMENT';
  status: string;
  aiAnalysis?: string;
  // Report-specific fields
  condition?: string;
  severity?: number;
  // Appointment-specific fields
  scheduledDate?: string;
  preferredDate?: string;
  symptoms?: string;
  doctor?: {
    id: string;
    name: string;
    specialty: string;
  } | null;
};

type Patient = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  dateOfBirth?: Date;
  gender?: string;
};

export default function PatientHistory({ params }: PatientHistoryProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<string | null>(null);

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth?: Date) => {
    if (!dateOfBirth) return "Unknown";
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} years`;
  };

  // Fetch patient data and history
  useEffect(() => {
    if (status === "loading") return;
    
    if (status !== "authenticated" || session?.user?.role !== "HOSPITAL") {
      router.push("/");
      return;
    }
    
    const fetchPatientData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch patient profile
        const patientResponse = await fetch(`/api/hospital/patients/${id}`);
        if (!patientResponse.ok) {
          throw new Error("Failed to fetch patient data");
        }
        const patientData = await patientResponse.json();
        setPatient(patientData);
        
        // Fetch patient history
        try {
          const historyResponse = await fetch(`/api/hospital/patients/${id}/history`);
          if (!historyResponse.ok) {
            console.error("History response not OK:", await historyResponse.text());
            throw new Error("Failed to fetch patient history");
          }
          const historyData = await historyResponse.json();
          setHistory(historyData.history || []);
        } catch (historyError) {
          console.error("Error fetching history:", historyError);
          throw new Error("Failed to fetch patient history");
        }
      } catch (error) {
        console.error("Error fetching patient data:", error);
        setError((error as Error).message || "Failed to load patient data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchPatientData();
  }, [id, status, session, router]);

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not specified";
    
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    });
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
            Pending
          </span>
        );
      case "CONFIRMED":
        return (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
            Confirmed
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
            Completed
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  // Get severity badge
  const getSeverityBadge = (severity?: number) => {
    if (!severity) return null;
    
    if (severity >= 8) {
      return (
        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
          High Severity ({severity}/10)
        </span>
      );
    } else if (severity >= 5) {
      return (
        <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800">
          Medium Severity ({severity}/10)
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
          Low Severity ({severity}/10)
        </span>
      );
    }
  };

  // Get type badge
  const getTypeBadge = (type: string) => {
    if (type === "REPORT") {
      return (
        <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
          Medical Report
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
          Appointment
        </span>
      );
    }
  };

  // Format the full AI analysis for the modal
  const formatFullAiAnalysis = (analysis: string | undefined) => {
    if (!analysis) return <p className="text-gray-500">No analysis available</p>;
    
    // Clean the analysis text if needed
    let cleanedAnalysis = analysis;
    if (analysis.startsWith("Okay, I will analyze") || analysis.startsWith("I will analyze")) {
      const firstHeadingMatch = analysis.match(/\*\*(\d+\. Initial Assessment:|\d+\. [A-Z])|^\d+\./m);
      if (firstHeadingMatch && firstHeadingMatch.index) {
        cleanedAnalysis = analysis.substring(firstHeadingMatch.index);
      }
    }
    
    // Split by lines and format with appropriate styling
    return (
      <div className="prose prose-indigo max-w-none">
        {cleanedAnalysis.split('\n').map((line, i) => {
          // Apply different styling based on line content
          if (line.match(/^\d+\.\s*[A-Z]/)) {
            // Section headers (e.g., "1. Initial Assessment:")
            return <h3 key={i} className="text-lg font-semibold text-indigo-700 mt-4">{line}</h3>;
          } else if (line.match(/^(\*\*[^*]+\*\*)/)) {
            // Bold text sections
            return <h4 key={i} className="font-semibold text-gray-900 mt-3">{line.replace(/\*\*/g, '')}</h4>;
          } else if (line.match(/^\s*\*\s+[A-Z]/)) {
            // Bullet points
            return <li key={i} className="text-gray-700 ml-4">{line.replace(/^\s*\*\s+/, '')}</li>;
          } else if (line.match(/Severity:\s*\d+\/10/) || line.match(/Priority:\s*(Low|Medium|High)/i)) {
            // Severity or priority indicators
            return <p key={i} className="font-semibold text-indigo-600">{line}</p>;
          } else if (line.trim() === '') {
            // Empty lines
            return <div key={i} className="h-2"></div>;
          } else {
            // Regular text
            return <p key={i} className="text-gray-700">{line}</p>;
          }
        })}
      </div>
    );
  };

  // Full Analysis Modal
  const FullAnalysisModal = () => {
    if (!showFullAnalysis) return null;
    
    return (
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Full AI Analysis</h3>
            <button 
              onClick={() => setShowFullAnalysis(false)}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
              aria-label="Close"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 px-6 py-4 overflow-auto">
            {formatFullAiAnalysis(selectedAnalysis)}
          </div>
          <div className="px-6 py-3 border-t border-gray-200 flex justify-end">
            <button
              onClick={() => setShowFullAnalysis(false)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-500 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
        <p className="mt-4 text-gray-500">Loading patient history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
        <p className="font-bold">Error</p>
        <p className="text-sm">{error}</p>
        <div className="mt-4">
          <Link
            href="/hospital"
            className="text-red-700 font-medium hover:text-red-600"
          >
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Patient not found</p>
        <div className="mt-4">
          <Link
            href="/hospital"
            className="text-indigo-600 font-medium hover:text-indigo-500"
          >
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Patient Medical History</h1>
        <Link
          href="/hospital"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          &larr; Back to Dashboard
        </Link>
      </div>

      {/* Patient profile header */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6 flex items-center space-x-4">
          {patient.image ? (
            <Image
              src={patient.image}
              alt={patient.name}
              width={64}
              height={64}
              className="rounded-full"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center text-xl font-semibold text-indigo-700">
              {patient.name?.charAt(0) || "P"}
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold text-gray-900">{patient.name}</h2>
            <p className="text-sm text-gray-500">{patient.email}</p>
            <div className="flex mt-1 text-sm text-gray-600">
              {patient.gender && <span className="mr-4">{patient.gender}</span>}
              {patient.dateOfBirth && <span>Age: {calculateAge(patient.dateOfBirth)}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Patient history timeline */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Medical History
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Timeline of patient's medical reports and appointments
          </p>
        </div>

        {!history || history.length === 0 ? (
          <div className="px-4 py-5 sm:px-6 text-center">
            <p className="text-gray-500">No medical history found for this patient</p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {history.map((item, index) => (
                <li key={item.id} className="px-4 py-5 sm:px-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {getTypeBadge(item.type)}
                        {getStatusBadge(item.status)}
                        {item.type === 'REPORT' && getSeverityBadge(item.severity)}
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        {item.type === 'REPORT' 
                          ? `Medical Report: ${item.condition || 'Unspecified condition'}`
                          : `Appointment: ${item.symptoms || 'No symptoms specified'}`
                        }
                      </p>
                      <div className="mt-2 space-y-1 text-sm text-gray-500">
                        <p>Date: {formatDate(item.createdAt)}</p>
                        {item.type === 'APPOINTMENT' && item.scheduledDate && (
                          <p>Scheduled for: {formatDate(item.scheduledDate)}</p>
                        )}
                        {item.doctor && (
                          <p>Doctor: {item.doctor.name} ({item.doctor.specialty})</p>
                        )}
                      </div>
                    </div>
                    {item.aiAnalysis && (
                      <button
                        onClick={() => {
                          setSelectedAnalysis(item.aiAnalysis || null);
                          setShowFullAnalysis(true);
                        }}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                      >
                        View AI Analysis
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex justify-end space-x-4">
        <Link
          href={`/hospital/appointments/new?patient=${patient.id}`}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Schedule New Appointment
        </Link>
      </div>

      {/* Full Analysis Modal */}
      <FullAnalysisModal />
    </div>
  );
} 