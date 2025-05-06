const fs = require('fs');

const envContent = `# Database configuration - Supabase
DATABASE_URL="postgresql://postgres.fqnkpvsmezumndmyncmi:dikshant%2395@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.fqnkpvsmezumndmyncmi:dikshant%2395@aws-0-us-east-2.pooler.supabase.com:5432/postgres"

# Google OAuth
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="YourNextAuthSecret"

# Gemini API
GEMINI_API_KEY=""`;

fs.writeFileSync('.env', envContent);

console.log('.env file created successfully');

// Create a .env.development.local file with the same connection
const devEnvContent = `# Database configuration - Supabase
DATABASE_URL="postgresql://postgres.fqnkpvsmezumndmyncmi:dikshant%2395@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.fqnkpvsmezumndmyncmi:dikshant%2395@aws-0-us-east-2.pooler.supabase.com:5432/postgres"`;

fs.writeFileSync('.env.development.local', devEnvContent);

console.log('.env.development.local file created successfully'); 