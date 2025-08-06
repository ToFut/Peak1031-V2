#!/usr/bin/env node

/**
 * Extract ALL PP data from CONTACTS table pp_data field
 * and populate structured columns
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function extractContactPPData(pp_data) {
  if (!pp_data) return {};
  
  const extracted = {};
  
  // Extract main PP fields
  if (pp_data.email && !extracted.email) extracted.email = pp_data.email;
  if (pp_data.first_name) extracted.first_name = pp_data.first_name;
  if (pp_data.last_name) extracted.last_name = pp_data.last_name;
  if (pp_data.middle_name) extracted.middle_name = pp_data.middle_name;
  if (pp_data.contact_type) extracted.contact_type = pp_data.contact_type;
  if (pp_data.display_name) extracted.display_name = pp_data.display_name;
  if (pp_data.is_primary_contact !== undefined) extracted.is_primary_contact = pp_data.is_primary_contact;
  
  // Extract phone numbers (prioritize mobile, then work, then home, then fax)
  if (!extracted.phone) {
    const phone = pp_data.phone_mobile || pp_data.phone_work || pp_data.phone_home || pp_data.phone_fax;
    if (phone) extracted.phone = phone;
  }
  
  // Extract all phone types
  if (pp_data.phone_mobile) extracted.phone_mobile = pp_data.phone_mobile;
  if (pp_data.phone_work) extracted.phone_work = pp_data.phone_work;
  if (pp_data.phone_home) extracted.phone_home = pp_data.phone_home;
  if (pp_data.phone_fax) extracted.phone_fax = pp_data.phone_fax;
  
  // Extract company from account_ref
  if (!extracted.company && pp_data.account_ref?.display_name) {
    extracted.company = pp_data.account_ref.display_name;
  }
  
  // Extract account reference info
  if (pp_data.account_ref) {
    extracted.account_ref_id = pp_data.account_ref.id;
    extracted.account_ref_name = pp_data.account_ref.display_name;
  }
  
  // Extract custom field values if they exist
  if (pp_data.custom_field_values && Array.isArray(pp_data.custom_field_values)) {
    pp_data.custom_field_values.forEach(cf => {
      if (cf.custom_field_ref && cf.custom_field_ref.label) {
        const label = cf.custom_field_ref.label;
        const value = cf.value_string || cf.value_number || cf.value_boolean || cf.value_date_time;
        
        // Map common custom fields
        switch (label.toLowerCase()) {
          case 'address':
          case 'street address':
            if (value) extracted.address_street = value.substring(0, 500);
            break;
          case 'city':
            if (value) extracted.address_city = value.substring(0, 100);
            break;
          case 'state':
            if (value) extracted.address_state = value.substring(0, 10);
            break;
          case 'zip':
          case 'zip code':
            if (value) extracted.address_zip_code = value.substring(0, 20);
            break;
          case 'country':
            if (value) extracted.address_country = value.substring(0, 50);
            break;
        }
      }
    });
  }
  
  return extracted;
}

async function addContactsColumns() {
  console.log('🔧 First, let me check what columns need to be added...\n');
  
  // Check current CONTACTS table structure
  const { data: sample } = await supabase.from('contacts').select('*').limit(1);
  const currentColumns = new Set(Object.keys(sample[0]));
  
  console.log('Current CONTACTS columns:', [...currentColumns].sort());
  
  // Columns we want to add
  const desiredColumns = [
    'middle_name',
    'contact_type', 
    'display_name',
    'is_primary_contact',
    'phone_mobile',
    'phone_work', 
    'phone_home',
    'phone_fax',
    'account_ref_id',
    'account_ref_name'
  ];
  
  const columnsToAdd = desiredColumns.filter(col => !currentColumns.has(col));
  
  if (columnsToAdd.length > 0) {
    console.log('\\n⚠️  REQUIRED: Add these columns to CONTACTS table first:');
    console.log('Run this SQL in Supabase:');
    console.log('');
    console.log('-- Add missing columns to contacts table');
    console.log('ALTER TABLE contacts ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100);');
    console.log('ALTER TABLE contacts ADD COLUMN IF NOT EXISTS contact_type VARCHAR(50);');
    console.log('ALTER TABLE contacts ADD COLUMN IF NOT EXISTS display_name VARCHAR(500);'); 
    console.log('ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_primary_contact BOOLEAN;');
    console.log('ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone_mobile VARCHAR(50);');
    console.log('ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone_work VARCHAR(50);');
    console.log('ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone_home VARCHAR(50);');
    console.log('ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone_fax VARCHAR(50);');
    console.log('ALTER TABLE contacts ADD COLUMN IF NOT EXISTS account_ref_id UUID;');
    console.log('ALTER TABLE contacts ADD COLUMN IF NOT EXISTS account_ref_name VARCHAR(200);');
    console.log('');
    console.log('After running the SQL above, run this script again.');
    return false;
  }
  
  console.log('✅ All required columns exist!');
  return true;
}

async function populateContactsPPData() {
  console.log('🚀 Starting CONTACTS PP data extraction...\n');
  
  // Check if columns exist first
  const columnsReady = await addContactsColumns();
  if (!columnsReady) return;
  
  // Get all contacts with PP data in batches
  const BATCH_SIZE = 50;
  let offset = 0;
  let totalProcessed = 0;
  let totalUpdated = 0;
  
  while (true) {
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email, phone, company, pp_data')
      .not('pp_data', 'is', null)
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) {
      console.error('Error fetching contacts:', error);
      break;
    }
    
    if (!contacts || contacts.length === 0) {
      console.log('No more contacts to process');
      break;
    }

    console.log(`Processing batch ${Math.floor(offset/BATCH_SIZE) + 1}: ${contacts.length} contacts`);

    for (const contact of contacts) {
      try {
        const extractedData = extractContactPPData(contact.pp_data);
        
        // Only update fields that are empty/null in the current record
        const updateData = {};
        
        Object.entries(extractedData).forEach(([key, value]) => {
          if (value && !contact[key]) {  // Only update if current field is empty
            updateData[key] = value;
          }
        });

        // Update contact if we have data
        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from('contacts')
            .update(updateData)
            .eq('id', contact.id);

          if (updateError) {
            console.error(`❌ Error updating ${contact.first_name} ${contact.last_name}:`, updateError.message);
          } else {
            totalUpdated++;
            if (totalUpdated <= 10) {
              console.log(`✅ Updated: ${contact.first_name} ${contact.last_name}`);
              console.log(`   Fields: ${Object.keys(updateData).join(', ')}`);
            }
          }
        }

        totalProcessed++;
        
      } catch (err) {
        console.error(`❌ Error processing contact ${contact.id}:`, err.message);
      }
    }

    offset += BATCH_SIZE;
    
    // Show progress
    console.log(`Progress: ${totalProcessed} processed, ${totalUpdated} updated\\n`);
  }

  console.log(`\\n📊 FINAL RESULTS:`);
  console.log(`   Total processed: ${totalProcessed}`);
  console.log(`   Total updated: ${totalUpdated}`);
  console.log(`   Success rate: ${((totalUpdated/totalProcessed)*100).toFixed(1)}%`);
  
  // Verify results
  await verifyContactsResults();
}

async function verifyContactsResults() {
  console.log('\\n🔍 Verifying contacts results...\\n');
  
  // Check how many records have the new fields populated
  const fieldsToCheck = ['contact_type', 'phone_mobile', 'phone_work', 'display_name', 'account_ref_name'];
  
  for (const field of fieldsToCheck) {
    try {
      const { count } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .not(field, 'is', null);
      
      console.log(`✅ ${field}: ${count} records populated`);
    } catch (err) {
      console.log(`⚠️  ${field}: Column may not exist yet - ${err.message}`);
    }
  }
  
  // Show sample record
  try {
    const { data: sample } = await supabase
      .from('contacts')
      .select('first_name, last_name, email, phone, phone_mobile, contact_type, display_name, account_ref_name')
      .not('contact_type', 'is', null)
      .limit(1);
      
    if (sample && sample[0]) {
      console.log('\\n📋 SAMPLE POPULATED CONTACT:');
      const contact = sample[0];
      console.log(`   Name: ${contact.first_name} ${contact.last_name}`);
      console.log(`   Email: ${contact.email}`);
      console.log(`   Phone: ${contact.phone}`);
      console.log(`   Phone Mobile: ${contact.phone_mobile}`);
      console.log(`   Contact Type: ${contact.contact_type}`);
      console.log(`   Display Name: ${contact.display_name}`);
      console.log(`   Account Ref: ${contact.account_ref_name}`);
    }
  } catch (err) {
    console.log('Could not retrieve sample record - columns may not exist yet');
  }
}

populateContactsPPData();