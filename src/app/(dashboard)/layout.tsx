"use client";

import Navbar from "@/components/ui/navbar";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import EmergencyButton from "@/components/EmergencyButton";

// Enhanced loading spinner component
const LoadingSpinner = () => (
  <div className="flex min-h-screen items-center justify-center bg-white">
    <div className="text-center">
      <div className="h-12 w-12 mx-auto animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      <p className="mt-3 text-sm text-gray-600">Loading your dashboard...</p>
    </div>
  </div>
);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const [isTransitioning, setIsTransitioning] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/login");
      return;
    }

    // Add a small delay for smoother transitions between states
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [status]);

  if (status === "loading" || isTransitioning) {
    return <LoadingSpinner />;
  }

  // Only show emergency button for regular users (not hospitals or admins)
  const showEmergencyButton = session?.user?.role === "USER";

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <Navbar />
      <main className="mx-auto max-w-7xl py-6 px-4 sm:px-6 lg:px-8">
        <div className="animate-fadeIn">
        {children}
        </div>
      </main>
      <footer className="mt-auto py-4 text-center text-xs text-gray-500">
        <p>© {new Date().getFullYear()} Medical Queue AI - Improving healthcare access</p>
      </footer>
    </div>
  );
} 