"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type QueueItem = {
  id: string;
  queuePosition: number;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
  condition?: string;
  severity?: number;
  uploatedAt: string;
};

export default function HospitalDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      if (session.user.role !== "HOSPITAL") {
        router.push("/");
        return;
      }

      fetchQueue();
    }
  }, [session, status, router]);

  async function fetchQueue() {
    setLoading(true);
    try {
      const response = await fetch("/api/hospital/queue");
      if (!response.ok) {
        throw new Error("Failed to fetch queue");
      }
      const data = await response.json();
      setQueue(data);
    } catch (error) {
      console.error("Error fetching queue:", error);
      setError("Failed to load the patient queue");
    } finally {
      setLoading(false);
    }
  }

  async function handleCompleteReceipt(receiptId: string) {
    try {
      const response = await fetch(`/api/receipts/${receiptId}/complete`, {
        method: "POST",
      });
      
      if (!response.ok) {
        throw new Error("Failed to complete receipt");
      }
      
      // Refresh the queue
      fetchQueue();
    } catch (error) {
      console.error("Error completing receipt:", error);
      setError("Failed to complete this patient's visit");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Patient Queue</h1>
        <button
          onClick={fetchQueue}
          className="rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          Refresh Queue
        </button>
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

      {queue.length === 0 ? (
        <div className="rounded-md bg-gray-50 p-8 text-center">
          <h3 className="mt-2 text-sm font-medium text-gray-900">No patients in queue</h3>
          <p className="mt-1 text-sm text-gray-500">
            The queue is currently empty.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden bg-white shadow sm:rounded-md">
          <ul role="list" className="divide-y divide-gray-200">
            {queue.map((item) => (
              <li key={item.id} className="px-0 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-lg font-semibold text-indigo-800">
                      {item.queuePosition}
                    </div>
                    <div className="ml-4 flex items-center">
                      {item.user.image ? (
                        <Image
                          className="h-10 w-10 rounded-full"
                          src={item.user.image}
                          alt=""
                          width={40}
                          height={40}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                          {item.user.name?.charAt(0) || "U"}
                        </div>
                      )}
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{item.user.name}</p>
                        <p className="text-xs text-gray-500">{item.user.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center">
                    {item.severity !== null && (
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium mr-3 ${
                          item.severity && item.severity > 7
                            ? "bg-red-100 text-red-800"
                            : item.severity && item.severity > 4
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        Severity: {item.severity}
                      </span>
                    )}
                    <button
                      onClick={() => handleCompleteReceipt(item.id)}
                      className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-3 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      Complete
                    </button>
                  </div>
                </div>
                {item.condition && (
                  <div className="mt-2 ml-14">
                    <p className="text-sm text-gray-500 line-clamp-2">
                      <span className="font-medium">Condition:</span> {item.condition}
                    </p>
                  </div>
                )}
                <div className="mt-1 ml-14">
                  <p className="text-xs text-gray-400">
                    Uploaded {new Date(item.uploatedAt).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 