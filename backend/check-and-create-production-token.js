#!/usr/bin/env node

/**
 * Check and create the specific token in production database
 */

require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const supabaseService = require('./services/supabase');

async function checkAndCreateToken() {
  const tokenToCheck = '2f9a66cb6b14098bed216db85252baa8c962ce6021af106a310831ee39bbf1f0';
  
  console.log('🔍 Checking Production Token\n');
  console.log('Token:', tokenToCheck);
  console.log('URL: https://peak1031-v2-8uus.vercel.app/invite/' + tokenToCheck);
  console.log('');
  
  try {
    // Check if token exists
    const { data: existing, error: checkError } = await supabaseService.client
      .from('invitations')
      .select('*')
      .eq('invitation_token', tokenToCheck)
      .single();
    
    if (existing) {
      console.log('✅ Token EXISTS in database!');
      console.log('   Email:', existing.email);
      console.log('   Status:', existing.status);
      console.log('   Role:', existing.role);
      console.log('   Created:', new Date(existing.created_at).toLocaleString());
      console.log('   Expires:', new Date(existing.expires_at).toLocaleString());
      
      // Check if expired
      const isExpired = new Date(existing.expires_at) < new Date();
      if (isExpired) {
        console.log('   ⚠️ WARNING: This invitation has EXPIRED');
      } else if (existing.status !== 'pending') {
        console.log('   ⚠️ WARNING: Status is', existing.status, '(not pending)');
      } else {
        console.log('   ✅ Status: Valid and pending');
      }
      
      console.log('\n🔗 This URL should work:');
      console.log(`   https://peak1031-v2-8uus.vercel.app/invite/${tokenToCheck}`);
      return;
    }
    
    console.log('❌ Token NOT FOUND in database');
    console.log('   Creating it now...\n');
    
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
    
    // Get first admin
    const { data: admins } = await supabaseService.client
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('role', 'admin')
      .limit(1);
    
    const admin = admins && admins.length > 0 ? admins[0] : null;
    
    // Create the invitation with this specific token
    const invitationData = {
      id: uuidv4(),
      email: 'production.test@example.com',
      role: 'client',
      exchange_id: exchange.id,
      invited_by: admin ? admin.id : null,
      invitation_token: tokenToCheck, // Use the exact token
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      first_name: 'Production',
      last_name: 'Test',
      custom_message: 'Test invitation for production',
      created_at: new Date().toISOString()
    };
    
    console.log('💾 Creating invitation...\n');
    
    const { data: created, error: createError } = await supabaseService.client
      .from('invitations')
      .insert(invitationData)
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Error creating invitation:', createError);
      return;
    }
    
    console.log('✅ SUCCESS! Invitation created');
    console.log('   Email:', created.email);
    console.log('   Role:', created.role);
    console.log('   Exchange:', exchange.exchange_name || exchange.exchange_number);
    console.log('   Expires:', new Date(created.expires_at).toLocaleString());
    console.log('');
    console.log('🔗 This URL will now work:');
    console.log(`   https://peak1031-v2-8uus.vercel.app/invite/${tokenToCheck}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAndCreateToken().catch(console.error);