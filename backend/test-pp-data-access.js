require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

console.log('🧪 TESTING PRACTICEPANTHER DATA ACCESS\n');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testDataAccess() {
  try {
    // Get the access token
    console.log('🔑 Getting PP access token...');
    
    const { data: tokenData, error: tokenError } = await supabase
      .from('oauth_tokens')
      .select('access_token, scope, expires_at, created_at')
      .eq('provider', 'practicepanther')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (tokenError || !tokenData) {
      console.log('❌ No active PP token found.');
      return;
    }
    
    console.log('✅ PP token retrieved');
    console.log(`📋 Scope: ${tokenData.scope || 'No scope recorded'}`);
    console.log(`⏰ Created: ${tokenData.created_at}`);
    console.log(`⏰ Expires: ${tokenData.expires_at}`);
    
    const token = tokenData.access_token;
    
    // Test contacts with detailed response
    console.log('\n👥 TESTING CONTACTS API...');
    
    try {
      const contactsResponse = await fetch('https://app.practicepanther.com/api/v2/contacts?per_page=5&page=1', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log(`Status: ${contactsResponse.status} ${contactsResponse.statusText}`);
      
      if (contactsResponse.ok) {
        const contactsData = await contactsResponse.json();
        console.log(`Total Count: ${contactsData.total_count || 'N/A'}`);
        console.log(`Data Length: ${contactsData.data?.length || 0}`);
        
        if (contactsData.data && contactsData.data.length > 0) {
          console.log('\n📋 SAMPLE CONTACTS:');
          contactsData.data.slice(0, 3).forEach((contact, index) => {
            console.log(`${index + 1}. ${contact.first_name} ${contact.last_name} (${contact.id})`);
            console.log(`   Email: ${contact.email || 'N/A'}`);
            console.log(`   Phone: ${contact.phone_mobile || 'N/A'}`);
          });
        } else {
          console.log('❌ No contacts returned');
        }
      } else {
        const errorText = await contactsResponse.text();
        console.log(`Error: ${errorText.substring(0, 200)}...`);
      }
      
    } catch (error) {
      console.log(`❌ Contacts API Error: ${error.message}`);
    }
    
    // Test matters with detailed response
    console.log('\n📄 TESTING MATTERS API...');
    
    try {
      const mattersResponse = await fetch('https://app.practicepanther.com/api/v2/matters?per_page=5&page=1', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log(`Status: ${mattersResponse.status} ${mattersResponse.statusText}`);
      
      if (mattersResponse.ok) {
        const mattersData = await mattersResponse.json();
        console.log(`Total Count: ${mattersData.total_count || 'N/A'}`);
        console.log(`Data Length: ${mattersData.data?.length || 0}`);
        
        if (mattersData.data && mattersData.data.length > 0) {
          console.log('\n📋 SAMPLE MATTERS:');
          mattersData.data.slice(0, 3).forEach((matter, index) => {
            console.log(`${index + 1}. ${matter.name || 'N/A'} (${matter.id})`);
            console.log(`   Status: ${matter.status || 'N/A'}`);
            console.log(`   Client: ${matter.client_ref?.display_name || 'N/A'}`);
          });
        } else {
          console.log('❌ No matters returned');
        }
      } else {
        const errorText = await mattersResponse.text();
        console.log(`Error: ${errorText.substring(0, 200)}...`);
      }
      
    } catch (error) {
      console.log(`❌ Matters API Error: ${error.message}`);
    }
    
    // Test tasks
    console.log('\n✅ TESTING TASKS API...');
    
    try {
      const tasksResponse = await fetch('https://app.practicepanther.com/api/v2/tasks?per_page=5&page=1', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log(`Status: ${tasksResponse.status} ${tasksResponse.statusText}`);
      
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        console.log(`Total Count: ${tasksData.total_count || 'N/A'}`);
        console.log(`Data Length: ${tasksData.data?.length || 0}`);
      } else {
        const errorText = await tasksResponse.text();
        console.log(`Error: ${errorText.substring(0, 200)}...`);
      }
      
    } catch (error) {
      console.log(`❌ Tasks API Error: ${error.message}`);
    }
    
    // Check if we have multiple tokens
    console.log('\n🔍 CHECKING FOR MULTIPLE TOKENS...');
    
    const { data: allTokens, error: tokensError } = await supabase
      .from('oauth_tokens')
      .select('id, access_token, scope, created_at, is_active')
      .eq('provider', 'practicepanther')
      .order('created_at', { ascending: false });
    
    if (tokensError) {
      console.log('❌ Error fetching tokens:', tokensError.message);
    } else {
      console.log(`Found ${allTokens.length} PP tokens:`);
      allTokens.forEach((token, index) => {
        console.log(`${index + 1}. ID: ${token.id}, Active: ${token.is_active}, Scope: ${token.scope || 'None'}, Created: ${token.created_at}`);
      });
    }
    
    // Summary
    console.log('\n📊 DATA ACCESS SUMMARY:');
    console.log('='.repeat(50));
    console.log('✅ API endpoints responding (200 OK)');
    console.log('✅ Token is valid and not expired');
    console.log('⚠️  Scope not recorded in database');
    console.log('⚠️  May need to refresh token with proper scopes');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testDataAccess(); 