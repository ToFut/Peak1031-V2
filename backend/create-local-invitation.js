#!/usr/bin/env node

/**
 * Create a valid invitation in LOCAL database for testing
 */

require('dotenv').config();
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const supabaseService = require('./services/supabase');

async function createLocalInvitation() {
  console.log('🏠 Creating Invitation in LOCAL Database\n');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
  console.log('');
  
  // Use the EXACT token you're trying to test
  const invitationToken = 'b5981781a9ba87cd3e7e452f2787217ff735fb3a95d27bc9be11b25d9e5d4e2d';
  
  console.log('📝 Using Token:', invitationToken);
  console.log('   (This is the token from your test URL)\n');
  
  // Test invitation details
  const testEmail = 'local.test@example.com';
  const testRole = 'client';
  
  try {
    // First, check if this token already exists
    const { data: existing } = await supabaseService.client
      .from('invitations')
      .select('*')
      .eq('invitation_token', invitationToken)
      .single();
    
    if (existing) {
      console.log('✅ Token already exists in database!');
      console.log('   Email:', existing.email);
      console.log('   Status:', existing.status);
      console.log('   Created:', existing.created_at);
      console.log('');
      console.log('🔗 This URL should work on localhost:');
      console.log(`   http://localhost:3000/invite/${invitationToken}`);
      return;
    }
    
    // Get first exchange
    const { data: exchanges } = await supabaseService.client
      .from('exchanges')
      .select('id, exchange_name, exchange_number')
      .limit(1);
    
    if (!exchanges || exchanges.length === 0) {
      console.log('❌ No exchanges found in local database');
      console.log('   You may need to create some test data first');
      return;
    }
    
    const exchange = exchanges[0];
    console.log(`📦 Using exchange: ${exchange.exchange_name || exchange.exchange_number}`);
    console.log(`   Exchange ID: ${exchange.id}\n`);
    
    // Get first admin user
    const { data: adminUsers } = await supabaseService.client
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('role', 'admin')
      .limit(1);
    
    const inviterId = adminUsers && adminUsers.length > 0 ? adminUsers[0].id : null;
    
    if (adminUsers && adminUsers.length > 0) {
      console.log(`👤 Inviter: ${adminUsers[0].first_name} ${adminUsers[0].last_name} (${adminUsers[0].email})`);
      console.log(`   User ID: ${inviterId}\n`);
    }
    
    // Create the invitation with the EXACT token
    const invitationData = {
      id: uuidv4(),
      email: testEmail,
      role: testRole,
      exchange_id: exchange.id,
      invited_by: inviterId,
      invitation_token: invitationToken, // Using the exact token from the URL
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      first_name: 'Local',
      last_name: 'Test',
      custom_message: 'Testing invitation on localhost',
      created_at: new Date().toISOString()
    };
    
    console.log('💾 Creating invitation in LOCAL database...\n');
    
    const { data: invitation, error } = await supabaseService.client
      .from('invitations')
      .insert(invitationData)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creating invitation:', error);
      return;
    }
    
    console.log('✅ SUCCESS! Invitation created in LOCAL database\n');
    console.log('📧 Email:', testEmail);
    console.log('🔑 Token:', invitationToken);
    console.log('⏰ Expires:', new Date(invitation.expires_at).toLocaleString());
    console.log('');
    
    console.log('🔗 TEST THIS URL ON LOCALHOST:');
    console.log(`   http://localhost:3000/invite/${invitationToken}`);
    console.log('');
    console.log('✨ This invitation now exists in your LOCAL database');
    console.log('   and will work when you access it from localhost:3000');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createLocalInvitation().catch(console.error);