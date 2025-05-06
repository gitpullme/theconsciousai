import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import Link from "next/link";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    // Redirect based on user role
    const userRole = session.user.role || "USER";
    
    if (userRole === "ADMIN") {
      redirect("/admin");
    } else if (userRole === "HOSPITAL") {
      redirect("/hospital");
    } else {
      redirect("/user");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center max-w-3xl px-6">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
          <span className="block">Medical Queue AI</span>
          <span className="block text-indigo-700 mt-1">
            Smarter Hospital Queues
          </span>
        </h1>
        <p className="mt-3 text-base text-gray-700 sm:mx-auto sm:mt-5 sm:max-w-xl sm:text-lg md:mt-5 md:text-xl">
          Our AI-powered system analyzes patient's medical receipts to prioritize cases based on severity, ensuring those with urgent needs are seen faster.
        </p>
        <div className="mt-8 sm:flex sm:justify-center">
          <div className="rounded-md shadow">
            <Link href="/login" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10">
              Get Started
            </Link>
          </div>
          <div className="mt-3 sm:mt-0 sm:ml-3">
            <Link href="/about" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10">
              Learn More
            </Link>
          </div>
        </div>
      </div>
      
      {/* Developer Information Link */}
      <div className="fixed bottom-6 right-6">
        <Link 
          href="/developer"
          className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 group"
          aria-label="Developer Information"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-7 h-7 text-white group-hover:rotate-12 transition-transform duration-300"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
