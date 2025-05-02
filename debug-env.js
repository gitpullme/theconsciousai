// Debug script to check environment variables
require('dotenv').config();

console.log('Environment variables:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 
  process.env.DATABASE_URL.substring(0, 30) + '...' : 'undefined');
console.log('DIRECT_URL:', process.env.DIRECT_URL ? 
  process.env.DIRECT_URL.substring(0, 30) + '...' : 'undefined');

// Try to parse the DATABASE_URL
if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    console.log('URL protocol:', url.protocol);
    console.log('URL hostname:', url.hostname);
    console.log('URL pathname:', url.pathname);
  } catch (error) {
    console.error('Error parsing DATABASE_URL:', error.message);
  }
}

// Also check for .env.development.local
const fs = require('fs');
if (fs.existsSync('.env.development.local')) {
  console.log('\n.env.development.local exists');
  const envContent = fs.readFileSync('.env.development.local', 'utf8');
  const lines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  console.log('Contents:', lines.length, 'non-comment lines');
  for (const line of lines) {
    if (line.startsWith('DATABASE_URL=')) {
      console.log('DATABASE_URL in .env.development.local:', 
        line.substring(0, 50) + '...');
    }
  }
} else {
  console.log('\n.env.development.local does not exist');
}

// Check Node.js version and OS info
console.log('\nNode.js version:', process.version);
console.log('OS:', process.platform, process.arch); 