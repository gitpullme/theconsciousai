"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import React from "react";

interface Report {
  id: string;
  status: string;
  severity: number | null;
  queuePosition: number | null;
  uploatedAt: string;
  processedAt: string | null;
  aiAnalysis: string | null;
  hospital: {
    id: string;
    name: string;
    state: string;
    city?: string | null;
    address?: string | null;
  } | null;
  doctor: {
    id: string;
    name: string;
    specialty: string;
  } | null;
}

// Define the params structure
interface RouteParams {
  id: string;
}

interface PageProps {
  params: Promise<RouteParams> | RouteParams;
}

export default function ReportDetailsPage({ params }: PageProps) {
  // Always use React.use to unwrap params
  const unwrappedParams = React.use(params);
  const reportId = unwrappedParams.id;
  
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && reportId) {
      fetchReportDetails(reportId);
    }
  }, [status, router, reportId]);

  const fetchReportDetails = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/receipts/${id}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch report details");
      }
      
      const data = await response.json();
      setReport(data);
    } catch (err) {
      console.error("Error fetching report details:", err);
      setError(err instanceof Error ? err.message : "Could not load report details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <svg className="inline animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-2 text-gray-600">Loading report details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <Link
            href="/user"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            &larr; Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">Report not found or you do not have permission to view it.</p>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <Link
            href="/user"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            &larr; Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Function to format the AI analysis with line breaks and highlight specific sections
  const formatAnalysis = (analysis: string | null) => {
    if (!analysis) return null;
    
    // Create sections based on line breaks
    const sections = analysis.split('\n\n').map((section, sectionIndex) => {
      // Special formatting for doctor and queue sections
      if (section.trim().startsWith('Doctor Assigned:')) {
        const lines = section.split('\n');
        return (
          <div key={`section-${sectionIndex}`} className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
            <h4 className="font-medium text-blue-800 mb-1">Doctor Information</h4>
            {lines.map((line, i) => (
              <p key={i} className="text-blue-700">
                {line}
              </p>
            ))}
          </div>
        );
      } else if (section.trim().startsWith('Current Queue:')) {
        return (
          <div key={`section-${sectionIndex}`} className="mt-4 p-3 bg-purple-50 rounded-md border border-purple-200">
            <h4 className="font-medium text-purple-800 mb-1">Queue Information</h4>
            <p className="text-purple-700">{section}</p>
          </div>
        );
      } else {
        // Regular sections
        return (
          <div key={`section-${sectionIndex}`} className="mb-4">
            {section.split('\n').map((line, index) => {
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
                         line.trim().startsWith('Specialist Recommendation:')) {
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
            })}
          </div>
        );
      }
    });
    
    return sections;
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Medical Report Details</h1>
        <Link
          href="/user"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          &larr; Back to dashboard
        </Link>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 bg-gray-50">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Report Information
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Details about your medical report and queue status.
          </p>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Hospital</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2">
                {report.hospital?.name || "Unknown Hospital"}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Hospital Location</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2">
                {report.hospital ? (
                  <>
                    {report.hospital.address && `${report.hospital.address}, `}
                    {report.hospital.city && `${report.hospital.city}, `}
                    {report.hospital.state}
                  </>
                ) : (
                  "Unknown Location"
                )}
              </dd>
            </div>
            {report.doctor && (
              <div className="bg-blue-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 border-l-4 border-blue-400">
                <dt className="text-sm font-medium text-blue-800">Assigned Doctor</dt>
                <dd className="mt-1 text-sm text-blue-800 sm:col-span-2">
                  <div className="flex items-center">
                    <span className="text-lg font-medium">{report.doctor.name}</span>
                    <span className="ml-3 inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                      {report.doctor.specialty}
                    </span>
                  </div>
                  <p className="text-sm text-blue-600 mt-1">
                    You have been assigned to a specialist based on your condition.
                  </p>
                </dd>
              </div>
            )}
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Uploaded On</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2">
                {new Date(report.uploatedAt).toLocaleString()}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1 text-sm sm:col-span-2">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    report.status === "QUEUED"
                      ? "bg-green-100 text-green-800"
                      : report.status === "PENDING"
                      ? "bg-yellow-100 text-yellow-800"
                      : report.status === "PROCESSED"
                      ? "bg-blue-100 text-blue-800"
                      : report.status === "COMPLETED" 
                      ? "bg-purple-100 text-purple-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {report.status}
                </span>
              </dd>
            </div>
            {report.queuePosition && (
              <div className="bg-purple-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 border-l-4 border-purple-400">
                <dt className="text-sm font-medium text-purple-800">Queue Position</dt>
                <dd className="mt-1 sm:col-span-2">
                  <span className="text-2xl font-bold text-purple-800">#{report.queuePosition}</span>
                  <p className="text-sm text-purple-600 mt-1">
                    Your position in the queue is based on severity and arrival time.
                    {report.severity && report.severity > 7 && " You have been given high priority due to your condition."}
                  </p>
                </dd>
              </div>
            )}
            {report.severity !== null && (
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Severity Rating</dt>
                <dd className="mt-1 text-sm sm:col-span-2">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                      report.severity > 7
                        ? "bg-red-100 text-red-800"
                        : report.severity > 4
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {report.severity}/10
                  </span>
                  <span className="ml-2 text-xs text-gray-500">
                    {report.severity > 7
                      ? "(High Priority)"
                      : report.severity > 4
                      ? "(Medium Priority)"
                      : "(Low Priority)"}
                  </span>
                </dd>
              </div>
            )}
            {report.aiAnalysis && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">AI Analysis</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2">
                  <div className="bg-gray-50 p-4 rounded-md whitespace-pre-line border border-gray-200">
                    {formatAnalysis(report.aiAnalysis)}
                  </div>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}