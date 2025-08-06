require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

console.log('🔍 CHECKING PRACTICEPANTHER SCOPES AND PERMISSIONS\n');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkScopesAndPermissions() {
  try {
    // Get the token with scope information
    console.log('🔑 Getting PP token with scope info...');
    
    const { data: tokenData, error: tokenError } = await supabase
      .from('oauth_tokens')
      .select('access_token, scope, expires_at')
      .eq('provider', 'practicepanther')
      .eq('is_active', true)
      .single();
    
    if (tokenError || !tokenData) {
      console.log('❌ No active PP token found.');
      return;
    }
    
    console.log('✅ PP token retrieved');
    console.log(`📋 Scope: ${tokenData.scope || 'No scope recorded'}`);
    console.log(`⏰ Expires: ${tokenData.expires_at || 'No expiry recorded'}`);
    
    const token = tokenData.access_token;
    
    // Test different API endpoints that might work
    console.log('\n🧪 TESTING DIFFERENT API ENDPOINTS...\n');
    
    const endpoints = [
      {
        name: 'Users/Me (should work)',
        url: 'https://app.practicepanther.com/api/v2/users/me'
      },
      {
        name: 'Account Info',
        url: 'https://app.practicepanther.com/api/v2/account'
      },
      {
        name: 'Contacts (basic)',
        url: 'https://app.practicepanther.com/api/v2/contacts'
      },
      {
        name: 'Matters (basic)',
        url: 'https://app.practicepanther.com/api/v2/matters'
      },
      {
        name: 'Tasks (basic)',
        url: 'https://app.practicepanther.com/api/v2/tasks'
      },
      {
        name: 'Time Entries',
        url: 'https://app.practicepanther.com/api/v2/time_entries'
      },
      {
        name: 'Expenses',
        url: 'https://app.practicepanther.com/api/v2/expenses'
      }
    ];
    
    for (const endpoint of endpoints) {
      console.log(`📡 Testing: ${endpoint.name}`);
      console.log(`URL: ${endpoint.url}`);
      
      try {
        const response = await fetch(endpoint.url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        console.log(`Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.total_count !== undefined) {
            console.log(`Total Count: ${data.total_count.toLocaleString()}`);
          }
          
          if (data.data && Array.isArray(data.data)) {
            console.log(`Data Length: ${data.data.length}`);
            
            if (data.data.length > 0) {
              const firstItem = data.data[0];
              console.log(`Sample ID: ${firstItem.id}`);
              if (firstItem.name) console.log(`Sample Name: ${firstItem.name}`);
              if (firstItem.first_name) console.log(`Sample Name: ${firstItem.first_name} ${firstItem.last_name}`);
            }
          } else if (data.id) {
            console.log(`Response ID: ${data.id}`);
            if (data.name) console.log(`Response Name: ${data.name}`);
            if (data.first_name) console.log(`Response Name: ${data.first_name} ${data.last_name}`);
          }
          
        } else {
          const errorText = await response.text();
          console.log(`Error: ${errorText.substring(0, 150)}...`);
        }
        
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
      
      console.log('-'.repeat(60));
    }
    
    // Check if we need to refresh the token
    console.log('\n🔄 CHECKING TOKEN STATUS...');
    
    if (tokenData.expires_at) {
      const expiresAt = new Date(tokenData.expires_at);
      const now = new Date();
      const timeLeft = expiresAt.getTime() - now.getTime();
      const hoursLeft = timeLeft / (1000 * 60 * 60);
      
      console.log(`⏰ Token expires: ${expiresAt.toISOString()}`);
      console.log(`⏰ Current time: ${now.toISOString()}`);
      console.log(`⏰ Hours left: ${hoursLeft.toFixed(2)}`);
      
      if (hoursLeft < 1) {
        console.log('⚠️  Token expires soon or is expired!');
      } else {
        console.log('✅ Token is still valid');
      }
    }
    
    // Check what scopes we requested vs what we have
    console.log('\n📋 SCOPE ANALYSIS:');
    console.log('='.repeat(50));
    
    const requestedScopes = ['contacts', 'matters', 'tasks'];
    const currentScope = tokenData.scope || '';
    
    console.log(`Requested scopes: ${requestedScopes.join(', ')}`);
    console.log(`Current scope: ${currentScope}`);
    
    for (const scope of requestedScopes) {
      if (currentScope.includes(scope)) {
        console.log(`✅ ${scope}: Granted`);
      } else {
        console.log(`❌ ${scope}: Missing`);
      }
    }
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('='.repeat(50));
    
    if (currentScope === '') {
      console.log('❌ No scope recorded - token may be invalid');
      console.log('💡 Try re-authenticating with proper scopes');
    } else if (!currentScope.includes('contacts') || !currentScope.includes('matters')) {
      console.log('❌ Missing required scopes');
      console.log('💡 Re-authenticate with: contacts matters tasks');
    } else {
      console.log('✅ Scopes look correct');
      console.log('💡 The issue might be:');
      console.log('   - Account permissions');
      console.log('   - API rate limiting');
      console.log('   - Different account/workspace');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

checkScopesAndPermissions(); 