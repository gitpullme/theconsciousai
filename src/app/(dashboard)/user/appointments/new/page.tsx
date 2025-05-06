"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import AppointmentForm from "@/components/appointment/AppointmentForm";

export default function NewAppointment() {
  const router = useRouter();

  const handleSuccess = () => {
    // Form component handles success and redirects to appointments page
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Schedule an Appointment</h1>
          <Link
            href="/user/appointments"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            &larr; Back to Appointments
          </Link>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Fill out the form below to schedule an appointment with a doctor. We'll analyze your symptoms and find the best care for you.
        </p>
      </div>

      <AppointmentForm onSuccess={handleSuccess} />
    </div>
  );
} 