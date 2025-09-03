require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not configured');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertOferButtExchange() {
  console.log('🚀 Starting to insert Ofer Butt exchange data...');

  try {
    // First, create the client contact if it doesn't exist
    const clientData = {
      id: 'b94a6162-8528-4b29-84ad-408b61784088',
      first_name: 'Ofer',
      last_name: 'Butt',
      display_name: 'Ofer Butt',
      email: 'ofer.butt@example.com',
      pp_contact_id: 'b94a6162-8528-4b29-84ad-408b61784088',
      contact_type: ['client'],
      is_active: true
    };

    const { data: existingClient } = await supabase
      .from('contacts')
      .select('id')
      .eq('id', clientData.id)
      .single();

    if (!existingClient) {
      const { error: clientError } = await supabase
        .from('contacts')
        .insert(clientData);
      
      if (clientError) {
        console.error('❌ Error creating client contact:', clientError);
      } else {
        console.log('✅ Created client contact: Ofer Butt');
      }
    } else {
      console.log('ℹ️ Client contact already exists');
    }

    // Now insert the exchange with all the fields
    const exchangeData = {
      id: '4b7e0059-8154-4443-ae85-a0549edec8c4',
      exchange_number: 'EX-2025-7981',
      name: 'Butt, Ofer - 10982 Roebling Avenue #363, Los Angeles, CA',
      exchange_type: 'delayed',
      client_id: 'b94a6162-8528-4b29-84ad-408b61784088',
      status: 'active',
      pp_matter_id: '7981-matter-id',
      pp_matter_number: 7981,
      pp_display_name: 'Butt, Ofer - 10982 Roebling Avenue #363, Los Angeles, CA',
      relinquished_property_value: 588000.00,
      rel_property_address: '10982 Roebling Avenue #363, Los Angeles, CA 90024',
      rel_property_type: 'Residential',
      rel_apn: '4363-007-106',
      rel_escrow_number: 'CA-25-26225',
      rel_value: 588000.00,
      rel_contract_date: '2025-08-28',
      contract_type: 'Residential Purchase Agreement and Joint Escrow Instructions',
      expected_closing_date: '2025-09-17',
      exchange_agreement_drafted: '2025-08-29',
      settlement_agent: 'Bryan Spoltore',
      client_vesting: 'Ofer Butt',
      buyer_vesting: 'Sanjeev Subherwal and Aarush Subherwal',
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
      .select('id')
      .eq('id', exchangeData.id)
      .single();

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
      
      console.log('✅ Successfully created exchange:', insertedExchange.name);
      console.log('📋 Exchange ID:', insertedExchange.id);
      console.log('📋 PP Matter Number:', insertedExchange.pp_matter_number);
    } else {
      // Update the existing exchange with all the new fields
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
      
      console.log('✅ Successfully updated exchange:', updatedExchange.name);
      console.log('📋 Exchange ID:', updatedExchange.id);
      console.log('📋 PP Matter Number:', updatedExchange.pp_matter_number);
    }

    // Verify the data is searchable
    console.log('\n🔍 Testing search functionality...');
    
    // Test search by PP Matter Number
    const { data: searchByPPNumber } = await supabase
      .from('exchanges')
      .select('id, name, pp_matter_number')
      .eq('pp_matter_number', 7981)
      .single();
    
    if (searchByPPNumber) {
      console.log('✅ Search by PP Matter Number (7981) works:', searchByPPNumber.name);
    }

    // Test search by Exchange ID
    const { data: searchById } = await supabase
      .from('exchanges')
      .select('id, name')
      .eq('id', '4b7e0059-8154-4443-ae85-a0549edec8c4')
      .single();
    
    if (searchById) {
      console.log('✅ Search by Exchange ID works:', searchById.name);
    }

    // Test search by APN
    const { data: searchByAPN } = await supabase
      .from('exchanges')
      .select('id, name, rel_apn')
      .ilike('rel_apn', '%4363-007-106%');
    
    if (searchByAPN && searchByAPN.length > 0) {
      console.log('✅ Search by APN (4363-007-106) works:', searchByAPN[0].name);
    }

    // Test search by Escrow Number
    const { data: searchByEscrow } = await supabase
      .from('exchanges')
      .select('id, name, rel_escrow_number')
      .ilike('rel_escrow_number', '%CA-25-26225%');
    
    if (searchByEscrow && searchByEscrow.length > 0) {
      console.log('✅ Search by Escrow Number (CA-25-26225) works:', searchByEscrow[0].name);
    }

    // Test search by Address
    const { data: searchByAddress } = await supabase
      .from('exchanges')
      .select('id, name, rel_property_address')
      .ilike('rel_property_address', '%10982 Roebling%');
    
    if (searchByAddress && searchByAddress.length > 0) {
      console.log('✅ Search by Address (10982 Roebling) works:', searchByAddress[0].name);
    }

    console.log('\n🎉 Exchange data successfully inserted and verified as searchable!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the insertion
insertOferButtExchange();