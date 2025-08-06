#!/usr/bin/env node

/**
 * Apply the migration to add all PP fields to the exchanges table
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function applyMigration() {
  console.log('🚀 Applying migration to add all PP fields...\n');
  
  try {
    // Read the migration SQL
    const migrationSQL = fs.readFileSync('/Users/segevbin/Desktop/Peak1031 V1 /database/migrations/025-add-all-pp-fields.sql', 'utf8');
    
    // Split into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'))
      .map(stmt => stmt + ';');
    
    console.log(`Executing ${statements.length} SQL statements...\n`);
    
    let success = 0;
    let errors = 0;
    
    for (const [index, statement] of statements.entries()) {
      try {
        console.log(`${index + 1}. Executing: ${statement.substring(0, 60)}...`);
        
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          console.error(`   ❌ Error: ${error.message}`);
          errors++;
        } else {
          console.log(`   ✅ Success`);
          success++;
        }
        
      } catch (err) {
        console.error(`   ❌ Exception: ${err.message}`);
        errors++;
      }
    }
    
    console.log(`\n📊 Migration Results:`);
    console.log(`   ✅ Successful: ${success}`);
    console.log(`   ❌ Errors: ${errors}`);
    
    if (errors === 0) {
      console.log('\n🎉 Migration completed successfully!');
      
      // Verify new columns were added
      const { data } = await supabase.from('exchanges').select('*').limit(1);
      if (data && data[0]) {
        const columns = Object.keys(data[0]).sort();
        console.log(`\n📋 Current exchange table has ${columns.length} columns:`);
        console.log(columns.join(', '));
      }
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

applyMigration();