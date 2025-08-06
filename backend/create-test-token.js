#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createTestToken() {
  try {
    console.log('🔧 Creating test PracticePanther token for sync testing...\n');
    
    // Create a test token that we can use for initial testing
    // Note: In production, you'd get this from the actual OAuth flow
    const testToken = {
      provider: 'practicepanther',
      access_token: 'test_token_' + Date.now(), // Placeholder - replace with real token
      refresh_token: null,
      token_type: 'Bearer',
      expires_at: new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString(), // 24 hours from now
      scope: 'contacts matters tasks',
      is_active: true,
      provider_data: {
        note: 'Test token for development - replace with real PP token'
      }
    };
    
    // First, deactivate any existing tokens
    const { error: deactivateError } = await supabase
      .from('oauth_tokens')
      .update({ is_active: false })
      .eq('provider', 'practicepanther');
    
    if (deactivateError) {
      console.log('⚠️ Warning deactivating old tokens:', deactivateError.message);
    }
    
    // Insert test token
    const { data, error } = await supabase
      .from('oauth_tokens')
      .insert(testToken)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creating test token:', error.message);
      return;
    }
    
    console.log('✅ Test token created successfully!');
    console.log(`   Token ID: ${data.id}`);
    console.log(`   Expires: ${data.expires_at}`);
    console.log(`   Active: ${data.is_active}`);
    
    console.log('\n⚠️  IMPORTANT:');
    console.log('This is a placeholder token for testing the sync structure.');
    console.log('To sync real data, you need to:');
    console.log('1. Get a valid OAuth token from PracticePanther');
    console.log('2. Update the access_token field in the oauth_tokens table');
    console.log('3. Or complete the proper OAuth flow');
    
    console.log('\n🧪 You can now test the sync structure with:');
    console.log('node run-pp-sync.js');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createTestToken().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});