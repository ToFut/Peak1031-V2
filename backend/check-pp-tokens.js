// Check PP tokens in database

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkTokens() {
  console.log('🔍 Checking database for stored PP tokens...\n');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  
  try {
    // Check oauth_tokens table
    const { data: tokens, error } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('provider', 'practicepanther');
    
    if (error) {
      console.error('❌ Database error:', error.message);
      return;
    }
    
    console.log(`📊 Found ${tokens?.length || 0} PP tokens in database`);
    
    if (tokens && tokens.length > 0) {
      tokens.forEach((token, index) => {
        console.log(`\nToken ${index + 1}:`);
        console.log('  ID:', token.id);
        console.log('  Created:', token.created_at);
        console.log('  Expires:', token.expires_at);
        console.log('  Active:', token.is_active);
        console.log('  Has Access Token:', !!token.access_token);
        console.log('  Has Refresh Token:', !!token.refresh_token);
        
        // Check if expired
        const expiresAt = new Date(token.expires_at);
        const now = new Date();
        const isExpired = expiresAt <= now;
        const hoursUntilExpiry = (expiresAt - now) / (1000 * 60 * 60);
        
        console.log('  Is Expired:', isExpired);
        if (!isExpired) {
          console.log('  Hours Until Expiry:', Math.round(hoursUntilExpiry * 10) / 10);
        }
        
        if (token.provider_data && token.provider_data.refreshed_at) {
          console.log('  Last Refreshed:', token.provider_data.refreshed_at);
        }
      });
      
      // Check if we have an active, non-expired token
      const activeTokens = tokens.filter(t => t.is_active);
      const validTokens = activeTokens.filter(t => new Date(t.expires_at) > new Date());
      
      console.log(`\n📈 Summary:`);
      console.log(`  Total tokens: ${tokens.length}`);
      console.log(`  Active tokens: ${activeTokens.length}`);
      console.log(`  Valid (non-expired) tokens: ${validTokens.length}`);
      
      if (validTokens.length === 0) {
        console.log('\n❌ Problem: No valid tokens found');
        console.log('💡 All tokens are either inactive or expired');
        console.log('🔄 Auto-refresh should have prevented this');
      } else {
        console.log('\n✅ Valid tokens available');
        console.log('❓ But token manager shows "no_token" - checking token manager...');
      }
      
    } else {
      console.log('\n❌ No PracticePanther tokens found in database');
      console.log('💡 This explains why status shows "no_token"');
      console.log('🔧 OAuth setup needs to be completed first');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkTokens();