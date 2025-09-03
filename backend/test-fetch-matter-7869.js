require('dotenv').config();
const PracticePartnerService = require('./services/practicePartnerService');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchMatter7869() {
  console.log('🔍 Fetching matter 7869 from PracticePanther...\n');

  try {
    const ppService = new PracticePartnerService();
    
    // First ensure we have auth
    const authStatus = await ppService.getTokenStatus();
    console.log('Auth status:', authStatus);
    
    if (authStatus.status !== 'valid') {
      console.log('❌ No valid token. Please authenticate first.');
      return;
    }

    // Fetch matter directly by ID
    console.log('\n📄 Fetching matter 7869 directly...');
    const response = await ppService.client.get('/matters/7869');
    
    console.log('\n✅ Raw PracticePanther response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Now check what we have in our database
    console.log('\n📊 Checking our database for pp_matter_id 7869...');
    const { data: dbExchange, error } = await supabase
      .from('exchanges')
      .select('*')
      .eq('pp_matter_id', '7869')
      .single();
    
    if (dbExchange) {
      console.log('\n✅ Found in our database with ID:', dbExchange.id);
      console.log('\n🔍 Database fields comparison:');
      
      // Compare key fields
      const ppData = response.data;
      console.log('\n📌 KEY FIELD MAPPINGS:');
      console.log('================================');
      
      // Basic Info
      console.log('\n📝 BASIC INFO:');
      console.log('PP matter_name:', ppData.matter_name || ppData.name);
      console.log('DB name:', dbExchange.name);
      console.log('DB exchange_name:', dbExchange.exchange_name);
      
      // Addresses
      console.log('\n🏠 ADDRESSES:');
      console.log('PP rel_property_address:', ppData.rel_property_address);
      console.log('DB rel_property_address:', dbExchange.rel_property_address);
      console.log('DB relinquished_property_address:', dbExchange.relinquished_property_address);
      
      // Financial
      console.log('\n💰 FINANCIAL:');
      console.log('PP rel_value:', ppData.rel_value);
      console.log('PP proceeds:', ppData.proceeds);
      console.log('DB relinquished_sale_price:', dbExchange.relinquished_sale_price);
      console.log('DB exchange_value:', dbExchange.exchange_value);
      
      // Dates
      console.log('\n📅 DATES:');
      console.log('PP expected_rel_closing_date:', ppData.expected_rel_closing_date);
      console.log('PP close_of_escrow_date:', ppData.close_of_escrow_date);
      console.log('PP day_45:', ppData.day_45);
      console.log('PP day_180:', ppData.day_180);
      console.log('DB relinquished_closing_date:', dbExchange.relinquished_closing_date);
      console.log('DB identification_deadline:', dbExchange.identification_deadline);
      console.log('DB exchange_deadline:', dbExchange.exchange_deadline);
      
      // People
      console.log('\n👥 PEOPLE:');
      console.log('PP client_vesting:', ppData.client_vesting);
      console.log('PP buyer_vesting:', ppData.buyer_vesting);
      console.log('PP assigned_to:', ppData.assigned_to);
      console.log('PP internal_credit_to:', ppData.internal_credit_to);
      console.log('DB client_id:', dbExchange.client_id);
      console.log('DB exchange_coordinator:', dbExchange.exchange_coordinator);
      
      // Replacement Properties
      console.log('\n🏘️ REPLACEMENT PROPERTIES:');
      console.log('PP rep_1_property_address:', ppData.rep_1_property_address);
      console.log('PP rep_1_value:', ppData.rep_1_value);
      console.log('PP rep_1_purchase_contract_date:', ppData.rep_1_purchase_contract_date);
      console.log('PP rep_1_seller_vesting:', ppData.rep_1_seller_vesting);
      
      // Check pp_data field
      console.log('\n📦 PP_DATA FIELD:');
      if (dbExchange.pp_data) {
        console.log('Has pp_data:', 'Yes');
        console.log('pp_data keys:', Object.keys(dbExchange.pp_data));
        
        // Check if pp_data has the custom fields we need
        if (dbExchange.pp_data.custom_fields) {
          console.log('Has custom_fields in pp_data');
        }
      } else {
        console.log('Has pp_data:', 'No');
      }
      
      // Missing fields analysis
      console.log('\n⚠️ FIELDS IN PP BUT MISSING IN DB SCHEMA:');
      const ppFields = Object.keys(ppData);
      const dbFields = Object.keys(dbExchange);
      
      const missingInDB = ppFields.filter(field => 
        !dbFields.includes(field) && 
        !['id', 'created_at', 'updated_at'].includes(field)
      );
      
      console.log('Missing fields:', missingInDB);
      
      // Check if these missing fields are stored in pp_data
      console.log('\n🔍 Checking if missing fields are in pp_data:');
      missingInDB.forEach(field => {
        if (dbExchange.pp_data && dbExchange.pp_data[field] !== undefined) {
          console.log(`✅ ${field}: stored in pp_data = ${dbExchange.pp_data[field]}`);
        } else {
          console.log(`❌ ${field}: not found in pp_data`);
        }
      });
    } else {
      console.log('❌ Not found in our database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

fetchMatter7869();