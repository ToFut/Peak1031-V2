#!/usr/bin/env node

/**
 * Find the actual invitation for segev@futurixs.com
 */

require('dotenv').config();
const supabaseService = require('./services/supabase');

async function findInvitation() {
  console.log('🔍 Finding invitation for segev@futurixs.com\n');
  
  const emailTokenFromMail = '9fd21a93572f7c34e7ecc7f03a18d5194cfce49aec7bd531f19f25f66060b7cf';
  
  try {
    // Find all invitations for this email
    const { data: invitations, error } = await supabaseService.client
      .from('invitations')
      .select('*')
      .eq('email', 'segev@futurixs.com')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log(`📧 Found ${invitations.length} invitation(s) for segev@futurixs.com:\n`);
    
    invitations.forEach((inv, index) => {
      console.log(`Invitation ${index + 1}:`);
      console.log(`  ID: ${inv.id}`);
      console.log(`  Token: ${inv.invitation_token}`);
      console.log(`  Status: ${inv.status}`);
      console.log(`  Created: ${new Date(inv.created_at).toLocaleString()}`);
      console.log(`  Exchange ID: ${inv.exchange_id}`);
      console.log(`  Role: ${inv.role}`);
      console.log(`  Custom Message: ${inv.custom_message}`);
      
      if (inv.invitation_token === emailTokenFromMail) {
        console.log(`  ⚠️ THIS MATCHES THE TOKEN IN THE EMAIL BUT ISN'T IN DB!`);
      } else if (inv.status === 'pending') {
        console.log(`  ✅ THIS IS THE VALID TOKEN IN THE DATABASE`);
        console.log(`  🔗 Valid URL: https://peak1031-v2-8uus.vercel.app/invite/${inv.invitation_token}`);
      }
      console.log('');
    });
    
    // Check if the token from email exists anywhere
    console.log(`🔍 Checking if token from email exists in database:`);
    console.log(`   Token: ${emailTokenFromMail}`);
    
    const { data: checkToken, error: checkError } = await supabaseService.client
      .from('invitations')
      .select('*')
      .eq('invitation_token', emailTokenFromMail);
    
    if (checkToken && checkToken.length > 0) {
      console.log(`   ✅ Found in database for: ${checkToken[0].email}`);
    } else {
      console.log(`   ❌ NOT FOUND in database at all!`);
      console.log(`   This means the email was sent with a token that was never saved.`);
    }
    
    // Get the exchange details
    if (invitations.length > 0 && invitations[0].exchange_id) {
      const { data: exchange } = await supabaseService.client
        .from('exchanges')
        .select('*')
        .eq('id', invitations[0].exchange_id)
        .single();
      
      if (exchange) {
        console.log(`\n📦 Exchange: ${exchange.exchange_name || exchange.exchange_number}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

findInvitation().catch(console.error);