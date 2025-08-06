#!/usr/bin/env node

/**
 * Corrected extraction using only existing table columns
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function extractExchangeDataCorrect() {
  console.log('🔄 Extracting exchange data using existing columns...\n');

  // Get all exchanges with PP data
  const { data: exchanges, error } = await supabase
    .from('exchanges')
    .select('id, name, status, start_date, completion_date, description, priority, pp_data, exchange_number, exchange_type, exchange_value')
    .not('pp_data', 'is', null);

  if (error) {
    console.error('Error fetching exchanges:', error);
    return;
  }

  console.log(`Processing ${exchanges.length} exchanges...\n`);

  let updated = 0;

  for (const exchange of exchanges) {
    try {
      const pp = exchange.pp_data;
      const updateData = {};
      
      // Use PP matter number for exchange_number
      if (pp.number && !exchange.exchange_number) {
        updateData.exchange_number = pp.number.toString();
      }
      
      // Extract description from PP display_name
      if (pp.display_name && !exchange.description) {
        updateData.description = pp.display_name;
      }
      
      // Set exchange_type based on PP data presence
      if (!exchange.exchange_type) {
        updateData.exchange_type = 'Real Estate'; // Default based on PP context
      }

      // Update if we have changes
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('exchanges')
          .update(updateData)
          .eq('id', exchange.id);
          
        if (updateError) {
          console.error(`❌ Error updating exchange ${exchange.id}:`, updateError.message);
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
    }
  }

  console.log(`\n📊 Exchanges: ${updated} updated successfully`);
}

async function extractContactDataCorrect() {
  console.log('\n🔄 Extracting contact data using existing columns...\n');

  // Get all contacts with PP data that don't have phone or company
  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, phone, company, pp_data')
    .not('pp_data', 'is', null)
    .limit(100); // Process in batches

  if (error) {
    console.error('Error fetching contacts:', error);
    return;
  }

  console.log(`Processing ${contacts.length} contacts...\n`);

  let updated = 0;

  for (const contact of contacts) {
    try {
      const pp = contact.pp_data;
      const updateData = {};
      
      // Extract phone (only if current phone is null/empty)
      if (!contact.phone) {
        const phone = pp.phone_mobile || pp.phone_work || pp.phone_home;
        if (phone) updateData.phone = phone;
      }
      
      // Extract company from account_ref (only if current company is null/empty)
      if (!contact.company && pp.account_ref?.display_name) {
        updateData.company = pp.account_ref.display_name;
      }

      // Update if we have changes
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('contacts')
          .update(updateData)
          .eq('id', contact.id);
          
        if (updateError) {
          console.error(`❌ Error updating contact ${contact.id}:`, updateError.message);
        } else {
          console.log(`✅ Enhanced contact: ${contact.first_name} ${contact.last_name}`);
          Object.keys(updateData).forEach(key => {
            console.log(`   - ${key}: ${updateData[key]}`);
          });
          updated++;
        }
      }
      
    } catch (err) {
      console.error(`❌ Error processing contact:`, err.message);
    }
  }

  console.log(`\n📊 Contacts: ${updated} updated successfully`);
}

async function runCorrectExtraction() {
  console.log('🚀 Starting corrected PP data extraction...\n');
  
  try {
    await extractExchangeDataCorrect();
    await extractContactDataCorrect();
    
    console.log('\n✅ Corrected extraction completed!');
    
  } catch (error) {
    console.error('❌ Extraction failed:', error);
  }
}

runCorrectExtraction();