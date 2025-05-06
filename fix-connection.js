const fs = require('fs');

// Update the .env file with the DIRECT_URL from the user's message
const envContent = `# Database connection URLs
DATABASE_URL="postgresql://postgres.fqnkpvsmezumndmyncmi:dikshant%2395@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.fqnkpvsmezumndmyncmi:dikshant%2395@aws-0-us-east-2.pooler.supabase.com:5432/postgres"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="YourNextAuthSecret"`;

fs.writeFileSync('.env', envContent);
console.log('.env file updated with properly encoded Supabase URLs'); 