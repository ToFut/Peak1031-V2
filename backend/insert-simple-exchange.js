require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not configured');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertSimpleExchange() {
  console.log('🚀 Inserting exchange with available columns...');

  try {
    // First check if we have any existing clients in people table
    const { data: existingPeople, error: peopleError } = await supabase
      .from('people')
      .select('id, first_name, last_name, email')
      .limit(5);
    
    console.log('📋 Existing people:', existingPeople?.length || 0);
    
    let clientId = null;
    
    if (existingPeople && existingPeople.length > 0) {
      // Use the first existing person as client
      clientId = existingPeople[0].id;
      console.log(`✅ Using existing person as client: ${existingPeople[0].first_name} ${existingPeople[0].last_name}`);
    } else {
      // Create a new person for Ofer Butt
      const { data: newPerson, error: createError } = await supabase
        .from('people')
        .insert({
          first_name: 'Ofer',
          last_name: 'Butt',
          email: 'ofer.butt@example.com',
          phone: '310-555-0001',
          is_active: true
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Error creating person:', createError);
        return;
      }
      
      clientId = newPerson.id;
      console.log('✅ Created new person: Ofer Butt');
    }
    
    // Now insert the exchange with available columns
    const exchangeData = {
      id: '4b7e0059-8154-4443-ae85-a0549edec8c4',
      exchange_number: 'EX-2025-7981',
      name: 'Butt, Ofer - 10982 Roebling Avenue #363, Los Angeles, CA',
      exchange_type: 'delayed',
      client_id: clientId, // Use the person ID we found/created
      status: 'active',
      pp_matter_id: '7981-matter-id',
      pp_matter_number: 7981,
      pp_display_name: 'Butt, Ofer - 10982 Roebling Avenue #363, Los Angeles, CA',
      relinquished_property_value: 588000.00,
      rel_property_address: '10982 Roebling Avenue #363, Los Angeles, CA 90024',
      rel_apn: '4363-007-106',
      rel_escrow_number: 'CA-25-26225',
      rel_value: 588000.00,
      rel_contract_date: '2025-08-28',
      client_vesting: 'Ofer Butt',
      buyer_1_name: 'Sanjeev Subherwal',
      buyer_2_name: 'Aarush Subherwal',
      sale_date: '2025-08-29',
      identification_deadline: '2025-10-13',
      exchange_deadline: '2026-02-25',
      tags: ['residential', 'los-angeles', 'delayed'],
      is_active: true,
      created_at: '2025-08-29T00:00:00+00:00'
    };

    // Check if exchange already exists
    const { data: existingExchange } = await supabase
      .from('exchanges')
      .select('id, name')
      .eq('id', exchangeData.id)
      .single();

    let finalExchange;
    
    if (!existingExchange) {
      const { data: insertedExchange, error: exchangeError } = await supabase
        .from('exchanges')
        .insert(exchangeData)
        .select()
        .single();
      
      if (exchangeError) {
        console.error('❌ Error creating exchange:', exchangeError);
        return;
      }
      
      finalExchange = insertedExchange;
      console.log('✅ Successfully created exchange:', insertedExchange.name);
    } else {
      // Update the existing exchange
      const { data: updatedExchange, error: updateError } = await supabase
        .from('exchanges')
        .update(exchangeData)
        .eq('id', exchangeData.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('❌ Error updating exchange:', updateError);
        return;
      }
      
      finalExchange = updatedExchange;
      console.log('✅ Successfully updated exchange:', updatedExchange.name);
    }

    // Test searchability
    console.log('\n🔍 Testing search functionality...');
    
    // Test search by PP Matter Number
    const { data: searchByPPNumber } = await supabase
      .from('exchanges')
      .select('id, name, pp_matter_number')
      .eq('pp_matter_number', 7981);
    
    if (searchByPPNumber && searchByPPNumber.length > 0) {
      console.log('✅ Search by PP Matter Number (7981) works');
    }

    // Test search by Exchange ID
    const { data: searchById } = await supabase
      .from('exchanges')
      .select('id, name')
      .eq('id', '4b7e0059-8154-4443-ae85-a0549edec8c4');
    
    if (searchById && searchById.length > 0) {
      console.log('✅ Search by Exchange ID works');
    }

    // Test search by name/address pattern
    const { data: searchByName } = await supabase
      .from('exchanges')
      .select('id, name')
      .ilike('name', '%Ofer%');
    
    if (searchByName && searchByName.length > 0) {
      console.log('✅ Search by name (Ofer) works');
    }

    // Test search by address
    const { data: searchByAddress } = await supabase
      .from('exchanges')
      .select('id, name, rel_property_address')
      .ilike('rel_property_address', '%10982 Roebling%');
    
    if (searchByAddress && searchByAddress.length > 0) {
      console.log('✅ Search by address (10982 Roebling) works');
    }

    // Test search by APN
    const { data: searchByAPN } = await supabase
      .from('exchanges')
      .select('id, name, rel_apn')
      .eq('rel_apn', '4363-007-106');
    
    if (searchByAPN && searchByAPN.length > 0) {
      console.log('✅ Search by APN (4363-007-106) works');
    }

    // Test search by Escrow Number
    const { data: searchByEscrow } = await supabase
      .from('exchanges')
      .select('id, name, rel_escrow_number')
      .eq('rel_escrow_number', 'CA-25-26225');
    
    if (searchByEscrow && searchByEscrow.length > 0) {
      console.log('✅ Search by Escrow Number (CA-25-26225) works');
    }

    console.log('\n📊 Exchange Summary:');
    console.log('ID:', finalExchange.id);
    console.log('PP Matter #:', finalExchange.pp_matter_number);
    console.log('Name:', finalExchange.name);
    console.log('Address:', finalExchange.rel_property_address);
    console.log('APN:', finalExchange.rel_apn);
    console.log('Escrow #:', finalExchange.rel_escrow_number);
    console.log('Value: $', finalExchange.rel_value);
    
    console.log('\n🎉 Exchange is now searchable by:');
    console.log('- Exchange ID: 4b7e0059-8154-4443-ae85-a0549edec8c4');
    console.log('- PP Matter Number: 7981');
    console.log('- Name: Ofer, Butt');
    console.log('- Address: 10982 Roebling');
    console.log('- APN: 4363-007-106');
    console.log('- Escrow Number: CA-25-26225');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the insertion
insertSimpleExchange();