const fs = require('fs');

const envContent = `# Direct database connection
DATABASE_URL="postgresql://neondb_owner:npg_pdjTalF2WM8A@ep-royal-math-a5j7gwws.us-east-2.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://neondb_owner:npg_pdjTalF2WM8A@ep-royal-math-a5j7gwws.us-east-2.aws.neon.tech/neondb?sslmode=require"

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

// Create a .env.development.local file with the same direct connection
// Make sure NOT to use Prisma Accelerate URLs since they're causing issues
const devEnvContent = `# Direct database connection - no Accelerate to avoid issues
DATABASE_URL="postgresql://neondb_owner:npg_pdjTalF2WM8A@ep-royal-math-a5j7gwws.us-east-2.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://neondb_owner:npg_pdjTalF2WM8A@ep-royal-math-a5j7gwws.us-east-2.aws.neon.tech/neondb?sslmode=require"`;

fs.writeFileSync('.env.development.local', devEnvContent);

console.log('.env.development.local file created successfully'); 