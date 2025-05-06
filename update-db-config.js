const fs = require('fs');

// Define optimized database URLs with connection pool settings
const envContent = `# Database connection URLs with optimized settings
DATABASE_URL="postgresql://postgres.fqnkpvsmezumndmyncmi:dikshant%2395@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5&pool_timeout=15"
DIRECT_URL="postgresql://postgres.fqnkpvsmezumndmyncmi:dikshant%2395@aws-0-us-east-2.pooler.supabase.com:5432/postgres"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="YourNextAuthSecret"

# Connection Pool Settings
DATABASE_POOL_SIZE=5
DATABASE_MAX_CONNECTIONS=10
`;

try {
  // Write the updated content to the .env file
  fs.writeFileSync('.env', envContent);
  console.log('Updated .env file with optimized database configuration');
  
  // Also update the development environment
  fs.writeFileSync('.env.development.local', envContent);
  console.log('Updated .env.development.local file with optimized database configuration');
  
  console.log('Database connection settings have been optimized for better performance.');
} catch (error) {
  console.error('Error updating environment files:', error);
} 