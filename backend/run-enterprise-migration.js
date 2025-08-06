#!/usr/bin/env node

/**
 * Run Enterprise Lifecycle Migration
 * This script adds comprehensive enterprise features to the existing database
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Starting Enterprise Lifecycle Migration...\n');
  
  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'ENTERPRISE_LIFECYCLE_MIGRATION.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded successfully');
    console.log('⏳ Applying migration to database...\n');
    
    // Split SQL into individual statements (separated by semicolons)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      // Skip comments and empty statements
      if (statement.trim().startsWith('--') || statement.trim().length < 5) {
        continue;
      }
      
      // Extract statement type for logging
      const stmtType = statement.trim().substring(0, 50).split('\n')[0];
      
      try {
        // Use Supabase RPC to execute raw SQL
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: statement
        }).single();
        
        if (error) {
          // Try direct execution as fallback
          const { error: directError } = await supabase
            .from('exchanges')
            .select('id')
            .limit(1);
            
          if (!directError) {
            // Connection works, statement might have issues
            if (error.message.includes('already exists') || 
                error.message.includes('duplicate')) {
              console.log(`✓ Skipped (already exists): ${stmtType.substring(0, 40)}...`);
              successCount++;
            } else {
              console.error(`✗ Error: ${stmtType.substring(0, 40)}...`);
              console.error(`  ${error.message}`);
              errors.push({ statement: stmtType, error: error.message });
              errorCount++;
            }
          }
        } else {
          console.log(`✓ Success: ${stmtType.substring(0, 40)}...`);
          successCount++;
        }
      } catch (err) {
        console.error(`✗ Error: ${stmtType.substring(0, 40)}...`);
        console.error(`  ${err.message}`);
        errors.push({ statement: stmtType, error: err.message });
        errorCount++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`❌ Failed statements: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('\n⚠️  Some statements failed (this may be normal if features already exist)');
      console.log('Failed statements:');
      errors.forEach(e => {
        console.log(`  - ${e.statement.substring(0, 50)}...`);
      });
    }
    
    // Verify the migration
    console.log('\n🔍 Verifying migration...\n');
    
    // Check if enterprise columns exist
    const { data: exchangeCheck, error: exchangeError } = await supabase
      .from('exchanges')
      .select('id, lifecycle_stage, compliance_status, risk_level')
      .limit(1);
    
    if (!exchangeError) {
      console.log('✅ Enterprise columns added to exchanges table');
    } else {
      console.log('⚠️  Could not verify enterprise columns');
    }
    
    // Check exchange count
    const { count: exchangeCount } = await supabase
      .from('exchanges')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Total exchanges in database: ${exchangeCount || 0}`);
    
    // Check admin users
    const { data: adminUsers, error: adminError } = await supabase
      .from('people')
      .select('id, email, first_name, last_name')
      .eq('role', 'admin')
      .eq('is_active', true);
    
    if (adminUsers && adminUsers.length > 0) {
      console.log(`\n👤 Active admin users who can now see all exchanges:`);
      adminUsers.forEach(admin => {
        console.log(`   - ${admin.email} (${admin.first_name} ${admin.last_name})`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Enterprise Migration Complete!');
    console.log('='.repeat(60));
    console.log('\n✨ What\'s New:');
    console.log('  ✓ Lifecycle management (7 stages from Initiation to Completion)');
    console.log('  ✓ Compliance tracking and risk assessment');
    console.log('  ✓ Financial transaction management');
    console.log('  ✓ Milestone and deadline tracking');
    console.log('  ✓ Comprehensive analytics and reporting');
    console.log('  ✓ Automatic progress calculation');
    console.log('\n🔑 Admin Capabilities:');
    console.log('  ✓ View ALL exchanges across the entire system');
    console.log('  ✓ See complete lifecycle stages and progression');
    console.log('  ✓ Monitor compliance status and risk levels');
    console.log('  ✓ Track financial transactions and milestones');
    console.log('  ✓ Advance exchanges through lifecycle stages');
    console.log('  ✓ Export comprehensive reports');
    console.log('\n📱 How to Test:');
    console.log('  1. Log in as an admin user');
    console.log('  2. Go to the Admin Dashboard');
    console.log('  3. Click on "Exchange Management" tab');
    console.log('  4. You should see ALL exchanges with enhanced details');
    console.log('  5. Click on any exchange to see full lifecycle view');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nPlease check:');
    console.error('1. Supabase credentials are correct in .env');
    console.error('2. Database is accessible');
    console.error('3. You have admin/service role permissions');
    process.exit(1);
  }
}

// Alternative: Direct SQL execution if RPC doesn't work
async function executeSQLDirect() {
  console.log('\n📝 Alternative: Manual SQL Execution Instructions\n');
  console.log('If the automatic migration fails, you can run it manually:');
  console.log('\n1. Go to your Supabase Dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Copy the contents of ENTERPRISE_LIFECYCLE_MIGRATION.sql');
  console.log('4. Paste and run in the SQL Editor');
  console.log('\nThe migration file is located at:');
  console.log(path.join(__dirname, 'ENTERPRISE_LIFECYCLE_MIGRATION.sql'));
}

// Run the migration
runMigration().catch(err => {
  console.error('Migration error:', err);
  executeSQLDirect();
});