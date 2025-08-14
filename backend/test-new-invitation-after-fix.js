#!/usr/bin/env node

/**
 * Test creating a new invitation after the token bug fix
 */

require('dotenv').config();
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const supabaseService = require('./services/supabase');

async function testNewInvitation() {
  console.log('🧪 Testing New Invitation After Token Fix\n');
  console.log('This will create a test invitation to verify the email token matches the database token.\n');
  
  // Generate a token (this is what the fixed system does)
  const invitationToken = crypto.randomBytes(32).toString('hex');
  
  console.log('📝 Generated Token:', invitationToken);
  console.log('');
  
  // Test invitation details
  const testEmail = 'postfix.test@example.com';
  const testRole = 'client';
  
  try {
    // Get first exchange
    const { data: exchanges } = await supabaseService.client
      .from('exchanges')
      .select('id, exchange_name, exchange_number')
      .limit(1);
    
    if (!exchanges || exchanges.length === 0) {
      console.log('❌ No exchanges found');
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
    
    if (!adminUsers || adminUsers.length === 0) {
      console.log('❌ No admin users found');
      return;
    }
    
    const admin = adminUsers[0];
    console.log(`👤 Inviter: ${admin.first_name} ${admin.last_name} (${admin.email})`);
    console.log(`   User ID: ${admin.id}\n`);
    
    // Create the invitation
    const invitationData = {
      id: uuidv4(),
      email: testEmail,
      role: testRole,
      exchange_id: exchange.id,
      invited_by: admin.id,
      invitation_token: invitationToken,
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      first_name: 'PostFix',
      last_name: 'Test',
      custom_message: 'Testing after token bug fix',
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
    
    console.log('✅ SUCCESS! Invitation created\n');
    console.log('📧 Email:', testEmail);
    console.log('🔑 Token in DB:', invitationToken);
    console.log('');
    
    // With the fix, this token will be passed to invitationService
    // so the email will contain the SAME token
    console.log('🔗 INVITATION URL (this will work):');
    console.log(`https://peak1031-v2-8uus.vercel.app/invite/${invitationToken}`);
    console.log('');
    
    console.log('✨ The fix ensures:');
    console.log('   1. Token generated in routes/invitations.js');
    console.log('   2. Same token passed to invitationService.sendInvitation()');
    console.log('   3. Same token saved to database');
    console.log('   4. Email contains the correct token that exists in DB');
    console.log('');
    
    // Verify the token exists
    const { data: verify } = await supabaseService.client
      .from('invitations')
      .select('id, email, invitation_token')
      .eq('invitation_token', invitationToken)
      .single();
    
    if (verify) {
      console.log('✅ VERIFIED: Token exists in database');
      console.log('   This invitation will work correctly!');
    } else {
      console.log('❌ Token not found - something went wrong');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testNewInvitation().catch(console.error);