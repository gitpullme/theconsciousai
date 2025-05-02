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
          <span className="block text-indigo-600 mt-1">
            Smarter Hospital Queues
          </span>
        </h1>
        <p className="mt-3 text-base text-gray-500 sm:mx-auto sm:mt-5 sm:max-w-xl sm:text-lg md:mt-5 md:text-xl">
          Our AI-powered system analyzes patient's medical receipts to prioritize cases based on severity, ensuring those with urgent needs are seen faster.
        </p>
        <div className="mt-8 sm:flex sm:justify-center">
          <div className="rounded-md shadow">
            <Link href="/login" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10">
              Get Started
            </Link>
          </div>
          <div className="mt-3 sm:mt-0 sm:ml-3">
            <Link href="/about" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10">
              Learn More
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
