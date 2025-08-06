#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function analyzeTableData() {
  console.log('🔍 Analyzing table data vs PP structure...\n');
  
  // Check exchanges
  const { data: exchanges } = await supabase
    .from('exchanges')
    .select('id, name, status, client_id, coordinator_id, start_date, completion_date, pp_data')
    .limit(5);
    
  console.log('EXCHANGES TABLE ANALYSIS:');
  console.log('Total exchanges checked:', exchanges.length);
  
  const emptyPPData = exchanges.filter(e => !e.pp_data || Object.keys(e.pp_data).length === 0);
  const withPPData = exchanges.filter(e => e.pp_data && Object.keys(e.pp_data).length > 0);
  
  console.log('- Empty pp_data:', emptyPPData.length);
  console.log('- With pp_data:', withPPData.length);
  
  exchanges.forEach((ex, idx) => {
    console.log(`\n  Exchange ${idx + 1}:`, ex.name);
    console.log('  - Status (our field):', ex.status);
    console.log('  - client_id (our field):', ex.client_id);
    console.log('  - start_date (our field):', ex.start_date);
    console.log('  - completion_date (our field):', ex.completion_date);
    
    if (ex.pp_data && Object.keys(ex.pp_data).length > 0) {
      console.log('  - PP status:', ex.pp_data.status);
      console.log('  - PP open_date:', ex.pp_data.open_date);  
      console.log('  - PP close_date:', ex.pp_data.close_date);
      console.log('  - PP account_ref:', ex.pp_data.account_ref?.display_name);
    }
  });
  
  // Check contacts
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, email, phone, company, address, pp_data')
    .limit(5);
    
  console.log('\n\nCONTACTS TABLE ANALYSIS:');
  console.log('Total contacts checked:', contacts.length);
  
  const emptyContactPPData = contacts.filter(c => !c.pp_data || Object.keys(c.pp_data).length === 0);
  const withContactPPData = contacts.filter(c => c.pp_data && Object.keys(c.pp_data).length > 0);
  
  console.log('- Empty pp_data:', emptyContactPPData.length);
  console.log('- With pp_data:', withContactPPData.length);
  
  contacts.forEach((contact, idx) => {
    console.log(`\n  Contact ${idx + 1}:`, contact.first_name, contact.last_name);
    console.log('  - Our fields: email =', contact.email, ', phone =', contact.phone);
    console.log('  - Our fields: company =', contact.company);
    
    if (contact.pp_data && Object.keys(contact.pp_data).length > 0) {
      console.log('  - PP email:', contact.pp_data.email);
      console.log('  - PP phone:', contact.pp_data.phone);
      console.log('  - PP company:', contact.pp_data.company);
      console.log('  - PP data keys:', Object.keys(contact.pp_data));
    }
  });
}

analyzeTableData().catch(console.error);