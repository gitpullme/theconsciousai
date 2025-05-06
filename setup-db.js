/**
 * Script to set up the database for the medicine reminder feature
 */
const { execSync } = require('child_process');
const fs = require('fs');

console.log('Setting up database for medicine reminder feature...');

try {
  console.log('\n1. Updating environment variables');
  // Update the .env file with the correct Supabase credentials
  const envContent = fs.readFileSync('temp-env.txt', 'utf8');
  fs.writeFileSync('.env', envContent, 'utf8');
  fs.writeFileSync('.env.local', envContent, 'utf8');
  fs.writeFileSync('.env.development.local', envContent, 'utf8');
  console.log('✅ Environment variables updated successfully');
  
  console.log('\n2. Generating Prisma client');
  // Generate the Prisma client
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma client generated successfully');
  
  console.log('\n3. Pushing schema to database');
  // Push the schema to the database
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
  console.log('✅ Database schema pushed successfully');
  
  console.log('\n✅ Database setup complete!');
  console.log('\nYou can now save medicine reminders in your application.');
} catch (error) {
  console.error('❌ Error setting up database:', error.message);
  
  if (error.stdout) {
    console.error('Command output:', error.stdout.toString());
  }
  
  if (error.stderr) {
    console.error('Command error output:', error.stderr.toString());
  }
  
  console.log('\nTroubleshooting tips:');
  console.log('1. Make sure your Supabase database is accessible and online');
  console.log('2. Check if the database credentials are correct');
  console.log('3. Verify network connectivity to the database server');
} 