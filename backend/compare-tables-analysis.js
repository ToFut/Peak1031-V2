#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function compareTablesAndPP() {
  console.log('🔍 Comparing PEOPLE vs CONTACTS vs Original PP...\n');
  
  // Get sample from each table
  const { data: people } = await supabase.from('people').select('*').limit(5);
  const { data: contacts } = await supabase.from('contacts').select('*').limit(5);
  
  console.log('📊 TABLE STRUCTURES:');
  console.log('PEOPLE columns  :', Object.keys(people[0]).sort());
  console.log('CONTACTS columns:', Object.keys(contacts[0]).sort());
  
  // Find unique columns
  const peopleColumns = new Set(Object.keys(people[0]));
  const contactColumns = new Set(Object.keys(contacts[0]));
  
  const onlyInPeople = [...peopleColumns].filter(col => !contactColumns.has(col));
  const onlyInContacts = [...contactColumns].filter(col => !peopleColumns.has(col));
  const commonColumns = [...peopleColumns].filter(col => contactColumns.has(col));
  
  console.log('\n🔍 COLUMN DIFFERENCES:');
  console.log('Only in PEOPLE  :', onlyInPeople);
  console.log('Only in CONTACTS:', onlyInContacts);
  console.log('Common columns  :', commonColumns.length, 'columns');
  
  // Check PP data sources
  console.log('\n📋 PP DATA ANALYSIS:');
  
  const { data: peopleWithPP } = await supabase
    .from('people')
    .select('id, first_name, last_name, email, phone, source, pp_contact_id, pp_data')
    .not('pp_data', 'is', null)
    .limit(5);
    
  const { data: contactsWithPP } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, email, phone, source, pp_contact_id, pp_data')
    .not('pp_data', 'is', null)
    .limit(5);
  
  console.log('\nPEOPLE with PP data:');
  peopleWithPP.forEach((person, idx) => {
    console.log(`  ${idx+1}. ${person.first_name} ${person.last_name}`);
    console.log(`     Email: ${person.email}`);
    console.log(`     Phone: ${person.phone}`);
    console.log(`     Source: ${person.source}`);
    console.log(`     PP Contact ID: ${person.pp_contact_id}`);
    console.log(`     PP Email: ${person.pp_data?.email}`);
    console.log(`     PP Phone: ${person.pp_data?.phone_mobile || person.pp_data?.phone_work}`);
    console.log('');
  });
  
  console.log('\nCONTACTS with PP data:');
  contactsWithPP.forEach((contact, idx) => {
    console.log(`  ${idx+1}. ${contact.first_name} ${contact.last_name}`);
    console.log(`     Email: ${contact.email}`);
    console.log(`     Phone: ${contact.phone}`);
    console.log(`     Source: ${contact.source}`);
    console.log(`     PP Contact ID: ${contact.pp_contact_id}`);
    console.log(`     PP Email: ${contact.pp_data?.email}`);
    console.log(`     PP Phone: ${contact.pp_data?.phone_mobile || contact.pp_data?.phone_work}`);
    console.log('');
  });
  
  // Check for duplicates between tables
  const peopleEmails = new Set(peopleWithPP.map(p => p.email).filter(e => e));
  const contactEmails = new Set(contactsWithPP.map(c => c.email).filter(e => e));
  const duplicateEmails = [...peopleEmails].filter(email => contactEmails.has(email));
  
  console.log(`📊 POTENTIAL DUPLICATES: ${duplicateEmails.length} emails appear in both tables`);
  if (duplicateEmails.length > 0) {
    console.log('Duplicate emails:', duplicateEmails);
  }
  
  // Check record counts and sources
  const { count: peopleCount } = await supabase.from('people').select('*', { count: 'exact', head: true });
  const { count: contactsCount } = await supabase.from('contacts').select('*', { count: 'exact', head: true });
  const { count: peoplePPCount } = await supabase.from('people').select('*', { count: 'exact', head: true }).not('pp_data', 'is', null);
  const { count: contactsPPCount } = await supabase.from('contacts').select('*', { count: 'exact', head: true }).not('pp_data', 'is', null);
  
  console.log('\n📈 RECORD COUNTS:');
  console.log(`PEOPLE total: ${peopleCount} (${peoplePPCount} with PP data)`);
  console.log(`CONTACTS total: ${contactsCount} (${contactsPPCount} with PP data)`);
  
  // Check what's actually from PP originally
  console.log('\n🎯 ORIGINAL PP SOURCE:');
  console.log('The pp_data JSONB field contains the ORIGINAL PracticePanther contact data');
  console.log('Table columns are local database structure - some populated from PP, some not');
  
  // Show PP vs local data comparison
  if (peopleWithPP[0]) {
    const person = peopleWithPP[0];
    console.log(`\n📊 EXAMPLE DATA COMPARISON (${person.first_name} ${person.last_name}):`);
    console.log('LOCAL TABLE DATA:');
    console.log(`  Email: ${person.email}`);
    console.log(`  Phone: ${person.phone}`);
    console.log('ORIGINAL PP DATA:');
    console.log(`  Email: ${person.pp_data?.email}`);
    console.log(`  Phone Mobile: ${person.pp_data?.phone_mobile}`);
    console.log(`  Phone Work: ${person.pp_data?.phone_work}`);
    console.log(`  Phone Home: ${person.pp_data?.phone_home}`);
    console.log(`  Contact Type: ${person.pp_data?.contact_type}`);
    console.log(`  Primary Contact: ${person.pp_data?.is_primary_contact}`);
  }
}

compareTablesAndPP();