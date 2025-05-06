"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import EmergencyButton from "../EmergencyButton";
import { MessageSquareText, Clock, Home, Upload, Calendar, Clock3, Grid3X3, Settings, Bell, Users, Database, LogOut, User } from "lucide-react";

export default function Navbar() {
  const { data: session } = useSession();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const [activePath, setActivePath] = useState("");

  // Update active path whenever pathname changes
  useEffect(() => {
    if (pathname) {
      setActivePath(pathname);
    }
  }, [pathname]);

  // Handle scrolling effect
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [scrolled]);

  if (!session?.user) {
    return null;
  }

  const { role } = session.user;
  
  // Helper to check if a path is active
  const isActive = (path) => {
    return activePath === path || activePath.startsWith(path);
  };
  
  return (
    <nav className={`sticky top-0 z-50 bg-white ${scrolled ? 'shadow-md' : 'shadow'} transition-shadow duration-300`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex flex-shrink-0 items-center">
              <Link href="/" className="font-bold text-xl">
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Medical Queue AI
                </span>
              </Link>
            </div>
            <div className="hidden sm:ml-8 sm:flex sm:items-center">
              {role === "USER" && (
                <div className="flex space-x-1">
                  <Link 
                    href="/user" 
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 
                      ${isActive('/user') && !isActive('/user/upload') && !isActive('/user/appointments') && !isActive('/user/medicine-reminder')
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                  >
                    <Home className={`h-4 w-4 mr-1.5 ${isActive('/user') ? 'text-blue-500' : 'text-gray-500'}`} />
                    Dashboard
                  </Link>
                  <Link 
                    href="/user/upload" 
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200
                      ${isActive('/user/upload') 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                  >
                    <Upload className={`h-4 w-4 mr-1.5 ${isActive('/user/upload') ? 'text-blue-500' : 'text-gray-500'}`} />
                    Upload Report
                  </Link>
                  <Link 
                    href="/user/appointments" 
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200
                      ${isActive('/user/appointments') 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                  >
                    <Calendar className={`h-4 w-4 mr-1.5 ${isActive('/user/appointments') ? 'text-blue-500' : 'text-gray-500'}`} />
                    Appointments
                  </Link>
                  <Link 
                    href="/user/medicine-reminder" 
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200
                      ${isActive('/user/medicine-reminder') 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                  >
                    <Clock3 className={`h-4 w-4 mr-1.5 ${isActive('/user/medicine-reminder') ? 'text-blue-500' : 'text-gray-500'}`} />
                    Medicine Reminder
                  </Link>
                </div>
              )}
              
              {role === "HOSPITAL" && (
                <div className="flex space-x-1">
                  <Link 
                    href="/hospital" 
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200
                      ${isActive('/hospital') && !isActive('/hospital/appointments') && !isActive('/hospital/emergency-alerts') && !isActive('/hospital/settings')
                        ? 'bg-indigo-50 text-indigo-700' 
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                  >
                    <Grid3X3 className={`h-4 w-4 mr-1.5 ${isActive('/hospital') && !isActive('/hospital/appointments') ? 'text-indigo-500' : 'text-gray-500'}`} />
                    Queue Dashboard
                  </Link>
                  <Link 
                    href="/hospital/appointments" 
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200
                      ${isActive('/hospital/appointments') 
                        ? 'bg-indigo-50 text-indigo-700' 
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                  >
                    <Calendar className={`h-4 w-4 mr-1.5 ${isActive('/hospital/appointments') ? 'text-indigo-500' : 'text-gray-500'}`} />
                    Appointments
                  </Link>
                  <Link 
                    href="/hospital/emergency-alerts" 
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200
                      ${isActive('/hospital/emergency-alerts') 
                        ? 'bg-indigo-50 text-indigo-700' 
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                  >
                    <Bell className={`h-4 w-4 mr-1.5 ${isActive('/hospital/emergency-alerts') ? 'text-indigo-500' : 'text-gray-500'}`} />
                    Emergency Alerts
                  </Link>
                  <Link 
                    href="/hospital/settings" 
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200
                      ${isActive('/hospital/settings') 
                        ? 'bg-indigo-50 text-indigo-700' 
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                  >
                    <Settings className={`h-4 w-4 mr-1.5 ${isActive('/hospital/settings') ? 'text-indigo-500' : 'text-gray-500'}`} />
                    Settings
                  </Link>
                </div>
              )}
              
              {role === "ADMIN" && (
                <div className="flex space-x-1">
                  <Link 
                    href="/admin" 
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200
                      ${isActive('/admin') && !isActive('/admin/hospitals') && !isActive('/admin/users') && !isActive('/admin/debug')
                        ? 'bg-purple-50 text-purple-700' 
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                  >
                    <Grid3X3 className={`h-4 w-4 mr-1.5 ${isActive('/admin') && !isActive('/admin/hospitals') ? 'text-purple-500' : 'text-gray-500'}`} />
                    Dashboard
                  </Link>
                  <Link 
                    href="/admin/hospitals" 
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200
                      ${isActive('/admin/hospitals') 
                        ? 'bg-purple-50 text-purple-700' 
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                  >
                    <Users className={`h-4 w-4 mr-1.5 ${isActive('/admin/hospitals') ? 'text-purple-500' : 'text-gray-500'}`} />
                    Manage Hospitals
                  </Link>
                  <Link 
                    href="/admin/users" 
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200
                      ${isActive('/admin/users') 
                        ? 'bg-purple-50 text-purple-700' 
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                  >
                    <User className={`h-4 w-4 mr-1.5 ${isActive('/admin/users') ? 'text-purple-500' : 'text-gray-500'}`} />
                    Manage Users
                  </Link>
                  <Link 
                    href="/admin/debug" 
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200
                      ${isActive('/admin/debug') 
                        ? 'bg-purple-50 text-purple-700' 
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                  >
                    <Database className={`h-4 w-4 mr-1.5 ${isActive('/admin/debug') ? 'text-purple-500' : 'text-gray-500'}`} />
                    Debug Tools
                  </Link>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {role === "USER" && (
              <>
              <div className="hidden sm:block">
                <EmergencyButton />
              </div>
                <Link 
                  href="/chat" 
                  className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors duration-200"
                >
                  <MessageSquareText className="h-5 w-5 mr-1.5" />
                  <span className="hidden md:inline">AI Assistant</span>
                </Link>
              </>
            )}
            <div className="relative ml-3">
              <div>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  type="button"
                  className="flex rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-transform duration-200 hover:scale-105"
                  id="user-menu-button"
                  aria-expanded={isDropdownOpen}
                  aria-haspopup="true"
                >
                  <span className="sr-only">Open user menu</span>
                  {session.user.image ? (
                    <div className="h-8 w-8 rounded-full ring-2 ring-indigo-100 overflow-hidden">
                    <Image
                        className="h-full w-full object-cover"
                      src={session.user.image}
                      alt=""
                      width={32}
                      height={32}
                    />
                    </div>
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-600 to-blue-500 text-white flex items-center justify-center ring-2 ring-indigo-100">
                      {session.user.name?.[0] || "U"}
                    </div>
                  )}
                </button>
              </div>

              {isDropdownOpen && (
                <div
                  className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none transition-all duration-200 ease-out transform"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="user-menu-button"
                  tabIndex={-1}
                >
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">
                    {session.user.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-1">
                    {session.user.email}
                    </p>
                  </div>
                  <Link
                    href="/profile"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    role="menuitem"
                    tabIndex={-1}
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <User className="h-4 w-4 mr-2 text-gray-500" />
                    Your Profile
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    role="menuitem"
                    tabIndex={-1}
                  >
                    <LogOut className="h-4 w-4 mr-2 text-gray-500" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile menu - simplified for smaller screens */}
      <div className="sm:hidden border-t border-gray-200 pt-2 pb-3 px-4">
        {role === "USER" && (
          <div className="grid grid-cols-4 gap-1">
            <Link 
              href="/user" 
              className={`flex flex-col items-center px-2 py-2 rounded-md text-xs font-medium transition-colors duration-200 
                ${isActive('/user') && !isActive('/user/upload') && !isActive('/user/appointments') && !isActive('/user/medicine-reminder')
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              <Home className={`h-5 w-5 mb-1 ${isActive('/user') ? 'text-blue-500' : 'text-gray-500'}`} />
              Home
            </Link>
            <Link 
              href="/user/upload" 
              className={`flex flex-col items-center px-2 py-2 rounded-md text-xs font-medium transition-colors duration-200 
                ${isActive('/user/upload')
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              <Upload className={`h-5 w-5 mb-1 ${isActive('/user/upload') ? 'text-blue-500' : 'text-gray-500'}`} />
              Upload
            </Link>
            <Link 
              href="/user/appointments" 
              className={`flex flex-col items-center px-2 py-2 rounded-md text-xs font-medium transition-colors duration-200 
                ${isActive('/user/appointments')
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              <Calendar className={`h-5 w-5 mb-1 ${isActive('/user/appointments') ? 'text-blue-500' : 'text-gray-500'}`} />
              Appts
            </Link>
            <Link 
              href="/user/medicine-reminder" 
              className={`flex flex-col items-center px-2 py-2 rounded-md text-xs font-medium transition-colors duration-200 
                ${isActive('/user/medicine-reminder')
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              <Clock3 className={`h-5 w-5 mb-1 ${isActive('/user/medicine-reminder') ? 'text-blue-500' : 'text-gray-500'}`} />
              Meds
            </Link>
          </div>
        )}
        
        {role === "HOSPITAL" && (
          <div className="grid grid-cols-4 gap-1">
            <Link 
              href="/hospital" 
              className={`flex flex-col items-center px-2 py-2 rounded-md text-xs font-medium transition-colors duration-200 
                ${isActive('/hospital') && !isActive('/hospital/appointments') && !isActive('/hospital/emergency-alerts') && !isActive('/hospital/settings')
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              <Grid3X3 className={`h-5 w-5 mb-1 ${isActive('/hospital') && !isActive('/hospital/appointments') ? 'text-indigo-500' : 'text-gray-500'}`} />
              Queue
            </Link>
            <Link 
              href="/hospital/appointments" 
              className={`flex flex-col items-center px-2 py-2 rounded-md text-xs font-medium transition-colors duration-200 
                ${isActive('/hospital/appointments')
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              <Calendar className={`h-5 w-5 mb-1 ${isActive('/hospital/appointments') ? 'text-indigo-500' : 'text-gray-500'}`} />
              Appts
            </Link>
            <Link 
              href="/hospital/emergency-alerts" 
              className={`flex flex-col items-center px-2 py-2 rounded-md text-xs font-medium transition-colors duration-200 
                ${isActive('/hospital/emergency-alerts')
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              <Bell className={`h-5 w-5 mb-1 ${isActive('/hospital/emergency-alerts') ? 'text-indigo-500' : 'text-gray-500'}`} />
              Alerts
            </Link>
            <Link 
              href="/hospital/settings" 
              className={`flex flex-col items-center px-2 py-2 rounded-md text-xs font-medium transition-colors duration-200 
                ${isActive('/hospital/settings')
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              <Settings className={`h-5 w-5 mb-1 ${isActive('/hospital/settings') ? 'text-indigo-500' : 'text-gray-500'}`} />
              Settings
            </Link>
          </div>
        )}
        
        {role === "ADMIN" && (
          <div className="grid grid-cols-4 gap-1">
            <Link 
              href="/admin" 
              className={`flex flex-col items-center px-2 py-2 rounded-md text-xs font-medium transition-colors duration-200 
                ${isActive('/admin') && !isActive('/admin/hospitals') && !isActive('/admin/users') && !isActive('/admin/debug')
                  ? 'bg-purple-50 text-purple-700' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              <Grid3X3 className={`h-5 w-5 mb-1 ${isActive('/admin') && !isActive('/admin/hospitals') ? 'text-purple-500' : 'text-gray-500'}`} />
              Dashboard
            </Link>
            <Link 
              href="/admin/hospitals" 
              className={`flex flex-col items-center px-2 py-2 rounded-md text-xs font-medium transition-colors duration-200 
                ${isActive('/admin/hospitals')
                  ? 'bg-purple-50 text-purple-700' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              <Users className={`h-5 w-5 mb-1 ${isActive('/admin/hospitals') ? 'text-purple-500' : 'text-gray-500'}`} />
              Hospitals
            </Link>
            <Link 
              href="/admin/users" 
              className={`flex flex-col items-center px-2 py-2 rounded-md text-xs font-medium transition-colors duration-200 
                ${isActive('/admin/users')
                  ? 'bg-purple-50 text-purple-700' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              <User className={`h-5 w-5 mb-1 ${isActive('/admin/users') ? 'text-purple-500' : 'text-gray-500'}`} />
              Users
            </Link>
            <Link 
              href="/admin/debug" 
              className={`flex flex-col items-center px-2 py-2 rounded-md text-xs font-medium transition-colors duration-200 
                ${isActive('/admin/debug')
                  ? 'bg-purple-50 text-purple-700' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              <Database className={`h-5 w-5 mb-1 ${isActive('/admin/debug') ? 'text-purple-500' : 'text-gray-500'}`} />
              Debug
            </Link>
          </div>
        )}
        
        {role === "USER" && (
          <div className="flex mt-2 justify-between">
            <EmergencyButton />
            <Link 
              href="/chat" 
              className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
            >
              <MessageSquareText className="h-4 w-4 mr-1" />
              AI Assistant
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
} 