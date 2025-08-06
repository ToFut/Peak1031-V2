const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

async function storePPToken() {
  console.log('=== Storing PracticePanther Token ===');
  console.log('');
  
  // The token we got from the OAuth flow
  const tokenData = {
    access_token: 'XtXrpTw20FL3g-JNoTVU_HyMh3f7Yt9stTYOx_O3RUkde08gcT0gBQ38hIlAv6HQlZ4dlaRDba_eaUkC-2ls7pcR2b_pbRTVp1Zgrbl3cKWAsIwBCZG3p6OvliX3L69Ccf0Zhk9QvYi3MwE0BRqxm8XBcOowJnKAHLX5ikisFhFJtkJzND8fE8re14dJL0mqjETbIoJ9l1FWDrJw1TAeXWIzxZ-hB-9IOrx1KNeEcrjwnq19mkQZGxp6FPY4T6AFhHw4qTnMb1EAujh_71J6hJGI9QAdow-6uhrHRaiD_6LH3YnQPwfDY6MaIS5khGFdSIOaGvqA-fNALBreRxiVdR6571yZl1YP9E58U1oqL0obKnIVJnEDzRKFXCQ9BZGdOIZWiMGTqAjCNq7gXP3S7C3TWaSVP1eRZgLKzsTfGfj5Bl7zQreP0zehYRlw3cWBCQqs7df-NA5Wbp0W88olZDYfaJXD-Bnpwp8Yc3WI6ZaW6qvJzgTAsD4l7wXgkuAPzMmFK0a2WmjTmq9SJ3Z3uGH6C2igwrnRLRmuF_WPrv4',
    token_type: 'bearer',
    expires_in: 86399,
    refresh_token: '30805d262a9e4b19b080dac6ec9229cd'
  };
  
  try {
    // Create Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    // First, deactivate any existing PP tokens
    console.log('Deactivating existing PracticePanther tokens...');
    const { error: deactivateError } = await supabase
      .from('oauth_tokens')
      .update({ is_active: false })
      .eq('provider', 'practicepanther');
    
    if (deactivateError) {
      console.error('Warning: Could not deactivate existing tokens:', deactivateError.message);
    }
    
    // Prepare the token record
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
    
    const tokenRecord = {
      provider: 'practicepanther',
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_type: tokenData.token_type,
      expires_at: expiresAt.toISOString(),
      scope: null,
      is_active: true,
      created_at: new Date().toISOString()
    };
    
    console.log('Storing new token...');
    console.log('- Provider:', tokenRecord.provider);
    console.log('- Expires at:', tokenRecord.expires_at);
    console.log('- Has refresh token:', !!tokenRecord.refresh_token);
    console.log('');
    
    const { data, error } = await supabase
      .from('oauth_tokens')
      .insert(tokenRecord)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error storing token:', error.message);
      console.error('Details:', error);
    } else {
      console.log('✅ Token stored successfully!');
      console.log('- Token ID:', data.id);
      console.log('- Created at:', data.created_at);
      console.log('');
      
      // Verify the token can be retrieved
      console.log('Verifying token retrieval...');
      const { data: verifyData, error: verifyError } = await supabase
        .from('oauth_tokens')
        .select('*')
        .eq('provider', 'practicepanther')
        .eq('is_active', true)
        .single();
      
      if (verifyError) {
        console.error('❌ Error retrieving token:', verifyError.message);
      } else {
        console.log('✅ Token can be retrieved successfully!');
        console.log('');
        console.log('🎉 PracticePanther OAuth setup is complete!');
        console.log('   The sync service should now be able to connect to the PP API.');
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.error(error);
  }
  
  console.log('');
  console.log('=== End Token Storage ===');
}

storePPToken()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });