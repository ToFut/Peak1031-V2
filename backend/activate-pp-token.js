const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function activateLatestToken() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  
  console.log('🔧 Activating the most recent valid PP token...');
  
  // Get the most recent non-expired token
  const { data: tokens, error } = await supabase
    .from('oauth_tokens')
    .select('*')
    .eq('provider', 'practicepanther')
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1);
    
  if (error || !tokens || tokens.length === 0) {
    console.error('❌ No valid tokens to activate');
    return;
  }
  
  const latestToken = tokens[0];
  console.log('📊 Latest token ID:', latestToken.id);
  console.log('📊 Expires at:', latestToken.expires_at);
  
  // First deactivate all other PP tokens
  await supabase
    .from('oauth_tokens')
    .update({ is_active: false })
    .eq('provider', 'practicepanther');
    
  // Then activate the latest one
  const { data: updated, error: updateError } = await supabase
    .from('oauth_tokens')
    .update({ 
      is_active: true,
      last_used_at: new Date().toISOString()
    })
    .eq('id', latestToken.id);
    
  if (updateError) {
    console.error('❌ Error activating token:', updateError.message);
  } else {
    console.log('✅ Token activated successfully!');
    console.log('🔍 Now check PP token status again...');
  }
}

activateLatestToken();