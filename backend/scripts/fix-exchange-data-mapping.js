#!/usr/bin/env node

/**
 * Fix Exchange Data Mapping - Extract PP data to individual database columns
 * 
 * This script processes existing exchanges that have PP data in the pp_data field
 * but empty individual columns, and extracts the data to populate the columns
 * that the frontend components expect.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Extract custom field value from PP data
 */
function getPPValue(ppData, label) {
  if (!ppData.custom_field_values) return null;
  const field = ppData.custom_field_values.find(f => f.custom_field_ref.label === label);
  if (!field) return null;
  return field.value_string || field.value_number || field.value_date_time || 
         (field.contact_ref ? field.contact_ref.display_name : field.value_boolean) || null;
}

/**
 * Map PP matter status to our exchange status
 */
function mapMatterStatus(ppStatus) {
  const statusMap = {
    'active': 'PENDING',
    'open': 'PENDING', 
    'in_progress': '45D',
    'pending': 'PENDING',
    'closed': 'COMPLETED',
    'completed': 'COMPLETED',
    'cancelled': 'TERMINATED'
  };
  
  return statusMap[ppStatus?.toLowerCase()] || 'PENDING';
}

/**
 * Extract and map PP data to individual database columns
 */
function extractPPDataToColumns(ppData) {
  if (!ppData || typeof ppData !== 'object' || !ppData.id) {
    return {}; // Return empty if no valid PP data
  }

  const updates = {};

  // Basic fields from PP data
  if (ppData.display_name && !updates.display_name) {
    updates.display_name = ppData.display_name;
  }
  
  if (ppData.number && !updates.pp_matter_number) {
    updates.pp_matter_number = ppData.number;
  }
  
  if (ppData.status && !updates.pp_matter_status) {
    updates.pp_matter_status = ppData.status;
  }
  
  if (ppData.assigned_to_users && ppData.assigned_to_users.length > 0) {
    updates.pp_responsible_attorney = ppData.assigned_to_users[0].display_name;
  }

  // Extract custom field values to individual columns
  if (ppData.custom_field_values && Array.isArray(ppData.custom_field_values)) {
    const customFieldMappings = {
      'Exchange Type': 'type_of_exchange',
      'Client Vesting': 'client_vesting',
      'Banking Institution': 'bank',
      'Proceeds': 'proceeds',
      'Exchange Proceeds': 'proceeds',
      'Day 45': 'day_45',
      'Day 180': 'day_180',
      'Rel Property Address': 'rel_property_address',
      'Rel Value': 'rel_value',
      'Relinquished Value': 'rel_value',
      'Rel APN': 'rel_apn',
      'Rel Escrow Number': 'rel_escrow_number',
      'Rel Contract Date': 'rel_contract_date',
      'Close of Escrow Date': 'close_of_escrow_date',
      'Rep 1 Property Address': 'rep_1_property_address',
      'Rep 1 Value': 'rep_1_value',
      'Replacement Value': 'rep_1_value',
      'Rep 1 APN': 'rep_1_apn',
      'Rep 1 Escrow Number': 'rep_1_escrow_number',
      'Rep 1 Purchase Contract Date': 'rep_1_purchase_contract_date',
      'Rep 1 Seller 1 Name': 'rep_1_seller_1_name',
      'Rep 1 Seller 2 Name': 'rep_1_seller_2_name',
      'Buyer 1 Name': 'buyer_1_name',
      'Buyer 2 Name': 'buyer_2_name',
      'Rel Purchase Contract Title': 'rel_purchase_contract_title',
      'Rep 1 Purchase Contract Title': 'rep_1_purchase_contract_title'
    };

    ppData.custom_field_values.forEach(field => {
      const label = field.custom_field_ref?.label;
      const columnName = customFieldMappings[label];
      
      if (columnName && label) {
        const value = field.value_string || field.value_number || field.value_date_time || 
                     (field.contact_ref ? field.contact_ref.display_name : field.value_boolean);
        
        if (value !== null && value !== undefined && value !== '') {
          updates[columnName] = value;
        }
      }
    });
  }

  // Add extraction timestamp
  updates.last_sync_at = new Date().toISOString();

  return updates;
}

/**
 * Process a single exchange and update its columns
 */
async function processExchange(exchange) {
  try {
    console.log(`\n📝 Processing exchange ${exchange.id} (Matter: ${exchange.pp_matter_id})`);
    
    // Extract PP data to column updates
    const updates = extractPPDataToColumns(exchange.pp_data);
    
    if (Object.keys(updates).length === 0) {
      console.log('  ⚠️  No PP data to extract');
      return { action: 'skipped', reason: 'no_pp_data' };
    }
    
    console.log(`  🔄 Extracted ${Object.keys(updates).length} fields:`, Object.keys(updates).join(', '));
    
    // Update the exchange
    const { data, error } = await supabase
      .from('exchanges')
      .update(updates)
      .eq('id', exchange.id)
      .select();

    if (error) {
      console.error('  ❌ Update failed:', error.message);
      return { action: 'error', error: error.message };
    }

    console.log('  ✅ Updated successfully');
    return { action: 'updated', updates: Object.keys(updates).length };

  } catch (error) {
    console.error(`  ❌ Processing error:`, error.message);
    return { action: 'error', error: error.message };
  }
}

/**
 * Main function to fix exchange data mapping
 */
async function fixExchangeDataMapping() {
  console.log('🚀 Starting Exchange Data Mapping Fix...\n');
  
  try {
    // Get exchanges that have pp_data but might be missing individual field data
    const { data: exchanges, error } = await supabase
      .from('exchanges')
      .select('id, pp_matter_id, display_name, pp_data, rel_property_address, buyer_1_name')
      .not('pp_data', 'eq', '{}')
      .not('pp_data', 'is', null);

    if (error) {
      console.error('❌ Error fetching exchanges:', error);
      process.exit(1);
    }

    console.log(`📊 Found ${exchanges.length} exchanges with PP data\n`);

    const stats = {
      processed: 0,
      updated: 0,
      skipped: 0,
      errors: 0
    };

    // Process each exchange
    for (const exchange of exchanges) {
      const result = await processExchange(exchange);
      
      stats.processed++;
      if (result.action === 'updated') stats.updated++;
      else if (result.action === 'skipped') stats.skipped++;
      else if (result.action === 'error') stats.errors++;
      
      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Final summary
    console.log('\n=== FINAL SUMMARY ===');
    console.log(`📊 Processed: ${stats.processed}`);
    console.log(`✅ Updated: ${stats.updated}`);
    console.log(`⏭️  Skipped: ${stats.skipped}`);
    console.log(`❌ Errors: ${stats.errors}`);
    
    if (stats.updated > 0) {
      console.log('\n🎉 Success! Exchange data has been extracted from PP data to individual columns.');
      console.log('   Frontend components should now display complete exchange information.');
    } else {
      console.log('\n⚠️  No exchanges were updated. Check if PP data contains expected custom fields.');
    }

  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  fixExchangeDataMapping()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = {
  fixExchangeDataMapping,
  extractPPDataToColumns,
  getPPValue
};