const fs = require('fs');

// Read the current .env file
let currentEnv = fs.readFileSync('.env', 'utf8');

// Replace the database URLs with the Supabase credentials, using URL encoding for special characters
const updatedEnv = currentEnv
  .replace(/DATABASE_URL="[^"]*"/, 'DATABASE_URL="postgresql://postgres.fqnkpvsmezumndmyncmi:dikshant%2395@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true"')
  .replace(/DIRECT_URL="[^"]*"/, 'DIRECT_URL="postgresql://postgres.fqnkpvsmezumndmyncmi:dikshant%2395@aws-0-us-east-2.pooler.supabase.com:5432/postgres"');

// Write the updated content back to the .env file
fs.writeFileSync('.env', updatedEnv);

console.log('Updated .env file with Supabase configuration'); 