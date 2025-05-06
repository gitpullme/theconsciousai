import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type PatientProfileModalProps = {
  patientId: string;
  onClose: () => void;
};

type PatientProfile = {
  id: string;
  name: string;
  email: string;
  role: string;
  state?: string;
  dateOfBirth?: Date;
  gender?: string;
  phone?: string;
  address?: string;
  image?: string | null;
};

type HistoryItem = {
  id: string;
  createdAt: string;
  type: 'REPORT' | 'APPOINTMENT';
  status: string;
  condition?: string;
  severity?: number;
  symptoms?: string;
  scheduledDate?: string;
};

export default function PatientProfileModal({
  patientId,
  onClose,
}: PatientProfileModalProps) {
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [recentHistory, setRecentHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Format date
  const formatDate = (dateString?: Date | string) => {
    if (!dateString) return "Not available";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

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

  // Get severity badge styling
  const getSeverityBadge = (severity?: number) => {
    if (!severity) return null;
    
    const bgColor = severity >= 8 ? 'bg-red-50 text-red-700 border-red-100' :
                   severity >= 6 ? 'bg-amber-50 text-amber-700 border-amber-100' :
                   severity >= 4 ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                   'bg-green-50 text-green-700 border-green-100';
                   
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${bgColor}`}>
        Severity: {severity}/10
      </span>
    );
  };

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="inline-flex items-center rounded-full bg-yellow-50 px-2.5 py-0.5 text-xs font-medium text-yellow-700 border border-yellow-100">
            Pending
          </span>
        );
      case "CONFIRMED":
        return (
          <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 border border-green-100">
            Confirmed
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 border border-blue-100">
            Completed
          </span>
        );
      default:
        return null;
    }
  };

  // Fetch patient profile
  useEffect(() => {
    if (!patientId) return;

    const fetchPatientData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch patient profile
        const response = await fetch(`/api/hospital/patients/${patientId}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch patient profile");
        }
        
        const data = await response.json();
        setPatient(data);
        
        // Fetch recent history
        try {
          const historyResponse = await fetch(`/api/hospital/patients/${patientId}/history`);
          if (historyResponse.ok) {
            const historyData = await historyResponse.json();
            // Only show max 3 most recent items
            setRecentHistory(historyData.history?.slice(0, 3) || []);
          } else {
            console.error("Error fetching history:", await historyResponse.text());
          }
        } catch (historyError) {
          console.error("Failed to fetch history:", historyError);
          // Don't fail the entire component load if history fails
        }
      } catch (error) {
        console.error("Error fetching patient profile:", error);
        setError("Failed to load patient profile");
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [patientId]);

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-slate-50 rounded-t-lg">
          <h3 className="text-lg font-semibold text-slate-800">Patient Profile</h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-500 focus:outline-none transition-colors duration-200"
            aria-label="Close"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-slate-600 border-r-transparent align-[-0.125em]"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <p className="font-medium">Unable to load profile</p>
              <p className="text-sm">{error}</p>
            </div>
          ) : patient ? (
            <div className="space-y-8">
              {/* Patient header with image */}
              <div className="flex items-center gap-5 bg-gradient-to-r from-slate-50 to-white p-6 rounded-lg border border-slate-100">
                <div className="relative">
                {patient.image ? (
                  <Image
                    src={patient.image}
                    alt={patient.name}
                    width={80}
                    height={80}
                      className="rounded-full border-2 border-white shadow-sm"
                  />
                ) : (
                    <div className="h-20 w-20 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-2xl font-semibold text-slate-700 shadow-sm">
                    {patient.name?.charAt(0) || "P"}
                  </div>
                )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{patient.name}</h2>
                  <p className="text-sm text-slate-500">{patient.email}</p>
                  
                  <div className="flex space-x-2 mt-2">
                    <button className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors duration-200">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Email
                    </button>
                    <button className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors duration-200">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      History
                    </button>
                  </div>
                </div>
              </div>

              {/* Patient details */}
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
                  <h4 className="text-sm font-medium text-slate-700">Personal Information</h4>
                </div>
                <div className="p-5">
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <div className="col-span-1">
                      <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider">Gender</dt>
                      <dd className="mt-1 text-sm text-slate-800">{patient.gender || "Not specified"}</dd>
                  </div>
                    <div className="col-span-1">
                      <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider">Age</dt>
                      <dd className="mt-1 text-sm text-slate-800">{calculateAge(patient.dateOfBirth)}</dd>
                  </div>
                    <div className="col-span-1">
                      <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider">Date of Birth</dt>
                      <dd className="mt-1 text-sm text-slate-800">{formatDate(patient.dateOfBirth)}</dd>
                  </div>
                    <div className="col-span-1">
                      <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider">State</dt>
                      <dd className="mt-1 text-sm text-slate-800">{patient.state || "Not specified"}</dd>
                  </div>
                  <div className="col-span-2">
                      <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider">Phone</dt>
                      <dd className="mt-1 text-sm text-slate-800">{patient.phone || "Not provided"}</dd>
                  </div>
                  <div className="col-span-2">
                      <dt className="text-xs font-medium text-slate-500 uppercase tracking-wider">Address</dt>
                      <dd className="mt-1 text-sm text-slate-800">{patient.address || "Not provided"}</dd>
                  </div>
                </dl>
                </div>
              </div>

              {/* Recent history */}
              {recentHistory && recentHistory.length > 0 ? (
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
                    <h4 className="text-sm font-medium text-slate-700">Recent Medical History</h4>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {recentHistory.map((item) => (
                      <div key={item.id} className="p-5">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border
                            ${item.type === 'REPORT' 
                              ? 'bg-blue-50 text-blue-700 border-blue-100' 
                              : 'bg-purple-50 text-purple-700 border-purple-100'}`}
                          >
                                {item.type === 'REPORT' ? 'Medical Report' : 'Appointment'}
                              </span>
                              {getStatusBadge(item.status)}
                          {getSeverityBadge(item.severity)}
                            </div>
                        <p className="text-sm text-slate-800 font-medium">
                              {item.type === 'REPORT' 
                                ? (item.condition || 'Medical checkup') 
                                : (item.symptoms || 'Scheduled visit')}
                            </p>
                        <div className="mt-2 flex justify-between items-end">
                          <p className="text-xs text-slate-500">{formatDate(item.createdAt)}</p>
                          {item.type === 'APPOINTMENT' && item.scheduledDate && (
                            <div className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded">
                              Scheduled: {formatDate(item.scheduledDate)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 p-6 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-slate-500">No medical history available for this patient.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 text-slate-700 px-4 py-3 rounded-lg">
              <p className="font-medium">Patient not found</p>
              <p className="text-sm">The requested patient profile could not be found.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-slate-50 rounded-b-lg">
          <div className="flex justify-end">
            <button 
              onClick={onClose}
              className="inline-flex items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors duration-200"
            >
              Close
            </button>
            {patient && (
              <button 
                onClick={() => router.push(`/hospital/patient-history/${patient.id}`)}
                className="ml-3 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-slate-700 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors duration-200"
              >
                View Full History
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 