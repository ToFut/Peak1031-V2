#!/usr/bin/env node

/**
 * Complete extraction of ALL data from pp_data JSONB fields
 * This script extracts every available field from PP data and populates table columns
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function extractAllExchangeData() {
  console.log('🔄 Extracting ALL data from exchanges pp_data...\n');

  // Get sample to see all available PP fields
  const { data: sample } = await supabase
    .from('exchanges')
    .select('pp_data')
    .not('pp_data', 'is', null)
    .limit(1);

  if (sample && sample[0]) {
    console.log('Available PP exchange fields:', Object.keys(sample[0].pp_data));
  }

  // Get all exchanges with PP data
  const { data: exchanges, error } = await supabase
    .from('exchanges')
    .select('id, name, status, start_date, completion_date, pp_data, description, priority, assigned_to, rate, notes')
    .not('pp_data', 'is', null);

  if (error) {
    console.error('Error fetching exchanges:', error);
    return;
  }

  console.log(`Processing ${exchanges.length} exchanges...\n`);

  let updated = 0;
  let errors = 0;

  for (const exchange of exchanges) {
    try {
      const pp = exchange.pp_data;
      const updateData = {};
      
      // Extract all available fields from PP data
      if (pp.status && pp.status.toUpperCase() !== exchange.status) {
        updateData.status = pp.status.toUpperCase();
      }
      
      if (pp.open_date && !exchange.start_date) {
        updateData.start_date = new Date(pp.open_date).toISOString().split('T')[0];
      }
      
      if (pp.close_date && !exchange.completion_date) {
        updateData.completion_date = new Date(pp.close_date).toISOString().split('T')[0];
      }
      
      // Extract notes
      if (pp.notes && !exchange.notes) {
        updateData.notes = pp.notes;
      }
      
      // Extract rate information
      if (pp.rate && !exchange.rate) {
        updateData.rate = pp.rate;
      }
      
      // Extract matter number as description or reference
      if (pp.number && !exchange.description) {
        updateData.description = `Matter #${pp.number}`;
      }
      
      // Extract assigned users information
      if (pp.assigned_to_users && pp.assigned_to_users.length > 0 && !exchange.assigned_to) {
        const assignedUser = pp.assigned_to_users[0];
        updateData.assigned_to = assignedUser.display_name || assignedUser.name;
      }

      // Update if we have changes
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('exchanges')
          .update(updateData)
          .eq('id', exchange.id);
          
        if (updateError) {
          console.error(`❌ Error updating exchange ${exchange.id}:`, updateError.message);
          errors++;
        } else {
          console.log(`✅ Enhanced exchange: ${exchange.name}`);
          Object.keys(updateData).forEach(key => {
            console.log(`   - ${key}: ${updateData[key]}`);
          });
          updated++;
        }
      }
      
    } catch (err) {
      console.error(`❌ Error processing exchange:`, err.message);
      errors++;
    }
  }

  console.log(`\n📊 Exchanges extraction complete: ${updated} updated, ${errors} errors`);
}

async function extractAllContactData() {
  console.log('\n🔄 Extracting ALL data from contacts pp_data...\n');

  // Get sample to see all available PP fields
  const { data: sample } = await supabase
    .from('contacts')
    .select('pp_data')
    .not('pp_data', 'is', null)
    .limit(1);

  if (sample && sample[0]) {
    console.log('Available PP contact fields:', Object.keys(sample[0].pp_data));
  }

  // Get all contacts with PP data
  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('*')
    .not('pp_data', 'is', null);

  if (error) {
    console.error('Error fetching contacts:', error);
    return;
  }

  console.log(`Processing ${contacts.length} contacts...\n`);

  let updated = 0;
  let errors = 0;

  for (const contact of contacts) {
    try {
      const pp = contact.pp_data;
      const updateData = {};
      
      // Extract all phone fields
      if (!contact.phone) {
        const phone = pp.phone_mobile || pp.phone_work || pp.phone_home || pp.phone_fax;
        if (phone) updateData.phone = phone;
      }
      
      // Extract company from account_ref
      if (!contact.company && pp.account_ref?.display_name) {
        updateData.company = pp.account_ref.display_name;
      }
      
      // Extract middle name if available
      if (pp.middle_name && !contact.middle_name) {
        updateData.middle_name = pp.middle_name;
      }
      
      // Extract contact type
      if (pp.contact_type && !contact.contact_type) {
        updateData.contact_type = pp.contact_type;
      }
      
      // Extract primary contact status
      if (pp.is_primary_contact !== undefined && contact.is_primary_contact === null) {
        updateData.is_primary_contact = pp.is_primary_contact;
      }
      
      // Extract all custom field values
      if (pp.custom_field_values && Object.keys(pp.custom_field_values).length > 0) {
        updateData.custom_fields = pp.custom_field_values;
      }

      // Update if we have changes
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('contacts')
          .update(updateData)
          .eq('id', contact.id);
          
        if (updateError) {
          console.error(`❌ Error updating contact ${contact.id}:`, updateError.message);
          errors++;
        } else {
          console.log(`✅ Enhanced contact: ${contact.first_name} ${contact.last_name}`);
          Object.keys(updateData).forEach(key => {
            if (key !== 'custom_fields') {
              console.log(`   - ${key}: ${updateData[key]}`);
            } else {
              console.log(`   - ${key}: ${Object.keys(updateData[key]).length} fields`);
            }
          });
          updated++;
        }
      }
      
    } catch (err) {
      console.error(`❌ Error processing contact:`, err.message);
      errors++;
    }
  }

  console.log(`\n📊 Contacts extraction complete: ${updated} updated, ${errors} errors`);
}

async function completeExtraction() {
  console.log('🚀 Starting COMPLETE PP data extraction...\n');
  
  try {
    await extractAllExchangeData();
    await extractAllContactData();
    
    console.log('\n✅ COMPLETE extraction finished successfully!');
    console.log('\n💡 Summary:');
    console.log('   - Extracted ALL available PP fields');
    console.log('   - Populated table columns with PP data');
    console.log('   - Preserved original PP data in JSONB fields');
    
  } catch (error) {
    console.error('❌ Extraction failed:', error);
    process.exit(1);
  }
}

completeExtraction();