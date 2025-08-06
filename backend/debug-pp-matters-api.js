require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

console.log('🔍 DEBUGGING PRACTICEPANTHER MATTERS API\n');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function debugMattersAPI() {
  try {
    // Get the access token
    console.log('🔑 Getting PP access token...');
    
    const { data: tokenData, error: tokenError } = await supabase
      .from('oauth_tokens')
      .select('access_token')
      .eq('provider', 'practicepanther')
      .eq('is_active', true)
      .single();
    
    if (tokenError || !tokenData) {
      console.log('❌ No active PP token found.');
      return;
    }
    
    const token = tokenData.access_token;
    console.log('✅ PP token retrieved');
    
    // Test different API endpoints and parameters
    console.log('\n🧪 TESTING DIFFERENT API CALLS...\n');
    
    const testCases = [
      {
        name: 'Basic matters call',
        url: 'https://app.practicepanther.com/api/v2/matters'
      },
      {
        name: 'Matters with pagination',
        url: 'https://app.practicepanther.com/api/v2/matters?per_page=10&page=1'
      },
      {
        name: 'Matters with limit',
        url: 'https://app.practicepanther.com/api/v2/matters?limit=10'
      },
      {
        name: 'All matters (no pagination)',
        url: 'https://app.practicepanther.com/api/v2/matters?per_page=100'
      },
      {
        name: 'Matters with status filter',
        url: 'https://app.practicepanther.com/api/v2/matters?status=active'
      },
      {
        name: 'Matters with type filter',
        url: 'https://app.practicepanther.com/api/v2/matters?matter_type=1031_exchange'
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`📡 Testing: ${testCase.name}`);
      console.log(`URL: ${testCase.url}`);
      
      try {
        const response = await fetch(testCase.url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        console.log(`Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`Total Count: ${data.total_count || 'N/A'}`);
          console.log(`Data Length: ${data.data?.length || 0}`);
          console.log(`Has Data: ${!!data.data}`);
          
          if (data.data && data.data.length > 0) {
            const firstMatter = data.data[0];
            console.log(`Sample Matter ID: ${firstMatter.id}`);
            console.log(`Sample Matter Name: ${firstMatter.name || 'N/A'}`);
          }
        } else {
          const errorText = await response.text();
          console.log(`Error Response: ${errorText.substring(0, 200)}...`);
        }
        
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
      
      console.log('-'.repeat(60));
    }
    
    // Test the users/me endpoint to verify our token works
    console.log('\n👤 Testing users/me endpoint...');
    
    try {
      const meResponse = await fetch('https://app.practicepanther.com/api/v2/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log(`Status: ${meResponse.status} ${meResponse.statusText}`);
      
      if (meResponse.ok) {
        const meData = await meResponse.json();
        console.log(`User ID: ${meData.id}`);
        console.log(`User Name: ${meData.first_name} ${meData.last_name}`);
        console.log(`User Email: ${meData.email}`);
        console.log(`Account ID: ${meData.account_ref?.id || 'N/A'}`);
      } else {
        const errorText = await meResponse.text();
        console.log(`Error: ${errorText.substring(0, 200)}...`);
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    // Test contacts endpoint to compare
    console.log('\n👥 Testing contacts endpoint for comparison...');
    
    try {
      const contactsResponse = await fetch('https://app.practicepanther.com/api/v2/contacts?per_page=1', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log(`Status: ${contactsResponse.status} ${contactsResponse.statusText}`);
      
      if (contactsResponse.ok) {
        const contactsData = await contactsResponse.json();
        console.log(`Contacts Total Count: ${contactsData.total_count || 'N/A'}`);
        console.log(`Contacts Data Length: ${contactsData.data?.length || 0}`);
      } else {
        const errorText = await contactsResponse.text();
        console.log(`Error: ${errorText.substring(0, 200)}...`);
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

debugMattersAPI(); 