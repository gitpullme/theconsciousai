"use client";

import { signIn, useSession } from "next-auth/react";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useState, useMemo } from "react";

// Optimized debounce function to reduce unnecessary re-renders
function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Cache these values to prevent unnecessary re-computations
  const isAdmin = useMemo(() => searchParams.get("admin") === "true", [searchParams]);
  const hospitalRegistered = useMemo(() => searchParams.get("hospital") === "registered", [searchParams]);
  
  // Combined form state to minimize state updates
  const [formState, setFormState] = useState({
    isLogin: true,
    userType: isAdmin ? "admin" : "user",
    email: "",
    password: "",
    name: "",
    error: "",
    success: hospitalRegistered ? "Hospital registration successful! Please login with your credentials." : "",
    loading: false
  });

  // Handle dashboard redirect after successful login
  useEffect(() => {
    if (status === "authenticated") {
      // Redirect to appropriate dashboard based on user role
      const userRole = session.user.role || "USER";
      
      if (userRole === "ADMIN") {
        router.replace("/admin");
      } else if (userRole === "HOSPITAL") {
        router.replace("/hospital");
      } else {
        router.replace("/user");
      }
    }
  }, [session, status, router]);

  // Optimized input change handler to minimize state updates
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  }, []);

  // Toggle login/register view
  const toggleLoginMode = useCallback(() => {
    setFormState(prev => ({ 
      ...prev, 
      isLogin: !prev.isLogin,
      error: '', 
      success: ''
    }));
  }, []);

  // Set user type (patient or admin)
  const setUserType = useCallback((type: 'user' | 'admin') => {
    setFormState(prev => ({ ...prev, userType: type, error: '' }));
  }, []);

  // Handle form submission with optimized logic
  const handleCredentialsAuth = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const { isLogin, email, password, name, userType } = formState;
    
    // Update loading state
    setFormState(prev => ({ ...prev, loading: true, error: '', success: '' }));

    try {
    if (isLogin) {
      // Handle login
        const result = await signIn("credentials", {
          redirect: false,
          email,
          password,
          role: userType === "admin" ? "HOSPITAL" : "USER",
        });

        if (result?.error) {
          setFormState(prev => ({ 
            ...prev, 
            error: "Invalid email or password", 
            loading: false 
          }));
        }
        // Successful login is handled by the useEffect that watches session state
    } else {
      // Handle registration (only for regular users)
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          setFormState(prev => ({ 
            ...prev, 
            error: data.message || "Registration failed", 
            loading: false 
          }));
          return;
        }

        // Auto login after registration
        const result = await signIn("credentials", {
          redirect: false,
          email,
          password,
        });

        if (result?.error) {
          setFormState(prev => ({ 
            ...prev, 
            error: "Registration successful but login failed. Please try logging in manually.", 
            loading: false 
          }));
        }
        }
      } catch (error) {
      console.error("Auth error:", error);
      setFormState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : "Authentication failed", 
        loading: false 
      }));
      }
  }, [formState]);

  // Only show non-login content conditionally to reduce initial render time
  const { 
    isLogin, userType, email, password, name, 
    error, success, loading 
  } = formState;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-xl shadow-md">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            Medical Queue AI
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isLogin ? "Sign in to your account" : "Create a new account"}
          </p>
        </div>
        
        {/* User Type Tabs - Only rendered when needed */}
        {isLogin && (
          <div className="flex rounded-md shadow-sm mb-6">
            <button
              type="button"
              onClick={() => setUserType("user")}
              className={`w-1/2 py-2 px-4 text-sm font-medium 
                ${userType === "user" 
                  ? "bg-indigo-600 text-white" 
                  : "bg-white text-gray-700 hover:bg-gray-50"}
                  border border-indigo-600 rounded-l-md focus:outline-none`}
            >
              Patient / User
            </button>
            <button
              type="button"
              onClick={() => setUserType("admin")}
              className={`w-1/2 py-2 px-4 text-sm font-medium 
                ${userType === "admin" 
                  ? "bg-indigo-600 text-white" 
                  : "bg-white text-gray-700 hover:bg-gray-50"}
                  border border-indigo-600 rounded-r-md focus:outline-none`}
            >
              Hospital Admin
            </button>
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        
        {/* Success message */}
        {success && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
                <p className="text-sm text-green-700">{success}</p>
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleCredentialsAuth}>
          {!isLogin && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                onChange={handleInputChange}
                  className="block w-full rounded-md border border-gray-300 px-4 py-2.5 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 bg-white text-gray-700"
                />
            </div>
          )}
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email address
            </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
              onChange={handleInputChange}
                className="block w-full rounded-md border border-gray-300 px-4 py-2.5 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 bg-white text-gray-700"
              />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                required
                value={password}
              onChange={handleInputChange}
                className="block w-full rounded-md border border-gray-300 px-4 py-2.5 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 bg-white text-gray-700"
              />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-75"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : isLogin ? `Sign in as ${userType === "admin" ? "Hospital Admin" : "Patient"}` : "Register"}
            </button>
          </div>
        </form>
        
        {/* Only show registration toggle for regular users, not for hospital admins */}
        {(userType !== "admin" || !isLogin) && (
          <div className="text-sm text-center mt-4">
            <button 
              type="button" 
              onClick={toggleLoginMode} 
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              {isLogin ? "Need an account? Register" : "Already have an account? Sign in"}
            </button>
          </div>
        )}
        
        {/* Only show Google sign-in for regular users, not for hospital admins */}
        {userType !== "admin" && (
          <>
            <div className="relative mt-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">Or continue with</span>
              </div>
            </div>
            
            <div className="mt-6">
              <button
                type="button"
                onClick={() => signIn("google", { callbackUrl: "/user" })}
                className="group relative flex w-full justify-center rounded-md border border-transparent bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 shadow-sm"
              >
                <span className="flex items-center">
                  <Image
                    src="/google.svg"
                    alt="Google Logo"
                    width={18}
                    height={18}
                    className="mr-2"
                  />
                  Google
                </span>
              </button>
            </div>
          </>
        )}
        
        {/* Only show hospital registration link on the login page for admin tab */}
        {userType === "admin" && isLogin && (
          <div className="text-sm text-center mt-6">
            <Link
              href="/admin/register" 
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Register as a Hospital Administrator
            </Link>
          </div>
        )}
      </div>
    </div>
  );
} 