"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Plus, X, ChevronLeft, Calendar, Clock12 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  time: string;
  notes: string;
}

export default function ManualSetupPage() {
  const router = useRouter();
  const [medications, setMedications] = useState<Medication[]>([]);
  const [currentMed, setCurrentMed] = useState<Medication>({
    id: "",
    name: "",
    dosage: "",
    frequency: "daily",
    time: "08:00",
    notes: ""
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddMedication = () => {
    if (!currentMed.name || !currentMed.dosage) {
      setError("Medication name and dosage are required");
      return;
    }

    setMedications([...medications, { ...currentMed, id: Date.now().toString() }]);
    setCurrentMed({
      id: "",
      name: "",
      dosage: "",
      frequency: "daily",
      time: "08:00",
      notes: ""
    });
    setIsFormOpen(false);
    setError(null);
  };

  const handleRemoveMedication = (id: string) => {
    setMedications(medications.filter(med => med.id !== id));
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentMed(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveReminders = async () => {
    if (medications.length === 0) {
      setError("Please add at least one medication");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      // Transform the data for the API
      const reminderData = medications.map(med => ({
        name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        time: med.time,
        notes: med.notes.trim() === "" ? null : med.notes,
        aiGenerated: false
      }));
      
      console.log("Sending reminder data:", JSON.stringify(reminderData));
      
      // Send to the API - first try normally
      let response = await fetch('/api/user/medicine-reminder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reminderData)
      });
      
      // If that fails, try with demo mode enabled
      if (!response.ok) {
        console.log("Regular API call failed, trying with demo mode");
        response = await fetch('/api/user/medicine-reminder?demo=true', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(reminderData)
        });
      }
      
      const responseData = await response.json();
      console.log("API response:", responseData);
      
      if (responseData.warning) {
        console.warn("API warning:", responseData.warning);
      }
      
      // Navigate back to the main medicine reminder page
      router.push("/user/medicine-reminder?success=true" + 
        (responseData.warning ? "&offline=true" : ""));
    } catch (error) {
      console.error("Error saving reminders:", error);
      setError(typeof error === 'object' && error !== null && 'message' in error
        ? (error as Error).message
        : "Failed to save reminders. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const frequencyOptions = [
    { value: "daily", label: "Once Daily" },
    { value: "twice-daily", label: "Twice Daily" },
    { value: "thrice-daily", label: "Three Times Daily" },
    { value: "weekly", label: "Once a Week" },
    { value: "biweekly", label: "Twice a Week" },
    { value: "monthly", label: "Monthly" }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="mr-2"
          onClick={() => router.push("/user/medicine-reminder")}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Manual Medicine Reminder Setup</h1>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <X className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-4">
          <h2 className="text-lg font-medium text-white">Your Medications</h2>
        </div>
        <div className="p-6">
          {medications.length === 0 && !isFormOpen ? (
            <div className="text-center py-8">
              <Clock className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No medications added</h3>
              <p className="mt-1 text-sm text-gray-500">Start by adding your first medication</p>
              <div className="mt-6">
                <Button 
                  onClick={() => setIsFormOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Medication
                </Button>
              </div>
            </div>
          ) : (
            <div>
              {medications.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Your Medication List</h3>
                  <ul className="space-y-3">
                    {medications.map((med) => (
                      <li key={med.id} className="bg-gray-50 p-4 rounded-lg flex justify-between items-center">
                        <div>
                          <div className="font-medium">{med.name}</div>
                          <div className="text-sm text-gray-500">
                            {med.dosage} • {frequencyOptions.find(opt => opt.value === med.frequency)?.label} • {med.time}
                          </div>
                          {med.notes && <div className="text-sm text-gray-500 mt-1">{med.notes}</div>}
                        </div>
                        <button
                          onClick={() => handleRemoveMedication(med.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  {!isFormOpen && (
                    <div className="mt-4">
                      <Button 
                        onClick={() => setIsFormOpen(true)}
                        className="mr-2"
                        variant="outline"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Another
                      </Button>
                      <Button 
                        onClick={handleSaveReminders}
                        disabled={isSubmitting}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        {isSubmitting ? 'Saving...' : 'Save Reminders'}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {isFormOpen && (
                <div className="bg-gray-50 p-6 rounded-lg mt-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {medications.length === 0 ? 'Add Your First Medication' : 'Add Another Medication'}
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                          Medication Name*
                        </label>
                        <input
                          type="text"
                          name="name"
                          id="name"
                          value={currentMed.name}
                          onChange={handleFormChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          placeholder="e.g., Aspirin"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="dosage" className="block text-sm font-medium text-gray-700">
                          Dosage*
                        </label>
                        <input
                          type="text"
                          name="dosage"
                          id="dosage"
                          value={currentMed.dosage}
                          onChange={handleFormChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          placeholder="e.g., 100mg"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="frequency" className="block text-sm font-medium text-gray-700">
                          Frequency
                        </label>
                        <select
                          id="frequency"
                          name="frequency"
                          value={currentMed.frequency}
                          onChange={handleFormChange}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                          {frequencyOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="time" className="block text-sm font-medium text-gray-700">
                          Time
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Clock12 className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="time"
                            name="time"
                            id="time"
                            value={currentMed.time}
                            onChange={handleFormChange}
                            className="block w-full pl-10 rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                        Notes (optional)
                      </label>
                      <textarea
                        id="notes"
                        name="notes"
                        rows={3}
                        value={currentMed.notes}
                        onChange={handleFormChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="E.g., Take with food"
                      ></textarea>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsFormOpen(false);
                          setError(null);
                        }}
                        className="mr-3"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={handleAddMedication}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        Add Medication
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 