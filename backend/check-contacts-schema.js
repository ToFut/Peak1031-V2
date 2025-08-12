const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkContactsSchema() {
  console.log('🔍 Checking contacts table schema...\n');
  
  // Get a sample contact to see the structure
  const { data: sampleContacts } = await supabase
    .from('contacts')
    .select('*')
    .limit(3);
    
  if (sampleContacts && sampleContacts.length > 0) {
    console.log('Sample contact columns:');
    console.log(Object.keys(sampleContacts[0]));
    console.log('\nSample contact:');
    console.log(sampleContacts[0]);
  }
  
  // Check exchange_participants schema
  console.log('\n🔍 Checking exchange_participants schema...');
  const { data: sampleParticipants } = await supabase
    .from('exchange_participants')
    .select('*')
    .limit(3);
    
  if (sampleParticipants && sampleParticipants.length > 0) {
    console.log('Sample participant columns:');
    console.log(Object.keys(sampleParticipants[0]));
    console.log('\nSample participant:');
    console.log(sampleParticipants[0]);
  }
  
  // Find admin user's associated contact if any
  const adminUserId = '278304de-568f-4138-b35b-6fdcfbd2f1ce';
  const adminEmail = 'admin@peak1031.com';
  
  console.log('\n🔍 Looking for admin contact by email...');
  const { data: adminContact } = await supabase
    .from('contacts')
    .select('*')
    .eq('email', adminEmail)
    .single();
    
  if (adminContact) {
    console.log('Found admin contact:');
    console.log(adminContact);
  } else {
    console.log('No contact found for admin email');
  }
}

checkContactsSchema();