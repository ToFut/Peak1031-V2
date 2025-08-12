#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function createTestExchange() {
  console.log('Creating test exchange...');
  
  // Create a test exchange
  const { data: exchange, error } = await supabase
    .from('exchanges')
    .insert({
      exchange_number: 'EX-TEST-' + Date.now(),
      status: 'active',
      lifecycle_stage: 'identification',
      created_by: '278304de-568f-4138-b35b-6fdcfbd2f1ce', // admin user
      pp_data: {
        test_exchange: true,
        created_for: 'task_testing'
      }
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating exchange:', error);
    return;
  }
  
  console.log('✅ Exchange created:', exchange.exchange_number);
  console.log('   Exchange ID:', exchange.id);
  
  // Add admin as participant
  const { error: participantError } = await supabase
    .from('exchange_participants')
    .insert({
      exchange_id: exchange.id,
      contact_id: '278304de-568f-4138-b35b-6fdcfbd2f1ce',
      role: 'admin',
      is_active: true
    });
  
  if (participantError) {
    console.error('Error adding admin participant:', participantError);
  } else {
    console.log('✅ Admin added as participant');
  }
  
  // Add client as participant
  const { error: clientError } = await supabase
    .from('exchange_participants')
    .insert({
      exchange_id: exchange.id,
      contact_id: '557dc07c-3ca7-46bf-94cd-c99f3d1e3bb1', // client user
      role: 'client',
      is_active: true
    });
  
  if (clientError) {
    console.error('Error adding client participant:', clientError);
  } else {
    console.log('✅ Client added as participant');
  }
  
  // Add coordinator as participant  
  const { error: coordError } = await supabase
    .from('exchange_participants')
    .insert({
      exchange_id: exchange.id,
      contact_id: 'e8b6e2e1-3c5f-4d9a-9c8e-1a2b3c4d5e6f', // coordinator if exists
      role: 'coordinator',
      is_active: true
    });
  
  if (!coordError) {
    console.log('✅ Coordinator added as participant');
  }
  
  console.log('\n📋 Exchange ready for testing:');
  console.log('   Exchange ID:', exchange.id);
  console.log('   Exchange Number:', exchange.exchange_number);
  console.log('   Status:', exchange.status);
  console.log('\nUse this ID for testing tasks!');
  
  return exchange.id;
}

createTestExchange()
  .then(id => {
    console.log('\n✅ Test exchange created successfully!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Failed:', err);
    process.exit(1);
  });