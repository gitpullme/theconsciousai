const fs = require('fs');

const devEnvContent = `# Database connection URLs for development
DATABASE_URL="postgresql://postgres.fqnkpvsmezumndmyncmi:dikshant%2395@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.fqnkpvsmezumndmyncmi:dikshant%2395@aws-0-us-east-2.pooler.supabase.com:5432/postgres"`;

fs.writeFileSync('.env.development.local', devEnvContent);

console.log('.env.development.local file created with Supabase configuration'); 