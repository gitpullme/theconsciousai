import Image from 'next/image';
import Link from 'next/link';

export default function DeveloperPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-indigo-950 flex flex-col items-center overflow-hidden relative">
      {/* Retro grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,45,0.9)_1px,transparent_1px),linear-gradient(90deg,rgba(18,16,45,0.9)_1px,transparent_1px)] bg-[size:42px_42px] opacity-30"></div>
      
      {/* Synthwave sun */}
      <div className="absolute -bottom-40 left-0 right-0 w-full h-80 bg-gradient-to-t from-pink-600 to-transparent rounded-[100%] opacity-30 blur-xl"></div>
      
      {/* Back button */}
      <div className="absolute top-6 left-6 z-50">
        <Link href="/" className="flex items-center gap-2 text-pink-400 hover:text-pink-300 transition-colors">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          <span className="font-[var(--font-vt323)] text-lg">BACK</span>
        </Link>
      </div>

      <div className="w-full max-w-3xl mx-auto px-6 py-20 relative z-10">
        {/* Main content card with retro style */}
        <div className="relative backdrop-blur-sm border-4 border-cyan-700 bg-slate-900/80 rounded-lg p-1 shadow-[0_0_30px_rgba(80,199,255,0.4)]">
          {/* Purple scanline overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(131,58,180,0.05)_50%)] bg-[size:4px_4px] pointer-events-none"></div>
          
          {/* Content inner */}
          <div className="p-8 relative">
            {/* Developer and kangaroo with gun image section */}
            <div className="flex flex-col md:flex-row gap-8 mb-6 items-center">
              <div className="w-full md:w-1/2 space-y-4">
                <h2 className="text-2xl text-cyan-300 font-[var(--font-vt323)] tracking-wider mb-4">
                  <span className="text-pink-400">&gt;</span> DEVELOPED BY <span className="text-pink-400 font-bold">DIKSHANT</span>
                </h2>
                
                {/* Credits section */}
                <div className="text-cyan-100 font-[var(--font-vt323)] text-lg leading-relaxed space-y-2">
                  <p><span className="text-pink-400">IDEA:</span> PRANAV</p>
                  <p><span className="text-pink-400">CONTRIBUTE BY:</span> PARTH</p>
                  <p><span className="text-pink-400">PLANNED:</span> HIMANSHU, PRASHANT, SURAJ</p>
                </div>
              </div>
              
              {/* Image styled like a kangaroo with gun */}
              <div className="w-full md:w-1/2 flex justify-center relative">
                <div className="relative w-64 h-64">
                  {/* Name label above image */}
                  <div className="absolute -top-8 left-0 right-0 text-center">
                    <p className="text-lg text-cyan-400 font-[var(--font-vt323)] tracking-wider">
                      <span className="text-pink-400">&gt;</span> DIKSHANT <span className="text-pink-400">&lt;</span>
                    </p>
                  </div>
                  
                  {/* Character body with retro pixel styling */}
                  <div className="absolute inset-0 bg-[#000033] rounded-lg border-4 border-cyan-700 overflow-hidden shadow-[0_0_15px_rgba(80,199,255,0.6)]">
                    {/* The image */}
                    <Image 
                      src="/photo_2025-05-04_11-34-08.jpg"
                      alt="Dikshant"
                      width={256}
                      height={256}
                      className="object-cover w-full h-full mix-blend-luminosity opacity-90"
                    />
                    
                    {/* Scanline effect */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.2)_50%,transparent_100%)] bg-[size:100%_4px] animate-scanline"></div>
                  </div>
                  
                  {/* "Gun" - pixel art style */}
                  <div className="absolute bottom-10 -right-16 w-24 h-8 bg-gradient-to-r from-gray-800 to-gray-700 border-2 border-cyan-500 rounded-sm transform rotate-45 shadow-[0_0_10px_rgba(80,199,255,0.6)]"></div>
                  
                  {/* Laser beam effect */}
                  <div className="absolute bottom-6 -right-36 w-28 h-1 bg-pink-500 animate-pulse shadow-[0_0_10px_#ec4899,0_0_20px_#ec4899]"></div>
                </div>
              </div>
            </div>
            
            {/* Version info in minimal style */}
            <div className="mt-10 text-center border-t border-cyan-900/50 pt-6">
              <p className="text-cyan-400 font-[var(--font-vt323)] text-lg">
                <span className="text-pink-400">VER:</span> 1.0.0
              </p>
              <p className="text-cyan-400 font-[var(--font-vt323)] text-sm mt-1">
                <span className="text-pink-400">&copy;</span> {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </div>
        
        {/* Minimal footer */}
        <div className="mt-8 text-center">
          <p className="text-pink-400 font-[var(--font-vt323)] tracking-wider animate-pulse">
            [SYSTEM READY]
          </p>
        </div>
      </div>
    </div>
  );
} 