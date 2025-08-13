#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import the existing Supabase service
const supabaseService = require('../services/supabase');

async function runMigration() {
  try {
    console.log('🔄 Running permission functions migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../../database/migrations/207_add_permission_functions.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Migration SQL loaded, size:', migrationSql.length, 'characters');
    
    // Split into individual statements
    const statements = migrationSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log('📊 Found', statements.length, 'SQL statements to execute');
    
    // Since we can't execute DDL directly, we'll use the RPC approach
    // First, let's try to call the function to see if it exists
    console.log('🔍 Testing if permission function already exists...');
    
    try {
      const { data, error } = await supabaseService.supabase.rpc('check_user_permission', {
        exchange_uuid: '00000000-0000-0000-0000-000000000000',
        permission_name: 'view_documents', 
        user_uuid: '00000000-0000-0000-0000-000000000000'
      });
      
      if (!error || !error.message.includes('Could not find the function')) {
        console.log('✅ Permission function already exists and is working!');
        return;
      }
    } catch (testError) {
      console.log('ℹ️  Function test failed, proceeding with migration...');
    }
    
    console.log('');
    console.log('⚠️  MANUAL MIGRATION REQUIRED');
    console.log('');
    console.log('Due to Supabase client limitations for DDL operations, please:');
    console.log('');
    console.log('1. Go to https://supabase.com/dashboard/project/fozdhmlcjnjkwilmiiem');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the following SQL:');
    console.log('');
    console.log('='.repeat(80));
    console.log(migrationSql);
    console.log('='.repeat(80));
    console.log('');
    console.log('4. Click "Run" to execute the migration');
    console.log('');
    console.log('This will create the missing permission functions and fix the 403 errors.');
    
  } catch (error) {
    console.error('❌ Error running migration:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runMigration().catch(console.error);
}

module.exports = { runMigration };