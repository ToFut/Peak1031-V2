#!/usr/bin/env node

/**
 * Script to check the structure of audit_logs table
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkAuditLogs() {
  console.log('🔍 Checking audit_logs table structure...\n');

  try {
    // Get a sample record to see the columns
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error querying audit_logs:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log('✅ audit_logs table exists');
      console.log('\nColumns found:');
      Object.keys(data[0]).forEach(column => {
        console.log(`  - ${column}: ${typeof data[0][column]} (sample: ${JSON.stringify(data[0][column]).substring(0, 50)}...)`);
      });
    } else {
      console.log('ℹ️  audit_logs table exists but is empty');
      
      // Try to get column info another way
      const { data: testInsert, error: insertError } = await supabase
        .from('audit_logs')
        .insert({
          action: 'TEST',
          entity_type: 'TEST',
          created_at: new Date().toISOString()
        })
        .select();

      if (insertError) {
        console.log('\nError during test insert (this helps identify required columns):');
        console.log(insertError.message);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAuditLogs();