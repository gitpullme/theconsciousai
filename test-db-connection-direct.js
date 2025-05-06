/**
 * Simple direct database connection test using pg
 * This bypasses Prisma to check raw connection ability
 */
const { Pool } = require('pg');

// Get connection details from environment variables
require('dotenv').config(); // Load from .env file

// Extract connection parts from DATABASE_URL or DIRECT_URL
function parseConnectionString(connString) {
  try {
    // Parse connection URL
    const url = new URL(connString);
    const userParts = url.username.split('.');
    
    return {
      user: url.username,
      password: decodeURIComponent(url.password),
      host: url.hostname,
      port: url.port,
      database: url.pathname.replace(/^\//, ''),
      ssl: true
    };
  } catch (err) {
    console.error('Failed to parse connection string:', err);
    return null;
  }
}

// Extract and log connection details
const directUrl = process.env.DIRECT_URL;
const poolUrl = process.env.DATABASE_URL;

console.log('Database URLs:');
console.log('DIRECT_URL:', directUrl?.substring(0, 50) + '...');
console.log('DATABASE_URL:', poolUrl?.substring(0, 50) + '...');

// Try to parse both connection strings
const directConfig = parseConnectionString(directUrl);
const poolConfig = parseConnectionString(poolUrl);

console.log('\nParsed connection config:');
console.log('Direct connection config:', {
  user: directConfig?.user,
  host: directConfig?.host,
  port: directConfig?.port,
  database: directConfig?.database,
  ssl: directConfig?.ssl
  // Omit password for security
});

// Test using direct connection (not pooler)
async function testDirectConnection() {
  if (!directConfig) {
    console.error('❌ Cannot test direct connection: Invalid connection string');
    return false;
  }

  const pool = new Pool({
    ...directConfig,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000, // 10 seconds
    statement_timeout: 10000 // 10 seconds
  });
  
  let client;
  
  try {
    console.log('\nTesting direct database connection...');
    
    // Try to connect
    client = await pool.connect();
    console.log('✅ Connected to database successfully');
    
    // Try simple query
    const result = await client.query('SELECT current_database() as db, current_user as user');
    console.log('✅ Query executed successfully:');
    console.log(result.rows[0]);
    
    // Test if tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      LIMIT 5;
    `);
    
    console.log(`\n✅ Found ${tablesResult.rowCount} tables in the database:`);
    tablesResult.rows.forEach(row => console.log(`- ${row.table_name}`));
    
    return true;
  } catch (err) {
    console.error('❌ Direct database connection failed:', err);
    return false;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Run the test
testDirectConnection()
  .then(success => {
    console.log('\nConnection test complete.');
    
    if (!success) {
      console.log('\nTroubleshooting tips:');
      console.log('1. Check that your database password is correctly URL-encoded');
      console.log('2. Verify that firewall rules allow connections from your IP');
      console.log('3. Confirm that the database service is running');
      console.log('4. Make sure your database user has proper permissions');
    }
    
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unexpected error during test:', err);
    process.exit(1);
  }); 