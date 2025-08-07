#!/usr/bin/env node
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function assignClientToExchange() {
  console.log('🔍 Getting client user info...');
  
  try {
    // Get client user
    const { data: clientUser, error: clientError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'client@peak1031.com')
      .single();
    
    if (clientError || !clientUser) {
      console.error('❌ Client user not found:', clientError);
      return;
    }
    
    console.log('✅ Found client user:', {
      id: clientUser.id,
      email: clientUser.email,
      contact_id: clientUser.contact_id
    });
    
    const exchangeId = '8330bc7a-269d-4216-a22c-fd9657eca87c';
    
    // Check if client is already a participant
    const { data: existingParticipant } = await supabase
      .from('exchange_participants')
      .select('*')
      .eq('exchange_id', exchangeId)
      .eq('contact_id', clientUser.contact_id)
      .single();
    
    if (existingParticipant) {
      console.log('✅ Client is already a participant:', existingParticipant.id);
    } else {
      console.log('📝 Adding client as participant to exchange...');
      
      // Add client as exchange participant
      const { data: newParticipant, error: participantError } = await supabase
        .from('exchange_participants')
        .insert({
          exchange_id: exchangeId,
          contact_id: clientUser.contact_id,
          role: 'client',
          permissions: {
            canView: true,
            canMessage: true,
            canUpload: false,
            canViewDocuments: true
          },
          assigned_date: new Date().toISOString(),
          is_active: true
        })
        .select()
        .single();
      
      if (participantError) {
        console.error('❌ Error adding participant:', participantError);
      } else {
        console.log('✅ Client added as participant:', newParticipant.id);
      }
    }
    
    // Verify participants in the exchange
    console.log('\n👥 All participants in exchange:');
    const { data: participants } = await supabase
      .from('exchange_participants')
      .select(`
        *,
        contacts:contact_id (
          firstName,
          lastName,
          email
        )
      `)
      .eq('exchange_id', exchangeId);
    
    if (participants && participants.length > 0) {
      participants.forEach((p, i) => {
        const contact = p.contacts;
        console.log(`  ${i+1}. Role: ${p.role}, Contact: ${contact?.firstName} ${contact?.lastName} (${contact?.email})`);
      });
    } else {
      console.log('  No participants found');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
  
  process.exit(0);
}

assignClientToExchange();