const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkAutoRefresh() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  
  const { data: token } = await supabase
    .from('oauth_tokens')
    .select('*')
    .eq('provider', 'practicepanther')
    .eq('is_active', true)
    .single();
    
  if (token) {
    const expiresAt = new Date(token.expires_at);
    const now = new Date();
    const hoursUntilExpiry = (expiresAt - now) / (1000 * 60 * 60);
    const minutesUntilAutoRefresh = ((expiresAt - now) / (1000 * 60)) - 5; // 5-minute buffer
    
    console.log('🔍 Auto-Refresh Status:');
    console.log('Token expires:', expiresAt.toLocaleString());
    console.log('Hours until expiry:', Math.round(hoursUntilExpiry * 10) / 10);
    console.log('Minutes until auto-refresh triggers:', Math.round(minutesUntilAutoRefresh));
    console.log('Has refresh token:', !!token.refresh_token);
    console.log('Auto-refresh enabled:', !!token.refresh_token ? '✅ YES' : '❌ NO');
    
    if (token.provider_data?.refreshed_at) {
      const lastRefresh = new Date(token.provider_data.refreshed_at);
      const hoursSinceRefresh = (now - lastRefresh) / (1000 * 60 * 60);
      console.log('Last refreshed:', lastRefresh.toLocaleString());
      console.log('Hours since last refresh:', Math.round(hoursSinceRefresh * 10) / 10);
    }
    
    console.log('\n🔄 How Auto-Refresh Works:');
    console.log('1. Checks token before every PP API call');
    console.log('2. Refreshes automatically 5 minutes BEFORE expiry');
    console.log('3. Uses refresh_token to get new access_token');
    console.log('4. Updates database with new token');
    console.log('5. Continues working without interruption');
    
  } else {
    console.log('❌ No active token found');
  }
}

checkAutoRefresh();