#!/usr/bin/env node

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

async function testAndSetup() {
  console.log('🚀 Supabase Connection Test & Simple Setup');
  console.log('==========================================');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  console.log('📡 Connecting to Supabase...');
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Test with a simple operation
    console.log('🔌 Testing basic connection...');
    
    // Try to create a simple users table first
    console.log('📋 Creating basic users table...');
    
    const createUsersSQL = `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(50) DEFAULT 'client',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // Use direct SQL approach
    const { data: userData, error: userError } = await supabase
      .rpc('exec', { sql: createUsersSQL });

    if (userError) {
      console.log('⚠️ Direct SQL not available:', userError.message);
      console.log('🔄 Trying table creation via client...');
      
      // Try inserting a test record to see if table exists
      try {
        const { data: testSelect, error: selectError } = await supabase
          .from('users')
          .select('count(*)', { count: 'exact', head: true });

        if (selectError) {
          console.log('❌ Users table does not exist:', selectError.message);
          console.log('');
          console.log('📝 MANUAL SETUP REQUIRED');
          console.log('========================');
          console.log('Please go to your Supabase Dashboard:');
          console.log('1. Open https://app.supabase.com/project/' + supabaseUrl.split('//')[1].split('.')[0]);
          console.log('2. Go to SQL Editor');
          console.log('3. Run the schema file: database/migrations/200_comprehensive_optimized_schema_fixed.sql');
          console.log('');
          return;
        } else {
          console.log('✅ Users table exists with', testSelect?.count || 0, 'records');
        }
      } catch (err) {
        console.log('❌ Table test failed:', err.message);
      }
    } else {
      console.log('✅ Users table created successfully');
    }

    // Test other basic operations
    console.log('🧪 Testing basic CRUD operations...');

    const testTables = ['users', 'contacts', 'exchanges', 'tasks', 'messages', 'documents'];
    const results = {};

    for (const table of testTables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          results[table] = `❌ ${error.message}`;
        } else {
          results[table] = `✅ ${count || 0} records`;
        }
      } catch (err) {
        results[table] = `❌ ${err.message}`;
      }
    }

    console.log('📊 Table Status:');
    Object.entries(results).forEach(([table, status]) => {
      console.log(`  ${table.padEnd(15)}: ${status}`);
    });

    // Count successful tables
    const successfulTables = Object.values(results).filter(status => status.includes('✅')).length;
    
    console.log('');
    console.log('📈 Summary:', successfulTables, 'of', testTables.length, 'tables accessible');
    
    if (successfulTables === testTables.length) {
      console.log('🎉 All tables are ready! Database is fully configured.');
      
      // Test a sample insert
      console.log('🧪 Testing sample insert...');
      try {
        const { data: insertData, error: insertError } = await supabase
          .from('users')
          .insert({
            email: 'test@example.com',
            first_name: 'Test',
            last_name: 'User',
            role: 'admin'
          })
          .select()
          .single();

        if (insertError) {
          if (insertError.message.includes('duplicate')) {
            console.log('✅ Insert test: User already exists (expected)');
          } else {
            console.log('⚠️ Insert test failed:', insertError.message);
          }
        } else {
          console.log('✅ Insert test successful:', insertData.email);
        }
      } catch (insertErr) {
        console.log('⚠️ Insert test error:', insertErr.message);
      }
      
    } else {
      console.log('⚠️ Some tables missing. Please run the full schema migration.');
      console.log('📝 Recommended: Use Supabase SQL Editor to run the complete schema');
    }

  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.error('Full error:', error);
  }
}

testAndSetup();