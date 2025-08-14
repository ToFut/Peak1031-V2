#!/usr/bin/env node

/**
 * List all valid pending invitations with their URLs
 */

require('dotenv').config();
const supabaseService = require('./services/supabase');

async function listValidInvitations() {
  console.log('📋 ALL VALID PENDING INVITATIONS\n');
  console.log('=' .repeat(80));
  
  try {
    // Get all pending invitations
    const { data: invitations, error } = await supabaseService.client
      .from('invitations')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    if (!invitations || invitations.length === 0) {
      console.log('No pending invitations found');
      return;
    }
    
    console.log(`Found ${invitations.length} pending invitations:\n`);
    
    invitations.forEach((inv, index) => {
      const isExpired = new Date(inv.expires_at) < new Date();
      const daysLeft = Math.ceil((new Date(inv.expires_at) - new Date()) / (1000 * 60 * 60 * 24));
      
      console.log(`${index + 1}. ${inv.email}`);
      console.log(`   Role: ${inv.role}`);
      console.log(`   Created: ${new Date(inv.created_at).toLocaleDateString()}`);
      console.log(`   Status: ${isExpired ? '❌ EXPIRED' : `✅ Valid (${daysLeft} days left)`}`);
      console.log(`   Token: ${inv.invitation_token}`);
      console.log(`   URL: https://peak1031-v2-8uus.vercel.app/invite/${inv.invitation_token}`);
      console.log('');
    });
    
    console.log('=' .repeat(80));
    console.log('\n✨ Use any of the valid (non-expired) URLs above to test the invitation flow');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

listValidInvitations().catch(console.error);