#!/usr/bin/env node

/**
 * Check actual table structure in Supabase
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTableStructure() {
  console.log('🔍 Checking table structure...\n');
  
  try {
    // Try to insert a minimal record to see what columns exist
    const testRecord = {
      id: 'test-structure',
      exchange_name: 'Test Exchange',
      status: 'active'
    };
    
    const { data, error } = await supabase
      .from('exchanges')
      .insert([testRecord])
      .select();
      
    if (error) {
      console.log('❌ Insert failed - checking error for column info:', error.message);
    } else {
      console.log('✅ Basic insert successful');
      
      // Clean up test record
      await supabase
        .from('exchanges')
        .delete()
        .eq('id', 'test-structure');
    }
    
    // Try to get existing records to see structure
    const { data: existingData, error: selectError } = await supabase
      .from('exchanges')
      .select('*')
      .limit(1);
      
    if (selectError) {
      console.error('❌ Select failed:', selectError);
    } else {
      console.log('📊 Table structure from existing data:');
      if (existingData && existingData.length > 0) {
        const columns = Object.keys(existingData[0]);
        console.log('Available columns:');
        columns.forEach((col, index) => {
          console.log(`  ${index + 1}: ${col}`);
        });
      } else {
        console.log('  No existing data to analyze structure');
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking table structure:', error);
  }
}

checkTableStructure().then(() => {
  console.log('\n🏁 Structure check complete!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});