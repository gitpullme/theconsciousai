/**
 * Script to fix database environment variables
 * This script creates proper .env files with correctly encoded connection strings
 */
const fs = require('fs');
const path = require('path');

// Fix URL encoding of the password with the proper format
// Using encodeURIComponent to ensure proper encoding of special characters
const password = "dikshant#95";
const encodedPassword = encodeURIComponent(password);

// Properly encoded connection URLs for Supabase
const DATABASE_URL = `postgresql://postgres.fqnkpvsmezumndmyncmi:${encodedPassword}@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true`;
const DIRECT_URL = `postgresql://postgres.fqnkpvsmezumndmyncmi:${encodedPassword}@aws-0-us-east-2.pooler.supabase.com:5432/postgres`;

console.log('Encoded connection strings:');
console.log('DATABASE_URL:', DATABASE_URL);
console.log('DIRECT_URL:', DIRECT_URL);

// Function to create or update an environment file
function updateEnvFile(filePath, content) {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Created/Updated ${filePath}`);
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
}

// Environment file content
const envContent = `# Database configuration - Supabase with properly encoded special characters
DATABASE_URL="${DATABASE_URL}"
DIRECT_URL="${DIRECT_URL}"

# Google OAuth
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="YourNextAuthSecret"

# Gemini API
GEMINI_API_KEY="AIzaSyAdY9MhqAj1Y-3dQJ88slGjx4nMJn8xMwQ"
`;

// Create all necessary .env files
console.log('Creating environment files with properly encoded database URLs...');

// Create .env file (for development)
updateEnvFile(path.join(__dirname, '.env'), envContent);

// Create .env.local file (for local overrides)
updateEnvFile(path.join(__dirname, '.env.local'), envContent);

// Create .env.development file
updateEnvFile(path.join(__dirname, '.env.development'), envContent);

// Create .env.development.local file
updateEnvFile(path.join(__dirname, '.env.development.local'), envContent);

console.log('✅ Environment setup complete');
console.log('Please restart your Next.js development server for changes to take effect.'); 