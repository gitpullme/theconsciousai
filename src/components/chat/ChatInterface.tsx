"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { History, Plus, X, Trash2, Send, Menu, MessageSquare, User, Bot, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatHistory {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: string;
}

interface ChatInterfaceProps {
  patientId?: string;
  fullPage?: boolean;
}

// For display in the UI - how many messages to show at once
const MAX_DISPLAY_MESSAGES = 30;
const MAX_SAVED_CONVERSATIONS = 10;

// Helper function for text typing animation
const TypeAnimation = ({ text }: { text: string }) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prevIndex => prevIndex + 1);
      }, 10); // Speed of typing

      return () => clearTimeout(timeout);
    } else {
      setIsDone(true);
    }
  }, [currentIndex, text]);

  return (
    <>
      {displayText}
      {!isDone && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
          className="inline-block w-1.5 h-4 bg-indigo-500 ml-0.5"
        />
      )}
    </>
  );
};

export default function ChatInterface({ patientId = "user123", fullPage = false }: ChatInterfaceProps) {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [displayMessages, setDisplayMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(fullPage);
  const [savedConversations, setSavedConversations] = useState<ChatHistory[]>([]);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [chatTitle, setChatTitle] = useState<string>("New Chat");

  // Fetch latest user profile data
  const fetchUserProfile = useCallback(async () => {
    if (!session?.user?.id) return;
    
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const userData = await response.json();
        setUserProfile(userData);
        console.log("Updated user profile loaded:", userData);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  }, [session?.user?.id]);

  // Load user profile when session changes or when chatbot opens
  useEffect(() => {
    if (session?.user?.id) {
      fetchUserProfile();
    }
  }, [fetchUserProfile, session?.user?.id]);

  // Load chat history and saved conversations from localStorage
  useEffect(() => {
    // Use session user ID if available, otherwise use the prop
    const userId = session?.user?.id || patientId;
    
    // Load current chat
    const savedChats = localStorage.getItem(`chat_history_${userId}`);
    if (savedChats) {
      try {
        const parsedChats = JSON.parse(savedChats);
        setMessages(parsedChats);
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    } else {
      // Initialize with welcome message if no history exists
      setMessages([
        {
          role: 'assistant',
          content: "Hello! I'm your AI medical assistant. I can help answer your questions about health conditions. How can I assist you today?",
          timestamp: new Date().toISOString()
        }
      ]);
    }

    // Load saved conversations
    const savedConvs = localStorage.getItem(`saved_conversations_${userId}`);
    if (savedConvs) {
      try {
        const parsedConvs = JSON.parse(savedConvs);
        setSavedConversations(parsedConvs);
      } catch (error) {
        console.error('Error loading saved conversations:', error);
      }
    }
  }, [patientId, session?.user?.id]);

  // Update display messages whenever full message list changes
  useEffect(() => {
    if (showFullHistory) {
      setDisplayMessages(messages);
    } else {
      setDisplayMessages(messages.slice(-MAX_DISPLAY_MESSAGES));
    }
  }, [messages, showFullHistory]);

  // Save chat history and conversations to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      // Use session user ID if available, otherwise use the prop
      const userId = session?.user?.id || patientId;
      localStorage.setItem(`chat_history_${userId}`, JSON.stringify(messages));
    }
  }, [messages, patientId, session?.user?.id]);

  useEffect(() => {
    if (savedConversations.length > 0) {
      // Use session user ID if available, otherwise use the prop
      const userId = session?.user?.id || patientId;
      localStorage.setItem(`saved_conversations_${userId}`, JSON.stringify(savedConversations));
    }
  }, [savedConversations, patientId, session?.user?.id]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [displayMessages, isLoading]);

  const generateChatTitle = async (firstMessage: string) => {
    try {
      setIsGeneratingTitle(true);
      const response = await axios.post('/api/chat', {
        message: `Generate a short, descriptive title (max 5 words) for this medical conversation. 
        The title should be concise, clear, and medical-focused. 
        Do not include any quotes, periods, or special characters. 
        Just return the title text. 
        Here's the conversation: "${firstMessage}"`,
        patientId: patientId,
        history: []
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      // Clean up the response to get a clean title
      const title = response.data.response
        .replace(/["']/g, '') // Remove quotes
        .replace(/\.$/, '')   // Remove trailing period
        .replace(/^[^a-zA-Z0-9]+/, '') // Remove leading non-alphanumeric
        .replace(/[^a-zA-Z0-9\s]+$/, '') // Remove trailing non-alphanumeric
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim()
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

      // Ensure the title is not too long
      const words = title.split(' ');
      if (words.length > 5) {
        return words.slice(0, 5).join(' ');
      }

      // Update current chat title
      setChatTitle(title);
      return title;
    } catch (error) {
      console.error('Error generating title:', error);
      // Fallback: Use the first meaningful words from the message
      const fallbackTitle = firstMessage
        .split(' ')
        .filter(word => word.length > 3) // Filter out short words
        .slice(0, 5)
        .join(' ');
      return fallbackTitle || 'New Conversation';
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Use session user ID if available, otherwise use the prop
    const userId = session?.user?.id || patientId;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add to messages
    const newUserMessage: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, newUserMessage]);

    // Refresh user profile before sending the message to ensure we have the latest data
    if (session?.user?.id) {
      await fetchUserProfile();
    }

    try {
      console.log('Sending message:', userMessage);

      const response = await axios.post('/api/chat', {
        message: userMessage,
        patientId: userId,
        history: messages, // Send full history to API
        userProfile: userProfile // Send the user profile data for personalization
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      const newAssistantMessage: Message = {
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date().toISOString()
      };

      // Add to full history
      setMessages(prev => [...prev, newAssistantMessage]);

      // If this is the first user message, generate a title and save conversation
      if (messages.length === 1) { // Only welcome message exists
        const title = await generateChatTitle(userMessage);
        const newConversation: ChatHistory = {
          id: Date.now().toString(),
          title: title,
          messages: [...messages, newUserMessage, newAssistantMessage],
          lastUpdated: new Date().toISOString()
        };

        setSavedConversations(prev => {
          const updated = [newConversation, ...prev].slice(0, MAX_SAVED_CONVERSATIONS);
          return updated;
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      let errorMessage = "I'm sorry, I encountered an error. Please try again later.";
      
      if (axios.isAxiosError(error)) {
        console.error("API error details:", error.response?.data);
        if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        }
      }
      
      const errorAssistantMessage: Message = {
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date().toISOString()
      };

      // Add to full history
      setMessages(prev => [...prev, errorAssistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveCurrentConversation = async () => {
    if (messages.length <= 1) return; // Don't save if only welcome message exists

    // Get the current user ID
    const userId = session?.user?.id || patientId;

    // Find the first user message to generate a title
    const firstUserMessage = messages.find(m => m.role === 'user')?.content || 'New Conversation';
    const title = await generateChatTitle(firstUserMessage);
    
    // Update the current chat title
    setChatTitle(title);

    const newConversation: ChatHistory = {
      id: Date.now().toString(),
      title: title,
      messages: [...messages], // Save all messages
      lastUpdated: new Date().toISOString()
    };

    setSavedConversations(prev => {
      const updated = [newConversation, ...prev].slice(0, MAX_SAVED_CONVERSATIONS);
      return updated;
    });
  };

  const startNewChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: "Hello! I'm your AI medical assistant. I can help answer your questions about health conditions. How can I assist you today?",
        timestamp: new Date().toISOString()
      }
    ]);
    setShowFullHistory(false);
  };

  const loadConversation = (conversation: ChatHistory) => {
    setMessages(conversation.messages);
    setShowFullHistory(false);
    
    // Update the chat title
    setChatTitle(conversation.title);
    
    // For mobile, hide sidebar after loading conversation
    if (!fullPage) {
      setShowHistory(false);
    }
  };

  const deleteConversation = (id: string) => {
    setSavedConversations(prev => prev.filter(conv => conv.id !== id));
  };

  const clearHistory = () => {
    // Get the current user ID
    const userId = session?.user?.id || patientId;
    
    setSavedConversations([]);
    localStorage.removeItem(`saved_conversations_${userId}`);
    startNewChat();
  };

  const toggleFullHistory = () => {
    setShowFullHistory(!showFullHistory);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Sidebar with slide-in animation */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={fullPage ? { opacity: 0 } : { x: -280 }}
            animate={fullPage ? { opacity: 1 } : { x: 0 }}
            exit={fullPage ? { opacity: 0 } : { x: -280 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={`${fullPage ? 'w-72 lg:w-80 border-r' : 'w-64'} bg-white border-gray-200 h-full overflow-hidden flex flex-col z-20`}
          >
            <div className="p-4 border-b border-gray-100 flex-shrink-0">
              <button
                onClick={startNewChat}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>New Conversation</span>
              </button>
            </div>
            <div className="px-4 py-3 flex justify-between items-center border-b border-gray-100 flex-shrink-0">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">My Conversations</h2>
              {savedConversations.length > 0 && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={clearHistory}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  title="Clear all conversations"
                >
                  <Trash2 className="h-4 w-4" />
                </motion.button>
              )}
            </div>
            <div className="overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
              <AnimatePresence>
                {savedConversations.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center p-6 h-40 text-center"
                  >
                    <MessageSquare className="h-10 w-10 text-gray-300 mb-3" />
                    <p className="text-gray-500 mb-1">No saved conversations yet</p>
                    <p className="text-xs text-gray-400">Your conversations will appear here</p>
                  </motion.div>
                ) : (
                  <div className="space-y-1 p-2">
                    {savedConversations.map(conversation => (
                      <motion.div
                        key={conversation.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        whileHover={{ backgroundColor: 'rgba(243, 244, 246, 1)' }}
                        className="group flex items-center justify-between p-3 rounded-md cursor-pointer overflow-hidden"
                      >
                        <div 
                          className="flex-1 min-w-0"
                          onClick={() => loadConversation(conversation)}
                        >
                          <h3 className="text-sm font-medium text-gray-900 truncate">{conversation.title}</h3>
                          <p className="text-xs text-gray-500">{formatDate(conversation.lastUpdated)}</p>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => deleteConversation(conversation.id)}
                          className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </motion.button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main chat area - now blends with the page */}
      <div className="flex-1 flex flex-col h-full w-full overflow-hidden bg-gray-50">
        {/* Mobile sidebar toggle */}
        {!fullPage && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="absolute top-4 left-4 z-30 p-2 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-full transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        
        {/* Toggle sidebar button for desktop - positioned differently for fullPage mode */}
        {fullPage && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="absolute top-4 left-0 z-30 p-2 text-indigo-600 hover:text-indigo-800 bg-white shadow-md rounded-r-md"
          >
            {showHistory ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          </button>
        )}

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-3 bg-white border-b border-gray-100 flex-shrink-0 h-14 shadow-sm sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <MessageSquare className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base font-semibold text-gray-900 truncate max-w-xs">{chatTitle}</h2>
            {messages.length > MAX_DISPLAY_MESSAGES && (
              <div className="flex space-x-1">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleFullHistory}
                  className="text-xs px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 rounded-md text-indigo-600 transition-colors"
                >
                  {!showFullHistory ? "Show All" : "Show Recent"}
                </motion.button>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={saveCurrentConversation}
              className="p-2 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-full transition-colors"
              title="Save current conversation"
            >
              <History className="h-5 w-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={startNewChat}
              className="flex items-center space-x-1 text-sm px-3 py-1.5 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>New</span>
            </motion.button>
          </div>
        </div>

        {/* Messages container */}
        <div className="flex-grow overflow-y-auto py-6 px-6 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          <AnimatePresence mode="wait">
            {displayMessages.map((message, index) => (
              <motion.div 
                key={`${message.timestamp}-${index}`}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ 
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  delay: index * 0.05
                }}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                } group`}
              >
                {/* Avatar for assistant */}
                {message.role === 'assistant' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 flex items-center justify-center mr-2 shadow-sm"
                  >
                    <Bot className="h-4 w-4 text-white" />
                  </motion.div>
                )}
                
                <div 
                  className={`max-w-3xl rounded-xl px-4 py-3 shadow-sm ${
                    message.role === 'user' 
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-none' 
                      : 'bg-white text-gray-900 border border-gray-100 rounded-tl-none'
                  }`}
                >
                  <div className="text-sm leading-relaxed">
                    {message.role === 'assistant' && messages.length - 5 <= index ? (
                      <TypeAnimation text={message.content} />
                    ) : (
                      message.content
                    )}
                  </div>
                  <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-indigo-200' : 'text-gray-500'} flex items-center`}>
                    {formatTimestamp(message.timestamp)}
                    {message.role === 'assistant' && (
                      <span className="ml-2 text-xs text-blue-500 flex items-center">
                        <svg className="h-3 w-3 mr-1" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-3.5l6-4.5-6-4.5v9z" />
                        </svg>
                        Gemini
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Avatar for user */}
                {message.role === 'user' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center ml-2"
                  >
                    <User className="h-4 w-4 text-white" />
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          
          {/* Improved loading animation */}
          <AnimatePresence>
            {isLoading && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex justify-start"
              >
                <motion.div 
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 flex items-center justify-center mr-2 shadow-sm"
                >
                  <Bot className="h-4 w-4 text-white" />
                </motion.div>
                
                <div className="max-w-md rounded-xl px-5 py-4 bg-white text-gray-900 border border-gray-100 shadow-sm rounded-tl-none">
                  <div className="flex space-x-2">
                    {[0, 1, 2].map((i) => (
                      <motion.div 
                        key={i}
                        initial={{ scale: 0.8 }}
                        animate={{ scale: [0.8, 1.2, 0.8] }}
                        transition={{ 
                          duration: 1.5, 
                          repeat: Infinity, 
                          delay: i * 0.2 
                        }}
                        className="w-2.5 h-2.5 bg-indigo-400 rounded-full"
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input form */}
        <div className="px-6 py-4 bg-white border-t border-gray-100 flex-shrink-0 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] sticky bottom-0 z-10">
          <motion.form 
            onSubmit={handleSubmit}
            className="max-w-5xl mx-auto"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 500, damping: 30 }}
          >
            <div className="flex items-center h-12 space-x-3 bg-gray-50 rounded-lg px-4 py-2 shadow-md border border-gray-100 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent focus-within:shadow-lg transition-all duration-200">
              <div className="text-gray-400 flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                </svg>
              </div>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your medical question..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-gray-700 placeholder-gray-400 text-base"
                disabled={isLoading}
              />
              <motion.button
                type="submit"
                disabled={isLoading || !input.trim()}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex-shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg ${
                  !isLoading && input.trim() 
                    ? 'bg-gradient-to-r from-indigo-600 to-blue-500 text-white shadow-md hover:shadow-lg' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                } transition-all duration-200`}
              >
                <Send className="h-5 w-5" />
              </motion.button>
            </div>
          </motion.form>
        </div>
      </div>
    </div>
  );
} 