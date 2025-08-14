#!/usr/bin/env node

/**
 * Test script to check invitation token status
 */

require('dotenv').config();
const supabaseService = require('./services/supabase');

async function testInvitationToken() {
  const token = 'b5981781a9ba87cd3e7e452f2787217ff735fb3a95d27bc9be11b25d9e5d4e2d';
  
  console.log('🔍 Testing invitation token:', token);
  console.log('');

  try {
    // Check if token exists at all
    const allInvitations = await supabaseService.select('invitations', {
      where: { invitation_token: token }
    });
    
    console.log('📊 All invitations with this token:');
    if (allInvitations && allInvitations.length > 0) {
      allInvitations.forEach((inv, index) => {
        console.log(`  ${index + 1}. Status: ${inv.status}`);
        console.log(`     Email: ${inv.email}`);
        console.log(`     Role: ${inv.role}`);
        console.log(`     Expires: ${inv.expires_at}`);
        console.log(`     Created: ${inv.created_at}`);
        console.log(`     Exchange: ${inv.exchange_id}`);
        console.log('');
      });
    } else {
      console.log('  ❌ No invitations found with this token');
    }

    // Check specifically for pending invitations
    const pendingInvitations = await supabaseService.select('invitations', {
      where: { invitation_token: token, status: 'pending' }
    });
    
    console.log('📋 Pending invitations with this token:');
    if (pendingInvitations && pendingInvitations.length > 0) {
      console.log(`  ✅ Found ${pendingInvitations.length} pending invitation(s)`);
      const inv = pendingInvitations[0];
      
      // Check if expired
      const now = new Date();
      const expiresAt = new Date(inv.expires_at);
      const isExpired = expiresAt < now;
      
      console.log(`  📅 Current time: ${now.toISOString()}`);
      console.log(`  ⏰ Expires at: ${expiresAt.toISOString()}`);
      console.log(`  ${isExpired ? '❌ EXPIRED' : '✅ VALID'}`);
    } else {
      console.log('  ❌ No pending invitations found');
    }

    // Check recent invitations for debugging
    console.log('🕐 Recent invitations (last 10):');
    const { data: recent } = await supabaseService.client
      .from('invitations')
      .select('invitation_token, email, status, created_at, expires_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (recent && recent.length > 0) {
      recent.forEach((inv, index) => {
        const token_short = inv.invitation_token ? inv.invitation_token.substring(0, 8) + '...' : 'null';
        console.log(`  ${index + 1}. ${token_short} - ${inv.email} - ${inv.status} - ${inv.created_at}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testInvitationToken().catch(console.error);