/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only core configuration settings
  reactStrictMode: true,
  // Explicitly point to the src directory
  distDir: '.next',
  // Add server configuration to handle large headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Connection',
            value: 'keep-alive',
          },
        ],
      },
    ];
  },
  env: {
    // Explicitly set the database URL (Supabase)
    DATABASE_URL: "postgresql://postgres.fqnkpvsmezumndmyncmi:dikshant%2395@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true",
    DIRECT_URL: "postgresql://postgres.fqnkpvsmezumndmyncmi:dikshant%2395@aws-0-us-east-2.pooler.supabase.com:5432/postgres",
    // Add Gemini API key for AI features
    GEMINI_API_KEY: "AIzaSyAdY9MhqAj1Y-3dQJ88slGjx4nMJn8xMwQ",
  },
};

module.exports = nextConfig; 