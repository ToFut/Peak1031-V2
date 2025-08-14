#!/usr/bin/env node

/**
 * Create a test invitation for debugging
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createTestInvitation() {
  try {
    console.log('🔍 Creating test invitation...');

    // Get a test exchange ID
    const { data: exchanges } = await supabase
      .from('exchanges')
      .select('id, exchange_name')
      .limit(1);

    if (!exchanges || exchanges.length === 0) {
      console.error('❌ No exchanges found in database');
      return;
    }

    const testExchange = exchanges[0];
    console.log('📋 Using exchange:', testExchange.exchange_name, `(${testExchange.id})`);

    // Get an admin user to invite from
    const { data: adminUsers } = await supabase
      .from('users')
      .select('id, email')
      .eq('role', 'admin')
      .limit(1);

    if (!adminUsers || adminUsers.length === 0) {
      console.error('❌ No admin users found');
      return;
    }

    const adminUser = adminUsers[0];
    console.log('👤 Inviting from admin:', adminUser.email);

    // Generate invitation token
    const token = crypto.randomBytes(32).toString('hex');
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + 7); // 7 days from now

    const testEmail = `test-invitation-${Date.now()}@example.com`;

    // Create invitation
    const { data: invitation, error } = await supabase
      .from('invitations')
      .insert({
        invitation_token: token,
        exchange_id: testExchange.id,
        email: testEmail,
        role: 'client',
        invited_by: adminUser.id,
        custom_message: 'Test invitation for debugging purposes',
        expires_at: expires_at.toISOString(),
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating invitation:', error);
      return;
    }

    console.log('\n✅ Test invitation created successfully!');
    console.log('📧 Email:', testEmail);
    console.log('🔑 Token:', token);
    console.log('📅 Expires:', expires_at.toISOString());
    console.log('🔗 Invitation URL:', `https://peak1031-v2-8uus.vercel.app/invite/${token}`);
    console.log('\n💡 You can now test this invitation URL in production!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createTestInvitation().catch(console.error);