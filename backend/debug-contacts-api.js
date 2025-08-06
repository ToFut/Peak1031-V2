require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

console.log('🔍 DEBUGGING PRACTICEPANTHER CONTACTS API\n');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function debugContactsAPI() {
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
    
    // Test different contacts API calls
    const testUrls = [
      'https://app.practicepanther.com/api/v2/contacts',
      'https://app.practicepanther.com/api/v2/contacts?per_page=1',
      'https://app.practicepanther.com/api/v2/contacts?limit=1',
      'https://app.practicepanther.com/api/v2/contacts?page=1',
      'https://app.practicepanther.com/api/v2/contacts?per_page=10&page=1'
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
            console.log('📋 Sample contacts:');
            data.data.slice(0, 2).forEach((contact, index) => {
              console.log(`  ${index + 1}. ${contact.first_name} ${contact.last_name} (${contact.id})`);
              console.log(`     Email: ${contact.email || 'N/A'}`);
              console.log(`     Company: ${contact.account_ref?.display_name || 'N/A'}`);
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
    
    // Test with the exact data you showed me
    console.log('\n🔍 TESTING WITH YOUR DATA FORMAT...');
    
    try {
      const response = await fetch('https://app.practicepanther.com/api/v2/contacts?per_page=5', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log(`Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const responseText = await response.text();
        console.log('\n📋 FULL RESPONSE:');
        console.log('='.repeat(80));
        console.log(responseText);
        console.log('='.repeat(80));
        
        // Try to parse as JSON
        try {
          const jsonData = JSON.parse(responseText);
          console.log('\n🔍 PARSED JSON:');
          console.log('Keys:', Object.keys(jsonData));
          console.log('Data type:', typeof jsonData.data);
          console.log('Data length:', Array.isArray(jsonData.data) ? jsonData.data.length : 'Not an array');
          console.log('Total count:', jsonData.total_count);
          
          if (jsonData.data && jsonData.data.length > 0) {
            console.log('\n📋 FIRST CONTACT:');
            const firstContact = jsonData.data[0];
            console.log('ID:', firstContact.id);
            console.log('Name:', firstContact.first_name, firstContact.last_name);
            console.log('Email:', firstContact.email);
            console.log('Company:', firstContact.account_ref?.display_name);
          }
          
        } catch (parseError) {
          console.log('❌ Failed to parse as JSON:', parseError.message);
        }
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

debugContactsAPI(); 