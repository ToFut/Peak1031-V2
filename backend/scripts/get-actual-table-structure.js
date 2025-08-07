#!/usr/bin/env node

/**
 * Get actual table structure from Supabase information schema
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

async function getTableStructure() {
  console.log('🔍 Getting actual table structure from database...\n');
  
  try {
    // Query information schema to get actual column structure
    const { data, error } = await supabase.rpc('get_table_columns', {
      table_name: 'exchanges'
    });

    if (error) {
      console.log('❌ RPC call failed, trying alternative approach...');
      
      // Try a simpler approach - insert minimal record to see what works
      const testRecord = {
        name: 'Test Structure Check',
        exchange_name: 'Test Structure Check Exchange',
        status: 'active'
      };
      
      const { data: insertData, error: insertError } = await supabase
        .from('exchanges')
        .insert([testRecord])
        .select();
        
      if (insertError) {
        console.log('❌ Basic insert failed:', insertError.message);
      } else {
        console.log('✅ Basic insert successful');
        
        // Get the inserted record to see its structure
        if (insertData && insertData.length > 0) {
          const record = insertData[0];
          const columns = Object.keys(record);
          
          console.log('\n📋 Available columns from successful insert:');
          console.log('=' .repeat(60));
          columns.forEach((col, index) => {
            console.log(`${(index + 1).toString().padStart(2)}: ${col}`);
          });
          
          console.log('\n📄 Sample record structure:');
          console.log(JSON.stringify(record, null, 2));
          
          // Clean up test record
          await supabase
            .from('exchanges')
            .delete()
            .eq('id', record.id);
            
          console.log('\n🧹 Test record cleaned up');
        }
      }
      
      return;
    }

    console.log('✅ Got table structure from information schema');
    console.log(data);
    
  } catch (error) {
    console.error('❌ Error getting table structure:', error);
  }
}

// Run the analysis
getTableStructure().then(() => {
  console.log('\n🏁 Structure analysis complete!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});