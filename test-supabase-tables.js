const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testTables() {
  console.log('🔍 Testing Supabase tables...');
  
  const tables = ['users', 'contacts', 'exchanges', 'tasks', 'documents', 'messages', 'notifications', 'agencies', 'third_parties'];
  
  for (const table of tables) {
    try {
      console.log(`\n📋 Testing table: ${table}`);
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ Table ${table}: ${error.message}`);
      } else {
        console.log(`✅ Table ${table}: Ready (${data.length} rows)`);
      }
    } catch (e) {
      console.log(`❌ Table ${table}: ${e.message}`);
    }
  }
  
  console.log('\n🎯 Testing specific user lookup...');
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@peak1031.com')
      .limit(1);
    
    if (error) {
      console.log(`❌ User lookup error: ${error.message}`);
    } else {
      console.log(`✅ User lookup: ${data.length} users found`);
      if (data.length > 0) {
        console.log(`   User ID: ${data[0].id}`);
        console.log(`   Email: ${data[0].email}`);
        console.log(`   Role: ${data[0].role}`);
      }
    }
  } catch (e) {
    console.log(`❌ User lookup exception: ${e.message}`);
  }
}

testTables(); 