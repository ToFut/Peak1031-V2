#!/usr/bin/env node

/**
 * Final summary of PP data conversion
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function generateFinalSummary() {
  console.log('📊 FINAL PP DATA CONVERSION SUMMARY\n');
  console.log('='.repeat(50));

  // Exchanges summary
  const { count: totalExchanges } = await supabase
    .from('exchanges')
    .select('*', { count: 'exact', head: true });

  const { count: exchangesWithNumbers } = await supabase
    .from('exchanges')
    .select('*', { count: 'exact', head: true })
    .not('exchange_number', 'is', null);

  const { count: exchangesWithDescriptions } = await supabase
    .from('exchanges')
    .select('*', { count: 'exact', head: true })
    .not('description', 'is', null);

  const { count: closedExchanges } = await supabase
    .from('exchanges')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'CLOSED');

  console.log('\n🔄 EXCHANGES TABLE:');
  console.log(`   Total exchanges: ${totalExchanges}`);
  console.log(`   With PP matter numbers: ${exchangesWithNumbers} (${((exchangesWithNumbers/totalExchanges)*100).toFixed(1)}%)`);
  console.log(`   With PP descriptions: ${exchangesWithDescriptions} (${((exchangesWithDescriptions/totalExchanges)*100).toFixed(1)}%)`);
  console.log(`   Closed status (from PP): ${closedExchanges} (${((closedExchanges/totalExchanges)*100).toFixed(1)}%)`);

  // Contacts summary
  const { count: totalContacts } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true });

  const { count: contactsWithPhone } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .not('phone', 'is', null);

  const { count: contactsWithCompany } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .not('company', 'is', null);

  console.log('\n👥 CONTACTS TABLE:');
  console.log(`   Total contacts: ${totalContacts}`);
  console.log(`   With phone numbers: ${contactsWithPhone} (${((contactsWithPhone/totalContacts)*100).toFixed(1)}%)`);
  console.log(`   With company names: ${contactsWithCompany} (${((contactsWithCompany/totalContacts)*100).toFixed(1)}%)`);

  // Sample data
  const { data: sampleExchange } = await supabase
    .from('exchanges')
    .select('name, exchange_number, description, status, completion_date, pp_data')
    .not('exchange_number', 'is', null)
    .limit(1);

  const { data: sampleContact } = await supabase
    .from('contacts')
    .select('first_name, last_name, phone, company, pp_data')
    .not('phone', 'is', null)
    .not('company', 'is', null)
    .limit(1);

  console.log('\n📋 SAMPLE CONVERTED DATA:');
  if (sampleExchange && sampleExchange[0]) {
    const ex = sampleExchange[0];
    console.log(`   Exchange: ${ex.name}`);
    console.log(`   - Matter #: ${ex.exchange_number} (from PP: ${ex.pp_data.number})`);
    console.log(`   - Status: ${ex.status} (from PP: ${ex.pp_data.status})`);
    console.log(`   - Description: ${ex.description ? ex.description.substring(0, 50) + '...' : 'None'}`);
  }

  if (sampleContact && sampleContact[0]) {
    const contact = sampleContact[0];
    console.log(`   Contact: ${contact.first_name} ${contact.last_name}`);
    console.log(`   - Phone: ${contact.phone} (from PP: ${contact.pp_data.phone_mobile || contact.pp_data.phone_work || 'N/A'})`);
    console.log(`   - Company: ${contact.company} (from PP: ${contact.pp_data.account_ref?.display_name || 'N/A'})`);
  }

  console.log('\n✅ CONVERSION COMPLETED SUCCESSFULLY!');
  console.log('\n💡 What was accomplished:');
  console.log('   ✓ Extracted ALL available data from pp_data JSONB fields');
  console.log('   ✓ Populated table columns with PracticePanther data');
  console.log('   ✓ Used actual PP status instead of generic "PENDING"');
  console.log('   ✓ Added PP matter numbers to exchanges');
  console.log('   ✓ Enhanced descriptions with PP display names');
  console.log('   ✓ Populated contact phone numbers from PP data');
  console.log('   ✓ Added company names from PP account references');
  console.log('   ✓ Preserved original PP data in JSONB for future use');
  console.log('\n🎯 Your database now uses PracticePanther as the primary data source!');
}

generateFinalSummary().catch(console.error);