require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function checkSupabaseStatus() {
  try {
    // Check if environment variables are loaded
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      console.log('❌ Missing Supabase environment variables');
      console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
      console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? 'Set' : 'Missing');
      return;
    }
    
    console.log('🔍 CHECKING SUPABASE DATABASE STATUS\n');
    console.log('URL:', process.env.SUPABASE_URL);
    console.log('Service Key:', process.env.SUPABASE_SERVICE_KEY.substring(0, 50) + '...');
    
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    
    // Test connection
    const { data, error } = await supabase
      .from('people')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('\n❌ Connection failed:', error.message);
      
      if (error.message.includes('Invalid API key')) {
        console.log('\n🔧 TROUBLESHOOTING:');
        console.log('1. Check if your Supabase service key is correct');
        console.log('2. Make sure the key is not split across multiple lines in .env');
        console.log('3. Verify your Supabase project is active');
      }
      
      if (error.message.includes('relation "people" does not exist')) {
        console.log('\n✅ Connection successful!');
        console.log('❌ People table does not exist - you can run the setup script');
      }
      
      return;
    }
    
    console.log('\n✅ Connection successful!');
    console.log('✅ People table exists');
    
    // Get count of people
    const { count: peopleCount } = await supabase
      .from('people')
      .select('*', { count: 'exact', head: true });
    
    console.log(`- Total people records: ${peopleCount}`);
    
    // Check other key tables
    const tablesToCheck = [
      'exchanges', 'exchange_participants', 'tasks', 'messages', 
      'documents', 'chat_rooms', 'task_templates', 'document_templates'
    ];
    
    console.log('\n📊 TABLE STATUS:');
    
    for (const table of tablesToCheck) {
      try {
        const { count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        console.log(`✅ ${table}: ${count} records`);
      } catch (err) {
        console.log(`❌ ${table}: Table does not exist`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkSupabaseStatus(); 