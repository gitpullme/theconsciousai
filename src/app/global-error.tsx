'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Something went wrong!
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                We apologize for the inconvenience. Please try again.
              </p>
            </div>
            <div className="mt-8 space-y-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-red-600 font-medium mb-2">Error details:</h3>
                <p className="text-gray-700 mb-4">{error.message || "An unexpected error occurred"}</p>
                <button
                  onClick={() => reset()}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Try again
                </button>
              </div>
            </div>
            <div className="text-center mt-4">
              <a href="/" className="font-medium text-indigo-600 hover:text-indigo-500">
                ← Return to home page
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
} 