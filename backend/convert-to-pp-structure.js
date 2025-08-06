#!/usr/bin/env node

/**
 * Convert database tables to follow PracticePanther data structure
 * This script updates existing records to use PP data instead of empty local fields
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function convertExchangesToPPStructure() {
  console.log('🔄 Converting exchanges to follow PP data structure...\n');

  // Get all exchanges with PP data
  const { data: exchanges, error } = await supabase
    .from('exchanges')
    .select('id, name, status, start_date, completion_date, pp_data')
    .not('pp_data', 'is', null);

  if (error) {
    console.error('Error fetching exchanges:', error);
    return;
  }

  console.log(`Found ${exchanges.length} exchanges to convert`);

  let conversions = 0;
  let errors = 0;

  for (const exchange of exchanges) {
    try {
      const ppData = exchange.pp_data;
      
      // Prepare update data based on PP structure
      const updateData = {};
      
      // Convert status from PP data
      if (ppData.status && ppData.status !== exchange.status) {
        updateData.status = ppData.status.toUpperCase();
      }
      
      // Convert dates from PP data
      if (ppData.open_date && !exchange.start_date) {
        updateData.start_date = new Date(ppData.open_date).toISOString().split('T')[0];
      }
      
      if (ppData.close_date && !exchange.completion_date) {
        updateData.completion_date = new Date(ppData.close_date).toISOString().split('T')[0];
      }
      
      // Update exchange if we have changes
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('exchanges')
          .update(updateData)
          .eq('id', exchange.id);
          
        if (updateError) {
          console.error(`Error updating exchange ${exchange.id}:`, updateError);
          errors++;
        } else {
          console.log(`✅ Updated exchange: ${exchange.name}`);
          console.log(`   - Status: ${exchange.status} → ${updateData.status || exchange.status}`);
          console.log(`   - Start date: ${exchange.start_date} → ${updateData.start_date || exchange.start_date}`);
          console.log(`   - Completion date: ${exchange.completion_date} → ${updateData.completion_date || exchange.completion_date}`);
          conversions++;
        }
      } else {
        console.log(`⏭️  No changes needed for: ${exchange.name}`);
      }
      
    } catch (err) {
      console.error(`Error processing exchange ${exchange.id}:`, err);
      errors++;
    }
  }

  console.log(`\n📊 Exchanges conversion complete:`);
  console.log(`   - Converted: ${conversions}`);
  console.log(`   - Errors: ${errors}`);
}

async function convertContactsToPPStructure() {
  console.log('\n🔄 Converting contacts to follow PP data structure...\n');

  // Get all contacts with PP data
  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, email, phone, company, address_street, address_city, address_state, pp_data')
    .not('pp_data', 'is', null);

  if (error) {
    console.error('Error fetching contacts:', error);
    return;
  }

  console.log(`Found ${contacts.length} contacts to convert`);

  let conversions = 0;
  let errors = 0;

  for (const contact of contacts) {
    try {
      const ppData = contact.pp_data;
      
      // Prepare update data based on PP structure
      const updateData = {};
      
      // Use PP phone data (prioritize mobile, then work, then home)
      if (!contact.phone) {
        const phone = ppData.phone_mobile || ppData.phone_work || ppData.phone_home;
        if (phone) {
          updateData.phone = phone;
        }
      }
      
      // Use PP company data from account_ref
      if (!contact.company && ppData.account_ref?.display_name) {
        updateData.company = ppData.account_ref.display_name;
      }
      
      // Update contact if we have changes
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('contacts')
          .update(updateData)
          .eq('id', contact.id);
          
        if (updateError) {
          console.error(`Error updating contact ${contact.id}:`, updateError);
          errors++;
        } else {
          console.log(`✅ Updated contact: ${contact.first_name} ${contact.last_name}`);
          console.log(`   - Phone: ${contact.phone || 'null'} → ${updateData.phone || contact.phone}`);
          console.log(`   - Company: ${contact.company || 'null'} → ${updateData.company || contact.company}`);
          conversions++;
        }
      } else {
        console.log(`⏭️  No changes needed for: ${contact.first_name} ${contact.last_name}`);
      }
      
    } catch (err) {
      console.error(`Error processing contact ${contact.id}:`, err);
      errors++;
    }
  }

  console.log(`\n📊 Contacts conversion complete:`);
  console.log(`   - Converted: ${conversions}`);
  console.log(`   - Errors: ${errors}`);
}

async function convertDatabase() {
  console.log('🚀 Starting database conversion to PP structure...\n');
  
  try {
    await convertExchangesToPPStructure();
    await convertContactsToPPStructure();
    
    console.log('\n✅ Database conversion completed successfully!');
    console.log('\n💡 Summary:');
    console.log('   - Exchanges now use PP status and date fields');
    console.log('   - Contacts now use PP phone and company data');
    console.log('   - All original PP data preserved in pp_data JSONB field');
    
  } catch (error) {
    console.error('❌ Conversion failed:', error);
    process.exit(1);
  }
}

// Run conversion
convertDatabase();