#!/usr/bin/env node

/**
 * Create a valid test invitation with proper token
 */

require('dotenv').config();
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const supabaseService = require('./services/supabase');

async function createValidInvitation() {
  console.log('🎯 Creating Valid Test Invitation\n');
  
  // Generate a proper invitation token (same as system does)
  const invitationToken = crypto.randomBytes(32).toString('hex');
  
  console.log('📝 Generated Token:', invitationToken);
  console.log('   Length:', invitationToken.length, 'characters');
  console.log('   Format: Hexadecimal (0-9, a-f)\n');
  
  // Test invitation details
  const testEmail = 'test.user@example.com';
  const testRole = 'client';
  const exchangeId = 'test-exchange-id'; // Replace with a real exchange ID if needed
  
  try {
    // Check if we have any exchanges to use
    const { data: exchanges } = await supabaseService.client
      .from('exchanges')
      .select('id, exchange_name, exchange_number')
      .limit(1);
    
    const actualExchangeId = exchanges && exchanges.length > 0 
      ? exchanges[0].id 
      : exchangeId;
    
    if (exchanges && exchanges.length > 0) {
      console.log(`📦 Using real exchange: ${exchanges[0].exchange_name || exchanges[0].exchange_number}`);
      console.log(`   Exchange ID: ${actualExchangeId}\n`);
    } else {
      console.log('⚠️  No exchanges found, using test exchange ID\n');
    }
    
    // Get the first admin user to be the inviter
    const { data: adminUsers } = await supabaseService.client
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('role', 'admin')
      .limit(1);
    
    const inviterId = adminUsers && adminUsers.length > 0 
      ? adminUsers[0].id 
      : null;
    
    if (adminUsers && adminUsers.length > 0) {
      console.log(`👤 Inviter: ${adminUsers[0].first_name} ${adminUsers[0].last_name} (${adminUsers[0].email})`);
      console.log(`   User ID: ${inviterId}\n`);
    }
    
    // Create the invitation record
    const invitationData = {
      id: uuidv4(),
      email: testEmail,
      role: testRole,
      exchange_id: actualExchangeId,
      invited_by: inviterId,
      invitation_token: invitationToken,
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      first_name: 'Test',
      last_name: 'User',
      custom_message: 'This is a test invitation created for debugging purposes',
      created_at: new Date().toISOString()
    };
    
    console.log('💾 Creating invitation in database...\n');
    
    const { data: invitation, error } = await supabaseService.client
      .from('invitations')
      .insert(invitationData)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creating invitation:', error);
      return;
    }
    
    console.log('✅ Invitation created successfully!\n');
    console.log('📧 Email:', testEmail);
    console.log('👤 Role:', testRole);
    console.log('🆔 Invitation ID:', invitation.id);
    console.log('🔑 Token:', invitationToken);
    console.log('⏰ Expires:', new Date(invitation.expires_at).toLocaleString());
    console.log('');
    
    // Generate the invitation URLs
    const localUrl = `http://localhost:3000/invite/${invitationToken}`;
    const productionUrl = `https://peak1031-v2-8uus.vercel.app/invite/${invitationToken}`;
    
    console.log('🔗 INVITATION URLS:\n');
    console.log('Local Development:');
    console.log(`   ${localUrl}\n`);
    console.log('Production:');
    console.log(`   ${productionUrl}\n`);
    
    console.log('📋 TO TEST THE INVITATION:\n');
    console.log('1. Open one of the URLs above in your browser');
    console.log('2. You should see the invitation signup page');
    console.log('3. Fill in the form to create an account');
    console.log('4. The account will be linked to the exchange\n');
    
    console.log('🔍 TO VERIFY IN DATABASE:\n');
    console.log('Run this SQL query in Supabase:');
    console.log(`SELECT * FROM invitations WHERE invitation_token = '${invitationToken}';`);
    console.log('');
    
    console.log('✨ Invitation ready for testing!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the script
createValidInvitation().catch(console.error);