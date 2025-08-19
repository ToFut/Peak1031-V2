const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkAuditLogsSchema() {
  try {
    console.log('🔍 Checking audit_logs table structure...\n');

    // Try to get a sample record to see the structure
    const { data: sampleLogs, error: sampleError } = await supabase
      .from('audit_logs')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.log('❌ Error accessing audit_logs table:', sampleError.message);
      
      // Check if the table exists
      const { data: tables, error: tableError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'audit_logs');

      if (tableError) {
        console.log('❌ Error checking tables:', tableError.message);
      } else {
        if (tables && tables.length > 0) {
          console.log('✅ audit_logs table exists');
        } else {
          console.log('❌ audit_logs table does not exist');
        }
      }
      return;
    }

    if (sampleLogs && sampleLogs.length > 0) {
      console.log('📋 audit_logs table structure (sample record):');
      const sampleLog = sampleLogs[0];
      Object.keys(sampleLog).forEach(key => {
        console.log(`   ${key}: ${sampleLog[key]}`);
      });
    } else {
      console.log('ℹ️  audit_logs table exists but is empty');
      
      // Try to insert a test record to see what columns are available
      const { data: insertResult, error: insertError } = await supabase
        .from('audit_logs')
        .insert({
          action: 'TEST_ACTION',
          entity_type: 'test',
          entity_id: '00000000-0000-0000-0000-000000000000',
          user_id: '00000000-0000-0000-0000-000000000000',
          ip_address: '127.0.0.1',
          user_agent: 'test',
          details: { test: true }
        })
        .select();

      if (insertError) {
        console.log('❌ Error inserting test record:', insertError.message);
      } else {
        console.log('✅ Test record inserted successfully');
        console.log('📋 Available columns from insert:');
        if (insertResult && insertResult.length > 0) {
          Object.keys(insertResult[0]).forEach(key => {
            console.log(`   ${key}`);
          });
        }
        
        // Clean up test record
        await supabase
          .from('audit_logs')
          .delete()
          .eq('action', 'TEST_ACTION');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAuditLogsSchema();




























