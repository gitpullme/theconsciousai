"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import ChatInterface from '@/components/chat/ChatInterface';
import Header from '@/components/Header';

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      setLoading(false);
    }
  }, [status, router]);

  if (loading) {
    return (
      <div className="h-screen flex flex-col">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-500 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col">
      {/* Fixed Header - will always stay at the top */}
      <div className="sticky top-0 z-50 w-full">
        <Header />
      </div>
      
      {/* Chat interface takes the remaining space */}
      <div className="flex-grow h-[calc(100vh-64px)]">
        {session?.user && (
          <ChatInterface patientId={session.user.id} fullPage={true} />
        )}
      </div>
    </div>
  );
} 