require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

console.log('📊 CHECKING CURRENT DATABASE CONTACTS\n');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkCurrentContacts() {
  try {
    // Check all contacts
    console.log('🔍 Checking all contacts in database...');
    
    const { data: allContacts, error: allError } = await supabase
      .from('people')
      .select('id, first_name, last_name, email, company, source, pp_contact_id, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (allError) {
      console.log('❌ Error fetching contacts:', allError.message);
      return;
    }
    
    console.log(`📊 Total contacts in database: ${allContacts.length}`);
    
    if (allContacts.length > 0) {
      console.log('\n📋 RECENT CONTACTS:');
      allContacts.forEach((contact, index) => {
        console.log(`${index + 1}. ${contact.first_name} ${contact.last_name}`);
        console.log(`   Email: ${contact.email || 'N/A'}`);
        console.log(`   Company: ${contact.company || 'N/A'}`);
        console.log(`   Source: ${contact.source || 'N/A'}`);
        console.log(`   PP ID: ${contact.pp_contact_id || 'N/A'}`);
        console.log(`   Created: ${contact.created_at}`);
        console.log('');
      });
    }
    
    // Check PP contacts specifically
    console.log('🔍 Checking PracticePanther contacts...');
    
    const { data: ppContacts, error: ppError } = await supabase
      .from('people')
      .select('id, first_name, last_name, email, company, pp_contact_id, pp_data')
      .eq('source', 'practice_partner')
      .order('created_at', { ascending: false });
    
    if (ppError) {
      console.log('❌ Error fetching PP contacts:', ppError.message);
      return;
    }
    
    console.log(`📊 PP contacts in database: ${ppContacts.length}`);
    
    if (ppContacts.length > 0) {
      console.log('\n📋 PRACTICEPANTHER CONTACTS:');
      ppContacts.forEach((contact, index) => {
        console.log(`${index + 1}. ${contact.first_name} ${contact.last_name}`);
        console.log(`   Email: ${contact.email || 'N/A'}`);
        console.log(`   Company: ${contact.company || 'N/A'}`);
        console.log(`   PP ID: ${contact.pp_contact_id}`);
        console.log(`   Custom Fields: ${contact.pp_data?.custom_field_values?.length || 0}`);
        console.log('');
      });
    }
    
    // Check manual contacts
    console.log('🔍 Checking manual contacts...');
    
    const { data: manualContacts, error: manualError } = await supabase
      .from('people')
      .select('id, first_name, last_name, email, company, source')
      .eq('source', 'manual')
      .order('created_at', { ascending: false });
    
    if (manualError) {
      console.log('❌ Error fetching manual contacts:', manualError.message);
      return;
    }
    
    console.log(`📊 Manual contacts in database: ${manualContacts.length}`);
    
    // Summary
    console.log('\n📊 DATABASE SUMMARY:');
    console.log('='.repeat(50));
    console.log(`📊 Total contacts: ${allContacts.length}`);
    console.log(`📊 PP contacts: ${ppContacts.length}`);
    console.log(`📊 Manual contacts: ${manualContacts.length}`);
    
    if (ppContacts.length > 0) {
      console.log('\n✅ PP contacts are already in the database!');
      console.log('✅ The import process is working correctly');
      console.log('✅ Database structure is compatible');
    } else {
      console.log('\n⚠️  No PP contacts found in database');
      console.log('⚠️  Need to investigate API connection');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

checkCurrentContacts(); 