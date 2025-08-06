// Script to create a contact for client@peak1031.com and add as participant
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ynwfrmykghcozqnuszho.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlud2ZybXlrZ2hjb3pxbnVzemhvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzczNjI2NSwiZXhwIjoyMDY5MzEyMjY1fQ.zyFETz8fN0u_28pYSZPx9m6cvxsF1Oq1vnTSr2HxKYA';

const client = createClient(supabaseUrl, supabaseKey);

async function addClientAsParticipant() {
  try {
    // Step 1: Create a contact for client@peak1031.com
    console.log('📝 Creating contact for client@peak1031.com...');
    
    const contactData = {
      email: 'client@peak1031.com',
      first_name: 'Test',
      last_name: 'Client',
      phone: '+1-555-0000',
      company: 'Test Client Company',
      address: '123 Test Street',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: contact, error: contactError } = await client
      .from('contacts')
      .insert(contactData)
      .select()
      .single();

    if (contactError) {
      console.error('❌ Error creating contact:', contactError);
      return;
    }

    console.log('✅ Contact created:', contact);

    // Step 2: Get the first exchange to add them to
    const { data: exchanges, error: exchangeError } = await client
      .from('exchanges')
      .select('id, name')
      .limit(2);

    if (exchangeError || !exchanges.length) {
      console.error('❌ Error fetching exchanges:', exchangeError);
      return;
    }

    console.log(`📋 Found ${exchanges.length} exchanges`);

    // Step 3: Add the contact as a participant to the first two exchanges
    for (const exchange of exchanges) {
      console.log(`\n🔗 Adding to exchange: ${exchange.name}`);
      
      const participantData = {
        exchange_id: exchange.id,
        contact_id: contact.id,
        user_id: null,
        role: 'client',
        permissions: {
          sendMessages: true,
          viewMessages: true,
          viewDocuments: true,
          uploadDocuments: true,
          viewExchange: true
        },
        created_at: new Date().toISOString()
      };

      const { data: participant, error: participantError } = await client
        .from('exchange_participants')
        .insert(participantData)
        .select();

      if (participantError) {
        console.error(`❌ Error adding participant to ${exchange.name}:`, participantError);
      } else {
        console.log(`✅ Added as participant to ${exchange.name}`);
      }
    }

    console.log('\n🎉 Done! client@peak1031.com is now:');
    console.log('- A contact in the system');
    console.log('- A participant in the first two exchanges');
    console.log('- Should only see those exchanges when logged in');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

addClientAsParticipant();