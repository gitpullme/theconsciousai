/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only core configuration settings
  reactStrictMode: true,
  env: {
    // Explicitly set the database URL
    DATABASE_URL: "postgresql://neondb_owner:npg_pdjTalF2WM8A@ep-royal-math-a5j7gwws.us-east-2.aws.neon.tech/neondb?sslmode=require",
    DIRECT_URL: "postgresql://neondb_owner:npg_pdjTalF2WM8A@ep-royal-math-a5j7gwws.us-east-2.aws.neon.tech/neondb?sslmode=require",
  },
};

module.exports = nextConfig; 