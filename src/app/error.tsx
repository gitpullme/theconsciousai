'use client';
import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void; }) {
  useEffect(() => { console.error('Page error:', error); }, [error]);
  return (
    <div className="p-8 text-center">
      <h2 className="text-xl font-bold">Something went wrong</h2>
      <p className="mt-2">{error.message}</p>
      <button onClick={reset} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">Try again</button>
    </div>
  );
}
