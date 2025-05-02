import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="bg-white">
      <main>
        {/* Hero section */}
        <div className="relative bg-gradient-to-br from-blue-50 to-indigo-100 py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
                <span className="block">About Medical Queue AI</span>
                <span className="block text-indigo-600 mt-1">
                  Our Mission and Technology
                </span>
              </h1>
              <p className="mx-auto mt-3 max-w-md text-base text-gray-500 sm:text-lg md:mt-5 md:max-w-3xl md:text-xl">
                Revolutionizing hospital waiting times with AI-powered prioritization
              </p>
            </div>
          </div>
        </div>

        {/* Content section */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="space-y-12">
            <div className="space-y-5 sm:space-y-4">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Our Mission</h2>
              <p className="text-xl text-gray-500">
                Medical Queue AI is dedicated to improving healthcare efficiency and patient outcomes by optimizing 
                how hospitals prioritize patients based on the severity of their conditions.
              </p>
            </div>

            <div className="space-y-5 sm:space-y-4">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How It Works</h2>
              
              <div className="space-y-6">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-xl font-medium text-gray-900">1. Upload Medical Receipts</h3>
                  <p className="mt-2 text-gray-500">
                    Patients upload their medical receipts, prescriptions, or documents through our secure platform.
                  </p>
                </div>
                
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-xl font-medium text-gray-900">2. AI Analysis</h3>
                  <p className="mt-2 text-gray-500">
                    Our advanced AI system analyzes the medical documents to determine the condition and its severity level.
                    The system utilizes Google's Gemini AI technology to understand medical terminology and prioritize care needs.
                  </p>
                </div>
                
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-xl font-medium text-gray-900">3. Queue Positioning</h3>
                  <p className="mt-2 text-gray-500">
                    Based on the AI analysis, patients are assigned a position in the hospital's queue, ensuring those with
                    more severe conditions receive care more quickly.
                  </p>
                </div>
                
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-xl font-medium text-gray-900">4. Real-time Updates</h3>
                  <p className="mt-2 text-gray-500">
                    Patients and hospital administrators can track queue positions in real-time, improving transparency
                    and helping hospitals manage patient flow more efficiently.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-5 sm:space-y-4">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Our Technology</h2>
              <p className="text-xl text-gray-500">
                Medical Queue AI is built using cutting-edge technologies:
              </p>
              
              <ul className="list-disc pl-5 space-y-2 text-gray-500">
                <li>Next.js for a fast, responsive user interface</li>
                <li>Prisma for secure and efficient database management</li>
                <li>Google's Gemini AI for advanced medical document analysis</li>
                <li>NextAuth for secure authentication</li>
                <li>Tailwind CSS for beautiful, responsive design</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-16 flex justify-center">
            <Link 
              href="/"
              className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
} 