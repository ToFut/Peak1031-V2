require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

console.log('🔍 DEBUGGING PRACTICEPANTHER API RESPONSE FORMAT\n');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function debugResponseFormat() {
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
    
    // Test contacts with full response logging
    console.log('\n👥 TESTING CONTACTS API (FULL RESPONSE)...');
    
    try {
      const contactsResponse = await fetch('https://app.practicepanther.com/api/v2/contacts?per_page=1', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log(`Status: ${contactsResponse.status} ${contactsResponse.statusText}`);
      console.log(`Headers:`, Object.fromEntries(contactsResponse.headers.entries()));
      
      const responseText = await contactsResponse.text();
      console.log('\n📋 FULL RESPONSE BODY:');
      console.log('='.repeat(80));
      console.log(responseText);
      console.log('='.repeat(80));
      
      // Try to parse as JSON
      try {
        const jsonData = JSON.parse(responseText);
        console.log('\n🔍 PARSED JSON STRUCTURE:');
        console.log('Keys:', Object.keys(jsonData));
        
        if (jsonData.data) {
          console.log('Data type:', typeof jsonData.data);
          console.log('Data length:', Array.isArray(jsonData.data) ? jsonData.data.length : 'Not an array');
        }
        
        if (jsonData.total_count !== undefined) {
          console.log('Total count:', jsonData.total_count);
        }
        
      } catch (parseError) {
        console.log('❌ Failed to parse as JSON:', parseError.message);
      }
      
    } catch (error) {
      console.log(`❌ Contacts API Error: ${error.message}`);
    }
    
    // Test matters with full response logging
    console.log('\n📄 TESTING MATTERS API (FULL RESPONSE)...');
    
    try {
      const mattersResponse = await fetch('https://app.practicepanther.com/api/v2/matters?per_page=1', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log(`Status: ${mattersResponse.status} ${mattersResponse.statusText}`);
      
      const responseText = await mattersResponse.text();
      console.log('\n📋 FULL RESPONSE BODY:');
      console.log('='.repeat(80));
      console.log(responseText);
      console.log('='.repeat(80));
      
      // Try to parse as JSON
      try {
        const jsonData = JSON.parse(responseText);
        console.log('\n🔍 PARSED JSON STRUCTURE:');
        console.log('Keys:', Object.keys(jsonData));
        
        if (jsonData.data) {
          console.log('Data type:', typeof jsonData.data);
          console.log('Data length:', Array.isArray(jsonData.data) ? jsonData.data.length : 'Not an array');
        }
        
        if (jsonData.total_count !== undefined) {
          console.log('Total count:', jsonData.total_count);
        }
        
      } catch (parseError) {
        console.log('❌ Failed to parse as JSON:', parseError.message);
      }
      
    } catch (error) {
      console.log(`❌ Matters API Error: ${error.message}`);
    }
    
    // Test with different parameters
    console.log('\n🧪 TESTING DIFFERENT PARAMETERS...');
    
    const testUrls = [
      'https://app.practicepanther.com/api/v2/contacts',
      'https://app.practicepanther.com/api/v2/contacts?limit=1',
      'https://app.practicepanther.com/api/v2/contacts?page=1',
      'https://app.practicepanther.com/api/v2/contacts?per_page=1&page=1'
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
        
        console.log(`Status: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`Response keys: ${Object.keys(data).join(', ')}`);
          console.log(`Has data: ${!!data.data}`);
          console.log(`Data length: ${data.data?.length || 0}`);
          console.log(`Total count: ${data.total_count || 'N/A'}`);
        }
        
      } catch (error) {
        console.log(`Error: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

debugResponseFormat(); 