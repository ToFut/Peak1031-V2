/**
 * Check what data is actually in the exchange and related tables
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const checkExchangeData = async () => {
  try {
    const exchangeId = 'df7ea956-a936-45c6-b683-143e9dda5230';
    
    console.log('🔍 Checking exchange data...');
    
    // Get exchange data
    const { data: exchange, error: exchangeError } = await supabase
      .from('exchanges')
      .select('*')
      .eq('id', exchangeId)
      .single();
      
    if (exchangeError) {
      console.error('Error fetching exchange:', exchangeError);
      return;
    }
    
    console.log('\n📊 Exchange data:');
    console.log('- ID:', exchange.id);
    console.log('- Name:', exchange.name);
    console.log('- Client ID:', exchange.client_id);
    console.log('- Coordinator ID:', exchange.coordinator_id);
    console.log('- Property Address:', exchange.property_address);
    console.log('- Relinquished Property Address:', exchange.relinquished_property_address);
    console.log('- Exchange Value:', exchange.exchange_value);
    console.log('- Status:', exchange.status);
    
    // Check if client_id exists and get client data
    if (exchange.client_id) {
      console.log('\n🔍 Fetching client data...');
      const { data: client, error: clientError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', exchange.client_id)
        .single();
        
      if (clientError) {
        console.error('Error fetching client:', clientError);
      } else {
        console.log('\n📊 Client data:');
        console.log('- ID:', client.id);
        console.log('- First Name:', client.first_name);
        console.log('- Last Name:', client.last_name);
        console.log('- Name:', client.name);
        console.log('- Email:', client.email);
        console.log('- Phone:', client.phone);
        console.log('- Address:', client.address);
      }
    } else {
      console.log('\n⚠️ No client_id found in exchange');
      
      // Let's check if there are any contacts that might be related
      console.log('\n🔍 Checking for any contacts...');
      const { data: allContacts, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .limit(5);
        
      if (!contactsError && allContacts.length > 0) {
        console.log('\n📊 Available contacts (first 5):');
        allContacts.forEach(contact => {
          console.log(`- ${contact.id}: ${contact.first_name} ${contact.last_name} (${contact.email})`);
        });
      }
    }
    
    // Check coordinator data
    if (exchange.coordinator_id) {
      console.log('\n🔍 Fetching coordinator data...');
      const { data: coordinator, error: coordinatorError } = await supabase
        .from('users')
        .select('*')
        .eq('id', exchange.coordinator_id)
        .single();
        
      if (coordinatorError) {
        console.error('Error fetching coordinator:', coordinatorError);
      } else {
        console.log('\n📊 Coordinator data:');
        console.log('- ID:', coordinator.id);
        console.log('- First Name:', coordinator.first_name);
        console.log('- Last Name:', coordinator.last_name);
        console.log('- Email:', coordinator.email);
        console.log('- Role:', coordinator.role);
      }
    } else {
      console.log('\n⚠️ No coordinator_id found in exchange');
    }
    
    // Check if there are exchange participants
    console.log('\n🔍 Checking exchange participants...');
    const { data: participants, error: participantsError } = await supabase
      .from('exchange_participants')
      .select('*')
      .eq('exchange_id', exchangeId);
      
    if (participantsError) {
      console.error('Error fetching participants:', participantsError);
    } else {
      console.log('\n📊 Exchange participants:', participants.length);
      participants.forEach(participant => {
        console.log(`- ${participant.id}: ${participant.contact_id} (${participant.role})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

checkExchangeData();