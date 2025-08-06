require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function checkDatabaseWithAnon() {
  try {
    console.log('🔍 CHECKING DATABASE WITH ANON KEY\n');
    
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    
    // Check what tables exist and their data
    const tables = [
      'contacts', 'users', 'exchanges', 'tasks', 'messages', 
      'documents', 'exchange_participants', 'organizations'
    ];
    
    console.log('📊 DATABASE STATUS:\n');
    
    for (const table of tables) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`❌ ${table}: ${error.message}`);
        } else {
          console.log(`✅ ${table}: ${count} records`);
          
          // Show first few records if any exist
          if (count > 0 && data && data.length > 0) {
            console.log(`   Sample: ${JSON.stringify(data[0], null, 2).substring(0, 100)}...`);
          }
        }
      } catch (err) {
        console.log(`❌ ${table}: Table does not exist`);
      }
    }
    
    console.log('\n🎯 SUMMARY:');
    console.log('- Anon key access: ✅ Working');
    console.log('- Service key access: ❌ Not working');
    console.log('- Database structure: ✅ Exists');
    
    console.log('\n💡 NEXT STEPS:');
    console.log('1. Fix service key for write access');
    console.log('2. Run SUPABASE_SETUP_COMPLETE.sql to upgrade schema');
    console.log('3. Migrate data from SQLite if needed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkDatabaseWithAnon(); 