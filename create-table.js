/**
 * Script to create the MedicineReminder table directly with SQL
 */
const { Pool } = require('pg');

// Supabase connection details
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

// SQL for creating the MedicineReminder table
const createTableSQL = `
CREATE TABLE IF NOT EXISTS "MedicineReminder" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "dosage" TEXT NOT NULL,
  "frequency" TEXT NOT NULL,
  "time" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
  
  CONSTRAINT "MedicineReminder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MedicineReminder_userId_idx" ON "MedicineReminder"("userId");
CREATE INDEX IF NOT EXISTS "MedicineReminder_isActive_idx" ON "MedicineReminder"("isActive");
`;

async function createTable() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to database. Creating MedicineReminder table...');
    
    // Execute the SQL to create the table
    await client.query(createTableSQL);
    
    console.log('✅ MedicineReminder table created successfully!');
    
    // Verify the table exists
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'MedicineReminder'
      );
    `);
    
    if (result.rows[0].exists) {
      console.log('✅ Verified that the MedicineReminder table exists');
    } else {
      console.log('❌ Table creation might have failed. Could not verify table existence.');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error creating table:', error.message);
    return false;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the function to create the table
createTable()
  .then(success => {
    if (success) {
      console.log('\nYou can now use the medicine reminder feature in your application.');
    } else {
      console.log('\nFailed to set up the database. Please check the error messages above.');
    }
  })
  .catch(err => {
    console.error('Unexpected error:', err);
  }); 