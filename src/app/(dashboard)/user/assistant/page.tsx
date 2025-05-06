"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, Brain, BookOpen, Shield } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamically import the AIChatbot component to avoid hydration issues
const AIChatbot = dynamic(() => import("@/components/chat/AIChatbot"), {
  ssr: false,
});

export default function AssistantPage() {
  const { data: session, status } = useSession();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link
                href="/user"
                className="flex items-center text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Dashboard
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                {session?.user?.name || "Guest User"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">About Your AI Assistant</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <Brain className="h-5 w-5 text-indigo-500 mt-1 mr-3" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Smart Analysis</h3>
                    <p className="text-sm text-gray-500">Analyzes medical information to provide personalized insights</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <BookOpen className="h-5 w-5 text-indigo-500 mt-1 mr-3" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Medical Knowledge</h3>
                    <p className="text-sm text-gray-500">Access to comprehensive medical information and resources</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Shield className="h-5 w-5 text-indigo-500 mt-1 mr-3" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">Privacy Focused</h3>
                    <p className="text-sm text-gray-500">Your data is secure and confidential</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h1 className="text-2xl font-bold text-gray-900">AI Medical Assistant</h1>
                <p className="mt-1 text-gray-600">
                  Ask questions about medical conditions, get insights, and receive health information.
                </p>
              </div>
              
              <div className="p-6">
                <AIChatbot
                  isOpen={true}
                  onClose={() => window.history.back()}
                  patientId="demo-user"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 