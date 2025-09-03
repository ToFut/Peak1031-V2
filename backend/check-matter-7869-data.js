require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMatter7869() {
  console.log('🔍 Checking database for matter 7869 data...\n');

  try {
    // Check by pp_matter_id
    console.log('1️⃣ Searching by pp_matter_id = 7869...');
    const { data: byPPId, error: error1 } = await supabase
      .from('exchanges')
      .select('*')
      .eq('pp_matter_id', '7869')
      .single();
    
    if (byPPId) {
      console.log('✅ Found by pp_matter_id');
      console.log('Exchange ID:', byPPId.id);
      console.log('\n📊 Data Analysis:');
      console.log('================================');
      
      // Basic Info
      console.log('\n📝 BASIC INFO:');
      console.log('name:', byPPId.name);
      console.log('exchange_name:', byPPId.exchange_name);
      console.log('status:', byPPId.status);
      console.log('new_status:', byPPId.new_status);
      console.log('exchange_type:', byPPId.exchange_type);
      
      // Addresses
      console.log('\n🏠 PROPERTY ADDRESSES:');
      console.log('rel_property_address:', byPPId.rel_property_address);
      console.log('relinquished_property_address:', byPPId.relinquished_property_address);
      
      // Financial
      console.log('\n💰 FINANCIAL INFO:');
      console.log('exchange_value:', byPPId.exchange_value);
      console.log('relinquished_sale_price:', byPPId.relinquished_sale_price);
      console.log('proceeds:', byPPId.proceeds);
      console.log('bank_account_escrow:', byPPId.bank_account_escrow);
      
      // Dates
      console.log('\n📅 IMPORTANT DATES:');
      console.log('start_date:', byPPId.start_date);
      console.log('relinquished_closing_date:', byPPId.relinquished_closing_date);
      console.log('identification_date:', byPPId.identification_date);
      console.log('identification_deadline:', byPPId.identification_deadline);
      console.log('exchange_deadline:', byPPId.exchange_deadline);
      console.log('completion_date:', byPPId.completion_date);
      console.log('completion_deadline:', byPPId.completion_deadline);
      
      // People
      console.log('\n👥 PEOPLE:');
      console.log('client_id:', byPPId.client_id);
      console.log('exchange_coordinator:', byPPId.exchange_coordinator);
      console.log('attorney_or_cpa:', byPPId.attorney_or_cpa);
      
      // PP Data
      console.log('\n📦 PP_DATA FIELD:');
      if (byPPId.pp_data) {
        console.log('Has pp_data: Yes');
        const ppData = byPPId.pp_data;
        
        // Show all PP fields
        console.log('\n🔍 All PracticePanther fields stored:');
        Object.keys(ppData).forEach(key => {
          const value = ppData[key];
          if (value !== null && value !== undefined && value !== '') {
            console.log(`  ${key}:`, typeof value === 'object' ? JSON.stringify(value) : value);
          }
        });
        
        // Check for custom fields
        if (ppData.custom_fields) {
          console.log('\n⭐ Custom Fields from PP:');
          Object.keys(ppData.custom_fields).forEach(key => {
            console.log(`  ${key}:`, ppData.custom_fields[key]);
          });
        }
        
        // Map important PP fields
        console.log('\n🎯 Key PP Fields we should display:');
        console.log('  Type of Exchange:', ppData.type_of_exchange || ppData.exchange_type);
        console.log('  Internal Credit To:', ppData.internal_credit_to);
        console.log('  Referral Source:', ppData.referral_source);
        console.log('  Referral Email:', ppData.referral_source_email);
        console.log('  Bank:', ppData.bank);
        console.log('  Proceeds:', ppData.proceeds);
        console.log('  Date Proceeds Received:', ppData.date_proceeds_received);
        console.log('  Day 45:', ppData.day_45);
        console.log('  Day 180:', ppData.day_180);
        console.log('  Client Vesting:', ppData.client_vesting);
        console.log('  Buyer Vesting:', ppData.buyer_vesting);
        console.log('  REL Settlement Agent:', ppData.rel_settlement_agent);
        console.log('  REL Escrow Number:', ppData.rel_escrow_number);
        console.log('  REL APN:', ppData.rel_apn);
        console.log('  Property Type:', ppData.property_type);
        console.log('  REP 1 Property Address:', ppData.rep_1_property_address);
        console.log('  REP 1 Value:', ppData.rep_1_value);
        console.log('  REP 1 Seller Vesting:', ppData.rep_1_seller_vesting);
        console.log('  Matter Number:', ppData.matter_number);
        console.log('  Assigned To:', ppData.assigned_to);
        
      } else {
        console.log('Has pp_data: No');
      }
      
      // Check replacement properties
      console.log('\n🏘️ REPLACEMENT PROPERTIES:');
      const { data: repProps } = await supabase
        .from('replacement_properties')
        .select('*')
        .eq('exchange_id', byPPId.id);
      
      if (repProps && repProps.length > 0) {
        console.log(`Found ${repProps.length} replacement properties:`);
        repProps.forEach((prop, idx) => {
          console.log(`  Property ${idx + 1}:`);
          console.log(`    Address: ${prop.address}`);
          console.log(`    Purchase Price: ${prop.purchase_price}`);
          console.log(`    Closing Date: ${prop.closing_date}`);
        });
      } else {
        console.log('No replacement properties found');
      }
      
      // Check participants
      console.log('\n👥 EXCHANGE PARTICIPANTS:');
      const { data: participants } = await supabase
        .from('exchange_participants')
        .select(`
          *,
          people (
            first_name,
            last_name,
            email,
            phone,
            pp_contact_id
          )
        `)
        .eq('exchange_id', byPPId.id);
      
      if (participants && participants.length > 0) {
        console.log(`Found ${participants.length} participants:`);
        participants.forEach(p => {
          if (p.people) {
            console.log(`  ${p.people.first_name} ${p.people.last_name} - Role: ${p.role}`);
          }
        });
      } else {
        console.log('No participants found');
      }
      
    } else {
      console.log('❌ Not found by pp_matter_id');
    }
    
    // Also check by exchange ID
    console.log('\n2️⃣ Checking by exchange ID e00bfb0f-df96-438e-98f0-87ef91b708a7...');
    const { data: byId } = await supabase
      .from('exchanges')
      .select('pp_matter_id, name, pp_data')
      .eq('id', 'e00bfb0f-df96-438e-98f0-87ef91b708a7')
      .single();
    
    if (byId) {
      console.log('✅ Found by ID');
      console.log('pp_matter_id:', byId.pp_matter_id);
      console.log('name:', byId.name);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkMatter7869();