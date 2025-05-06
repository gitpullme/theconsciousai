/**
 * Script to test Supabase database connection
 */
const { Pool } = require('pg');

// Supabase connection details - do not use the connection string directly
const pool = new Pool({
  user: 'postgres.fqnkpvsmezumndmyncmi',
  password: 'dikshant#95',
  host: 'aws-0-us-east-2.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  ssl: {
    rejectUnauthorized: false
  }
});

// Test the connection
async function testConnection() {
  let client;
  
  try {
    console.log('Testing connection to Supabase database...');
    
    // Connect to the database
    client = await pool.connect();
    console.log('✅ Successfully connected to the database!');
    
    // Try to execute a simple query
    const result = await client.query('SELECT current_database() as db, current_user as user');
    console.log('✅ Query executed successfully!');
    console.log('Database info:', result.rows[0]);
    
    // Check for medicine_reminder table
    try {
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'MedicineReminder'
        );
      `);
      
      if (tableCheck.rows[0].exists) {
        console.log('✅ "MedicineReminder" table exists in the database');
        
        // Count records in the table
        const countResult = await client.query('SELECT COUNT(*) FROM "MedicineReminder"');
        console.log(`ℹ️ The table contains ${countResult.rows[0].count} records`);
      } else {
        console.log('❌ "MedicineReminder" table does not exist');
        console.log('You may need to run Prisma migrations to create the required tables');
      }
    } catch (err) {
      console.error('Error checking for MedicineReminder table:', err.message);
    }
    
    return true;
  } catch (err) {
    console.error('❌ Database connection error:', err.message);
    
    // Provide more specific error messages based on common errors
    if (err.message.includes('ENOTFOUND') || err.message.includes('ETIMEDOUT')) {
      console.error('This appears to be a network connectivity issue.');
      console.error('Please check if:');
      console.error('1. You are connected to the internet');
      console.error('2. The database hostname is correct');
      console.error('3. Your firewall is not blocking the connection');
    } else if (err.message.includes('password authentication failed')) {
      console.error('The username or password is incorrect.');
    } else if (err.message.includes('does not exist')) {
      console.error('The specified database does not exist.');
    }
    
    return false;
  } finally {
    // Release the client back to the pool
    if (client) {
      client.release();
    }
    
    // End the pool
    pool.end();
  }
}

// Run the test
testConnection()
  .then(() => {
    console.log('\nDatabase connection test complete.');
  })
  .catch(err => {
    console.error('Unexpected error:', err);
  }); 