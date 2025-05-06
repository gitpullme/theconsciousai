// Script to fix database connection configuration
const fs = require('fs');
const path = require('path');

// Supabase connection URLs with properly encoded special characters
const DATABASE_URL = "postgresql://postgres.fqnkpvsmezumndmyncmi:dikshant%2395@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true";
const DIRECT_URL = "postgresql://postgres.fqnkpvsmezumndmyncmi:dikshant%2395@aws-0-us-east-2.pooler.supabase.com:5432/postgres";

// Function to create or update an environment file
function updateEnvFile(filePath, content) {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated ${filePath}`);
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
}

// Update the main .env file
const mainEnvContent = `# Database configuration - Supabase
DATABASE_URL="${DATABASE_URL}"
DIRECT_URL="${DIRECT_URL}"

# Google OAuth
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="YourNextAuthSecret"

# Gemini API
GEMINI_API_KEY=""`;

updateEnvFile(path.join(__dirname, '.env'), mainEnvContent);

// Update development local environment
const devEnvContent = `# Database configuration - Supabase
DATABASE_URL="${DATABASE_URL}"
DIRECT_URL="${DIRECT_URL}"`;

updateEnvFile(path.join(__dirname, '.env.development.local'), devEnvContent);

console.log('\n🔄 All database connection strings have been updated to use Supabase.');
console.log('🚀 Restart your application for changes to take effect.'); 