#!/usr/bin/env node

/**
 * Verify the conversion results
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function verifyConversion() {
  console.log('🔍 Verifying conversion results...\n');

  // Check exchanges
  const { data: exchanges } = await supabase
    .from('exchanges')
    .select('id, name, status, start_date, completion_date, pp_data')
    .limit(10);

  console.log('EXCHANGES VERIFICATION:');
  exchanges.forEach((ex, idx) => {
    console.log(`\n${idx + 1}. ${ex.name}`);
    console.log(`   - Status: ${ex.status} (PP: ${ex.pp_data?.status})`);
    console.log(`   - Start: ${ex.start_date} (PP open: ${ex.pp_data?.open_date})`);
    console.log(`   - Complete: ${ex.completion_date} (PP close: ${ex.pp_data?.close_date})`);
  });

  // Check contacts
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, phone, company, pp_data')
    .limit(10);

  console.log('\n\nCONTACTS VERIFICATION:');
  contacts.forEach((contact, idx) => {
    console.log(`\n${idx + 1}. ${contact.first_name} ${contact.last_name}`);
    console.log(`   - Phone: ${contact.phone || 'null'} (PP: ${contact.pp_data?.phone_mobile || contact.pp_data?.phone_work || 'null'})`);
    console.log(`   - Company: ${contact.company || 'null'} (PP: ${contact.pp_data?.account_ref?.display_name || 'null'})`);
  });

  // Summary stats
  const { count: totalExchanges } = await supabase
    .from('exchanges')
    .select('*', { count: 'exact', head: true });

  const { count: closedExchanges } = await supabase
    .from('exchanges')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'CLOSED');

  const { count: contactsWithPhone } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .not('phone', 'is', null);

  const { count: contactsWithCompany } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .not('company', 'is', null);

  console.log('\n\n📊 CONVERSION SUMMARY:');
  console.log(`- Total exchanges: ${totalExchanges}`);
  console.log(`- Closed exchanges: ${closedExchanges} (${((closedExchanges/totalExchanges)*100).toFixed(1)}%)`);
  console.log(`- Contacts with phone: ${contactsWithPhone}`);
  console.log(`- Contacts with company: ${contactsWithCompany}`);
}

verifyConversion().catch(console.error);