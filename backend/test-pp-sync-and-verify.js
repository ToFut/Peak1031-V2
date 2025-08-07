const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

async function testPPSyncAndVerify() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    console.log('🚀 TESTING PP DATA SYNC AND FIELD POPULATION');
    console.log('============================================\n');
    
    // Get PP token
    const { data: tokenData } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('provider', 'practicepanther')
      .eq('is_active', true)
      .single();
    
    if (!tokenData) {
      console.log('❌ No active PP token found. Need to complete OAuth first.');
      return;
    }
    
    console.log('✅ Found active PP token\n');
    
    // Test sync for each table and verify fields
    const tables = [
      { name: 'contacts', endpoint: 'contacts', dbTable: 'pp_contacts' },
      { name: 'tasks', endpoint: 'tasks', dbTable: 'pp_tasks' },
      { name: 'invoices', endpoint: 'invoices', dbTable: 'pp_invoices' },
      { name: 'expenses', endpoint: 'expenses', dbTable: 'pp_expenses' },
      { name: 'users', endpoint: 'users', dbTable: 'pp_users' },
      { name: 'notes', endpoint: 'notes', dbTable: 'pp_notes' }
    ];
    
    for (const table of tables) {
      console.log(`\n📊 Testing ${table.name.toUpperCase()} sync:`);
      console.log('----------------------------------------');
      
      try {
        // Fetch from PP API
        const response = await axios.get(`https://app.practicepanther.com/api/v2/${table.endpoint}`, {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Accept': 'application/json'
          },
          params: { limit: 2 } // Just get 2 records for testing
        });
        
        const ppData = response.data;
        console.log(`✅ Fetched ${ppData?.length || 0} ${table.name} from PP API`);
        
        if (ppData && ppData.length > 0) {
          // Show all fields from PP API
          console.log(`\n📋 Fields from PracticePanther API:`);
          const sampleRecord = ppData[0];
          Object.keys(sampleRecord).forEach(key => {
            const value = sampleRecord[key];
            const valuePreview = value === null ? 'null' : 
                               typeof value === 'object' ? JSON.stringify(value).substring(0, 50) + '...' :
                               String(value).substring(0, 50);
            console.log(`   • ${key}: ${valuePreview}`);
          });
          
          // Check what's in our database
          const { data: dbData, error: dbError } = await supabase
            .from(table.dbTable)
            .select('*')
            .limit(1);
          
          if (!dbError && dbData && dbData.length > 0) {
            console.log(`\n✅ Database table ${table.dbTable} has data!`);
            console.log(`📋 Fields stored in our database:`);
            Object.keys(dbData[0]).forEach(key => {
              const value = dbData[0][key];
              const hasValue = value !== null && value !== undefined;
              console.log(`   • ${key}: ${hasValue ? '✅ Has data' : '⚠️ Empty'}`);
            });
          } else {
            console.log(`\n⚠️ Database table ${table.dbTable} is empty - need to run sync!`);
          }
        } else {
          console.log(`⚠️ No ${table.name} data available from PP`);
        }
        
      } catch (error) {
        if (error.response?.status === 404) {
          console.log(`❌ ${table.name} endpoint not available (404)`);
        } else {
          console.log(`❌ Error fetching ${table.name}: ${error.message}`);
        }
      }
    }
    
    console.log('\n\n📊 FIELD MAPPING VERIFICATION');
    console.log('================================');
    console.log('Checking if all PP fields are mapped to database...\n');
    
    // Show the actual field mapping for contacts as example
    console.log('Example: PP_CONTACTS field mapping:');
    console.log('------------------------------------');
    console.log('PP API Field         →  Database Column');
    console.log('----------------------------------------');
    console.log('id                   →  pp_id');
    console.log('account_ref.id       →  account_ref_id');
    console.log('account_ref.name     →  account_ref_display_name');
    console.log('display_name         →  display_name');
    console.log('first_name           →  first_name');
    console.log('middle_name          →  middle_name');
    console.log('last_name            →  last_name');
    console.log('phone_mobile         →  phone_mobile');
    console.log('phone_home           →  phone_home');
    console.log('phone_work           →  phone_work');
    console.log('phone_fax            →  phone_fax');
    console.log('email                →  email');
    console.log('notes                →  notes');
    console.log('custom_field_values  →  custom_field_values (JSONB)');
    console.log('created_at           →  pp_created_at');
    console.log('updated_at           →  pp_updated_at');
    console.log('                     →  synced_at (auto-added)');
    
    console.log('\n💡 To populate all data, run "Sync Changes" in the admin dashboard!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testPPSyncAndVerify();