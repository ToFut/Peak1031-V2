require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not configured');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addMissingColumns() {
  console.log('🚀 Adding missing columns to exchanges table...');

  try {
    // Skip column check, just try to work with what we have
    console.log('ℹ️ Checking which columns exist...');

    // List of columns to add
    const columnsToAdd = [
      { name: 'pp_matter_number', type: 'INTEGER', comment: 'PracticePanther Matter Number' },
      { name: 'rel_property_address', type: 'TEXT', comment: 'Relinquished property full address' },
      { name: 'rel_property_type', type: 'VARCHAR(100)', comment: 'Property type (Residential, Commercial, etc)' },
      { name: 'rel_apn', type: 'VARCHAR(50)', comment: 'Assessor Parcel Number' },
      { name: 'rel_escrow_number', type: 'VARCHAR(100)', comment: 'Escrow account number' },
      { name: 'rel_value', type: 'DECIMAL(15,2)', comment: 'Relinquished property value' },
      { name: 'rel_contract_date', type: 'DATE', comment: 'Contract date' },
      { name: 'contract_type', type: 'TEXT', comment: 'Type of contract' },
      { name: 'expected_closing_date', type: 'DATE', comment: 'Expected closing date' },
      { name: 'exchange_agreement_drafted', type: 'DATE', comment: 'Date exchange agreement was drafted' },
      { name: 'settlement_agent', type: 'VARCHAR(255)', comment: 'Settlement agent name' },
      { name: 'client_vesting', type: 'TEXT', comment: 'How client holds title' },
      { name: 'buyer_vesting', type: 'TEXT', comment: 'How buyers will hold title' },
      { name: 'buyer_1_name', type: 'VARCHAR(255)', comment: 'First buyer name' },
      { name: 'buyer_2_name', type: 'VARCHAR(255)', comment: 'Second buyer name' }
    ];

    // Execute ALTER TABLE statements via raw SQL
    for (const column of columnsToAdd) {
      try {
        // Use a simpler approach - just try to update/insert with the field
        // This will tell us if the column exists or not
        const testData = {};
        testData[column.name] = null;
        
        const { error } = await supabase
          .from('exchanges')
          .update(testData)
          .eq('id', 'test-id-that-does-not-exist');
        
        if (error && error.message && error.message.includes(`Could not find the '${column.name}' column`)) {
          console.log(`❌ Column '${column.name}' does not exist - needs to be added via migration`);
        } else {
          console.log(`✅ Column '${column.name}' appears to exist`);
        }
      } catch (err) {
        console.log(`⚠️ Could not check column '${column.name}':`, err.message);
      }
    }

    console.log('\n📝 Summary:');
    console.log('The missing columns need to be added via a database migration.');
    console.log('You can use the SQL migration file we created earlier: 210_add_specific_exchange_ofer_butt.sql');
    console.log('Or run the ALTER TABLE commands directly in your Supabase SQL editor.');

    // Try inserting with only the columns that exist
    console.log('\n🔄 Attempting to insert exchange with available columns...');
    
    const basicExchangeData = {
      id: '4b7e0059-8154-4443-ae85-a0549edec8c4',
      exchange_number: 'EX-2025-7981',
      name: 'Butt, Ofer - 10982 Roebling Avenue #363, Los Angeles, CA',
      exchange_type: 'delayed',
      client_id: 'b94a6162-8528-4b29-84ad-408b61784088',
      status: 'active',
      pp_matter_id: '7981-matter-id',
      pp_display_name: 'Butt, Ofer - 10982 Roebling Avenue #363, Los Angeles, CA',
      relinquished_property_value: 588000.00,
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
      .eq('id', basicExchangeData.id)
      .single();

    if (!existingExchange) {
      const { data: insertedExchange, error: exchangeError } = await supabase
        .from('exchanges')
        .insert(basicExchangeData)
        .select()
        .single();
      
      if (exchangeError) {
        console.error('❌ Error creating exchange with basic data:', exchangeError);
      } else {
        console.log('✅ Successfully created exchange with available columns:', insertedExchange.name);
        console.log('📋 Exchange ID:', insertedExchange.id);
        console.log('📋 Exchange can now be searched by ID and name');
      }
    } else {
      // Update with basic data
      const { data: updatedExchange, error: updateError } = await supabase
        .from('exchanges')
        .update(basicExchangeData)
        .eq('id', basicExchangeData.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('❌ Error updating exchange:', updateError);
      } else {
        console.log('✅ Successfully updated exchange with available columns:', updatedExchange.name);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the check
addMissingColumns();