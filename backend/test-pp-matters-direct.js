require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

console.log('📄 TESTING PRACTICEPANTHER MATTERS API DIRECTLY\n');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testMattersDirect() {
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
    
    // Test different matters API endpoints
    const testUrls = [
      'https://app.practicepanther.com/api/v2/matters',
      'https://app.practicepanther.com/api/v2/matters?per_page=10',
      'https://app.practicepanther.com/api/v2/matters?limit=10',
      'https://app.practicepanther.com/api/v2/matters?page=1',
      'https://app.practicepanther.com/api/v2/matters?per_page=10&page=1',
      'https://app.practicepanther.com/api/v2/matters?status=active',
      'https://app.practicepanther.com/api/v2/matters?status=open',
      'https://app.practicepanther.com/api/v2/matters?status=closed',
      'https://app.practicepanther.com/api/v2/matters?matter_type=1031_exchange',
      'https://app.practicepanther.com/api/v2/matters?matter_type=exchange',
      'https://app.practicepanther.com/api/v2/matters?matter_type=1031'
    ];
    
    for (const url of testUrls) {
      console.log(`\n📡 Testing: ${url}`);
      
      try {
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        console.log(`Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`Response keys: ${Object.keys(data).join(', ')}`);
          console.log(`Has data: ${!!data.data}`);
          console.log(`Data length: ${data.data?.length || 0}`);
          console.log(`Total count: ${data.total_count || 'N/A'}`);
          
          if (data.data && data.data.length > 0) {
            console.log('📋 Sample matters:');
            data.data.slice(0, 3).forEach((matter, index) => {
              console.log(`  ${index + 1}. ${matter.name || 'N/A'} (${matter.id})`);
              console.log(`     Status: ${matter.status || 'N/A'}`);
              console.log(`     Type: ${matter.matter_type || 'N/A'}`);
            });
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
    
    // Test if we can get matters by client
    console.log('\n👥 TESTING MATTERS BY CLIENT...');
    
    try {
      // First get a contact to use as client
      const contactsResponse = await fetch('https://app.practicepanther.com/api/v2/contacts?per_page=1', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (contactsResponse.ok) {
        const contactsData = await contactsResponse.json();
        if (contactsData.data && contactsData.data.length > 0) {
          const contact = contactsData.data[0];
          console.log(`Using contact: ${contact.display_name} (${contact.id})`);
          
          // Try to get matters for this client
          const clientMattersUrl = `https://app.practicepanther.com/api/v2/matters?client_id=${contact.id}`;
          console.log(`Testing: ${clientMattersUrl}`);
          
          const clientMattersResponse = await fetch(clientMattersUrl, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          });
          
          console.log(`Status: ${clientMattersResponse.status} ${clientMattersResponse.statusText}`);
          
          if (clientMattersResponse.ok) {
            const clientMattersData = await clientMattersResponse.json();
            console.log(`Client matters count: ${clientMattersData.total_count || 'N/A'}`);
            console.log(`Client matters data length: ${clientMattersData.data?.length || 0}`);
          } else {
            const errorText = await clientMattersResponse.text();
            console.log(`Error: ${errorText.substring(0, 150)}...`);
          }
        }
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    // Test if there are any matters at all by checking the raw response
    console.log('\n🔍 CHECKING RAW MATTERS RESPONSE...');
    
    try {
      const rawResponse = await fetch('https://app.practicepanther.com/api/v2/matters', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log(`Status: ${rawResponse.status} ${rawResponse.statusText}`);
      
      const responseText = await rawResponse.text();
      console.log('\n📋 RAW RESPONSE:');
      console.log('='.repeat(80));
      console.log(responseText);
      console.log('='.repeat(80));
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testMattersDirect(); 