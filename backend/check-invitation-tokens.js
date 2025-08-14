#!/usr/bin/env node

/**
 * Check which invitation tokens exist in the database
 */

require('dotenv').config();
const supabaseService = require('./services/supabase');

async function checkTokens() {
  console.log('🔍 Checking Invitation Tokens in Database\n');
  
  // The token you're trying to use
  const testingToken = '9fd21a93572f7c34e7ecc7f03a18d5194cfce49aec7bd531f19f25f66060b7cf';
  
  // The token we just created
  const createdToken = '96082652c24259194c0bcca489a2320cbe8bd34d592143fa424ffde985ded56d';
  
  try {
    // Check if the token you're testing exists
    console.log('📌 Checking token from your URL:');
    console.log(`   ${testingToken}`);
    
    const { data: testingInv, error: testingError } = await supabaseService.client
      .from('invitations')
      .select('*')
      .eq('invitation_token', testingToken)
      .single();
    
    if (testingInv) {
      console.log('   ✅ FOUND! Details:');
      console.log(`      Email: ${testingInv.email}`);
      console.log(`      Status: ${testingInv.status}`);
      console.log(`      Created: ${testingInv.created_at}`);
      console.log(`      Expires: ${testingInv.expires_at}`);
    } else {
      console.log('   ❌ NOT FOUND in database');
      console.log('   This token does not exist, which is why you get "Invalid invitation"');
    }
    
    console.log('\n📌 Checking token we just created:');
    console.log(`   ${createdToken}`);
    
    const { data: createdInv, error: createdError } = await supabaseService.client
      .from('invitations')
      .select('*')
      .eq('invitation_token', createdToken)
      .single();
    
    if (createdInv) {
      console.log('   ✅ FOUND! Details:');
      console.log(`      Email: ${createdInv.email}`);
      console.log(`      Status: ${createdInv.status}`);
      console.log(`      Role: ${createdInv.role}`);
      console.log(`      Created: ${createdInv.created_at}`);
      console.log(`      Expires: ${createdInv.expires_at}`);
      
      // Check if expired
      const isExpired = new Date(createdInv.expires_at) < new Date();
      console.log(`      Valid: ${!isExpired ? '✅ Yes' : '❌ Expired'}`);
      
      console.log('\n   🔗 This token SHOULD work at:');
      console.log(`      https://peak1031-v2-8uus.vercel.app/invite/${createdToken}`);
    } else {
      console.log('   ❌ NOT FOUND - something went wrong with creation');
    }
    
    // Get all recent pending invitations
    console.log('\n📋 Recent Pending Invitations (last 5):');
    const { data: recent } = await supabaseService.client
      .from('invitations')
      .select('invitation_token, email, status, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (recent && recent.length > 0) {
      recent.forEach((inv, index) => {
        console.log(`   ${index + 1}. ${inv.email}`);
        console.log(`      Token: ${inv.invitation_token}`);
        console.log(`      Created: ${new Date(inv.created_at).toLocaleString()}`);
      });
    } else {
      console.log('   No pending invitations found');
    }
    
    // Count total invitations
    const { count } = await supabaseService.client
      .from('invitations')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n📊 Total invitations in database: ${count}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkTokens().catch(console.error);