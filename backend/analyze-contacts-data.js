#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function analyzeContactsData() {
  console.log('🔍 Analyzing contacts data...\n');
  
  // Check contacts
  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, email, phone, company, address_street, address_city, address_state, pp_data')
    .limit(5);
    
  if (error) {
    console.error('Error fetching contacts:', error);
    return;
  }
  
  console.log('CONTACTS TABLE ANALYSIS:');
  console.log('Total contacts checked:', contacts ? contacts.length : 0);
  
  if (!contacts || contacts.length === 0) {
    console.log('No contacts found in database');
    return;
  }
  
  const emptyContactPPData = contacts.filter(c => !c.pp_data || Object.keys(c.pp_data).length === 0);
  const withContactPPData = contacts.filter(c => c.pp_data && Object.keys(c.pp_data).length > 0);
  
  console.log('- Empty pp_data:', emptyContactPPData.length);
  console.log('- With pp_data:', withContactPPData.length);
  
  contacts.forEach((contact, idx) => {
    console.log(`\n  Contact ${idx + 1}:`, contact.first_name, contact.last_name);
    console.log('  - Our fields: email =', contact.email, ', phone =', contact.phone);
    console.log('  - Our fields: company =', contact.company);
    console.log('  - Our fields: address =', contact.address_street, contact.address_city, contact.address_state);
    
    if (contact.pp_data && Object.keys(contact.pp_data).length > 0) {
      console.log('  - PP email:', contact.pp_data.email);
      console.log('  - PP phone:', contact.pp_data.phone);
      console.log('  - PP company:', contact.pp_data.company);
      console.log('  - PP data keys:', Object.keys(contact.pp_data));
    } else {
      console.log('  - No PP data available');
    }
  });
}

analyzeContactsData().catch(console.error);