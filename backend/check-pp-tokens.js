#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkTokens() {
  try {
    console.log('🔍 Checking for existing PracticePanther OAuth tokens...\n');
    
    const { data, error } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('provider', 'practicepanther')
      .eq('is_active', true);
      
    if (error) {
      console.log('❌ Error checking tokens:', error.message);
      
      // Check if oauth_tokens table exists
      console.log('\n🔍 Checking if oauth_tokens table exists...');
      const { data: tables, error: tableError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'oauth_tokens');
        
      if (tableError || !tables || tables.length === 0) {
        console.log('❌ oauth_tokens table does not exist');
        console.log('💡 Please run the Supabase setup SQL script first');
      } else {
        console.log('✅ oauth_tokens table exists');
      }
      return;
    }
    
    console.log(`📊 OAuth tokens found: ${data.length}`);
    if (data.length > 0) {
      console.log('\n🔑 Existing tokens:');
      data.forEach((token, i) => {
        console.log(`${i+1}. Created: ${token.created_at}`);
        console.log(`   Expires: ${token.expires_at || 'No expiry'}`);
        console.log(`   Active: ${token.is_active}`);
        console.log(`   Last used: ${token.last_used_at || 'Never'}`);
        console.log('');
      });
      
      console.log('✅ PP tokens found - sync should work!');
    } else {
      console.log('❌ No active PP tokens found');
      console.log('\n💡 To set up PracticePanther OAuth:');
      console.log('1. Visit: https://app.practicepanther.com/OAuth/Authorize?response_type=code&client_id=' + process.env.PP_CLIENT_ID);
      console.log('2. Complete the authorization');
      console.log('3. Extract the auth code from the redirect URL');
      console.log('4. Store it in your database');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkTokens().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});