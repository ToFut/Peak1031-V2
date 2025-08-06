#!/usr/bin/env node

/**
 * Complete PP data population after columns are added
 * This extracts ALL custom fields and main fields to populate the new table structure
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Custom field mapping to column names
const CUSTOM_FIELD_MAPPING = {
  'Type of Exchange': 'type_of_exchange',
  'Rel Value': 'rel_value',
  'Proceeds': 'proceeds', 
  'Identified?': 'identified',
  'Rep 1 Value': 'rep_1_value',
  'Rel Property Address': 'rel_property_address',
  'Rel Property State': 'rel_property_state',
  'Rel Purchase Contract Title': 'rel_purchase_contract_title',
  'Buyer 1 Name': 'buyer_1_name',
  'Rel Property City': 'rel_property_city',
  'Client Vesting': 'client_vesting',
  'Bank': 'bank',
  'Rel Escrow Number': 'rel_escrow_number',
  'Rel Contract Date': 'rel_contract_date',
  'Rel Property Zip': 'rel_property_zip',
  'Rel APN': 'rel_apn',
  'Day 45': 'day_45',
  'Day 180': 'day_180',
  'Close of Escrow Date': 'close_of_escrow_date',
  'Rep 1 Purchase Contract Title': 'rep_1_purchase_contract_title',
  'Rep 1 Property Address': 'rep_1_property_address',
  'Rep 1 Seller 1 Name': 'rep_1_seller_1_name',
  'Rep 1 City': 'rep_1_city',
  'Rep 1 State': 'rep_1_state',
  'Rep 1 Escrow Number': 'rep_1_escrow_number',
  'Rep 1 Zip': 'rep_1_zip',
  'Rep 1 Purchase Contract Date': 'rep_1_purchase_contract_date',
  'Buyer 2 Name': 'buyer_2_name',
  'Rep 1 Seller 2 Name': 'rep_1_seller_2_name',
  'Rep 1 APN': 'rep_1_apn',
  'Reason for Cancellation': 'reason_for_cancellation'
};

function extractCustomFieldValue(customFieldValues, fieldLabel) {
  if (!Array.isArray(customFieldValues)) return null;
  
  const field = customFieldValues.find(cf => 
    cf.custom_field_ref && cf.custom_field_ref.label === fieldLabel
  );
  
  if (!field) return null;
  
  // Return appropriate value based on type
  return field.value_string || field.value_number || field.value_boolean || field.value_date_time || null;
}

function formatDateValue(value) {
  if (!value) return null;
  try {
    const date = new Date(value);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  } catch {
    return null;
  }
}

async function populateAllPPData() {
  console.log('🚀 Starting complete PP data population...\n');
  
  // Get all exchanges with PP data in batches
  const BATCH_SIZE = 50;
  let offset = 0;
  let totalProcessed = 0;
  let totalUpdated = 0;
  
  while (true) {
    const { data: exchanges, error } = await supabase
      .from('exchanges')
      .select('id, name, pp_data')
      .not('pp_data', 'is', null)
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error('Error fetching exchanges:', error);
      break;
    }
    
    if (!exchanges || exchanges.length === 0) {
      console.log('No more exchanges to process');
      break;
    }

    console.log(`Processing batch ${Math.floor(offset/BATCH_SIZE) + 1}: ${exchanges.length} exchanges`);

    for (const exchange of exchanges) {
      try {
        const pp = exchange.pp_data;
        const updateData = {};

        // Extract main PP fields
        if (pp.rate) updateData.rate = pp.rate;
        if (pp.tags) updateData.tags = pp.tags;
        if (pp.assigned_to_users) updateData.assigned_to_users = pp.assigned_to_users;
        if (pp.statute_of_limitation_date) updateData.statute_of_limitation_date = pp.statute_of_limitation_date;
        if (pp.created_at) updateData.pp_created_at = pp.created_at;
        if (pp.updated_at) updateData.pp_updated_at = pp.updated_at;

        // Extract custom fields
        if (pp.custom_field_values) {
          Object.entries(CUSTOM_FIELD_MAPPING).forEach(([ppLabel, columnName]) => {
            const value = extractCustomFieldValue(pp.custom_field_values, ppLabel);
            if (value !== null) {
              // Handle date fields
              if (ppLabel.includes('Date') || ppLabel.includes('Day ')) {
                updateData[columnName] = formatDateValue(value);
              }
              // Handle boolean fields  
              else if (ppLabel.includes('?')) {
                updateData[columnName] = Boolean(value);
              }
              // Handle numeric fields
              else if (ppLabel === 'Rel Value' || ppLabel === 'Proceeds' || ppLabel === 'Rep 1 Value') {
                updateData[columnName] = parseFloat(value) || null;
              }
              // Handle text fields
              else {
                updateData[columnName] = String(value).substring(0, 500); // Limit length
              }
            }
          });
        }

        // Update exchange if we have data
        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from('exchanges')
            .update(updateData)
            .eq('id', exchange.id);

          if (updateError) {
            console.error(`❌ Error updating ${exchange.name}:`, updateError.message);
          } else {
            totalUpdated++;
            if (totalUpdated <= 5) {
              console.log(`✅ Updated: ${exchange.name}`);
              console.log(`   Fields updated: ${Object.keys(updateData).join(', ')}`);
            }
          }
        }

        totalProcessed++;
        
      } catch (err) {
        console.error(`❌ Error processing exchange ${exchange.id}:`, err.message);
      }
    }

    offset += BATCH_SIZE;
    
    // Show progress
    console.log(`Progress: ${totalProcessed} processed, ${totalUpdated} updated\n`);
  }

  console.log(`\n📊 FINAL RESULTS:`);
  console.log(`   Total processed: ${totalProcessed}`);
  console.log(`   Total updated: ${totalUpdated}`);
  console.log(`   Success rate: ${((totalUpdated/totalProcessed)*100).toFixed(1)}%`);
  
  // Verify results
  await verifyResults();
}

async function verifyResults() {
  console.log('\n🔍 Verifying results...\n');
  
  // Check how many records have the new fields populated
  const fieldsToCheck = ['type_of_exchange', 'rel_value', 'proceeds', 'bank', 'rel_property_city'];
  
  for (const field of fieldsToCheck) {
    try {
      const { count } = await supabase
        .from('exchanges')
        .select('*', { count: 'exact', head: true })
        .not(field, 'is', null);
      
      console.log(`✅ ${field}: ${count} records populated`);
    } catch (err) {
      console.log(`❌ ${field}: Error checking - ${err.message}`);
    }
  }
  
  // Show sample record
  try {
    const { data: sample } = await supabase
      .from('exchanges') 
      .select('name, type_of_exchange, rel_value, proceeds, bank, rel_property_city, day_45, day_180')
      .not('type_of_exchange', 'is', null)
      .limit(1);
      
    if (sample && sample[0]) {
      console.log('\n📋 SAMPLE POPULATED RECORD:');
      const ex = sample[0];
      console.log(`   Exchange: ${ex.name}`);
      console.log(`   Type: ${ex.type_of_exchange}`);
      console.log(`   Rel Value: $${ex.rel_value?.toLocaleString()}`);
      console.log(`   Proceeds: $${ex.proceeds?.toLocaleString()}`);
      console.log(`   Bank: ${ex.bank}`);
      console.log(`   City: ${ex.rel_property_city}`);
      console.log(`   Day 45: ${ex.day_45}`);
      console.log(`   Day 180: ${ex.day_180}`);
    }
  } catch (err) {
    console.log('Could not retrieve sample record');
  }
}

console.log('⚠️  IMPORTANT: Make sure you have run COMPLETE_PP_MIGRATION.sql first!');
console.log('This script requires the new columns to be added to the exchanges table.\n');

populateAllPPData();