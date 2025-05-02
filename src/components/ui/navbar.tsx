"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export default function Navbar() {
  const { data: session } = useSession();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  if (!session?.user) {
    return null;
  }

  const { role } = session.user;
  
  return (
    <nav className="bg-white shadow">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex flex-shrink-0 items-center">
              <Link href="/" className="font-bold text-xl text-indigo-600">
                Medical Queue AI
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
              {role === "USER" && (
                <>
                  <Link href="/user" className="px-3 py-2 rounded-md text-sm font-medium text-gray-900 hover:bg-gray-100">
                    Dashboard
                  </Link>
                  <Link href="/user/upload" className="px-3 py-2 rounded-md text-sm font-medium text-gray-900 hover:bg-gray-100">
                    Upload Receipt
                  </Link>
                </>
              )}
              
              {role === "HOSPITAL" && (
                <>
                  <Link href="/hospital" className="px-3 py-2 rounded-md text-sm font-medium text-gray-900 hover:bg-gray-100">
                    Queue Dashboard
                  </Link>
                  <Link href="/hospital/settings" className="px-3 py-2 rounded-md text-sm font-medium text-gray-900 hover:bg-gray-100">
                    Settings
                  </Link>
                </>
              )}
              
              {role === "ADMIN" && (
                <>
                  <Link href="/admin" className="px-3 py-2 rounded-md text-sm font-medium text-gray-900 hover:bg-gray-100">
                    Dashboard
                  </Link>
                  <Link href="/admin/hospitals" className="px-3 py-2 rounded-md text-sm font-medium text-gray-900 hover:bg-gray-100">
                    Manage Hospitals
                  </Link>
                  <Link href="/admin/users" className="px-3 py-2 rounded-md text-sm font-medium text-gray-900 hover:bg-gray-100">
                    Manage Users
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center">
            <div className="relative ml-3">
              <div>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  type="button"
                  className="flex rounded-full bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  id="user-menu-button"
                  aria-expanded="false"
                  aria-haspopup="true"
                >
                  <span className="sr-only">Open user menu</span>
                  {session.user.image ? (
                    <Image
                      className="h-8 w-8 rounded-full"
                      src={session.user.image}
                      alt=""
                      width={32}
                      height={32}
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                      {session.user.name?.[0] || "U"}
                    </div>
                  )}
                </button>
              </div>

              {isDropdownOpen && (
                <div
                  className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="user-menu-button"
                  tabIndex={-1}
                >
                  <span className="block px-4 py-2 text-sm text-gray-700">
                    {session.user.name}
                  </span>
                  <span className="block px-4 py-2 text-xs text-gray-500">
                    {session.user.email}
                  </span>
                  <div className="border-t border-gray-100 my-1"></div>
                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    role="menuitem"
                    tabIndex={-1}
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    Your Profile
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    role="menuitem"
                    tabIndex={-1}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
} 