require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// First, let's try to get auth working
async function testDirectPPConnection() {
  console.log('🔍 Attempting to fetch matter 7869 from PracticePanther...\n');
  
  try {
    // Check if we have credentials
    if (!process.env.PP_CLIENT_ID || !process.env.PP_CLIENT_SECRET) {
      console.log('❌ Missing PracticePanther credentials in .env:');
      console.log('   PP_CLIENT_ID:', process.env.PP_CLIENT_ID ? '✅ Set' : '❌ Missing');
      console.log('   PP_CLIENT_SECRET:', process.env.PP_CLIENT_SECRET ? '✅ Set' : '❌ Missing');
      return;
    }
    
    console.log('✅ PracticePanther credentials found\n');
    
    // Step 1: Check if we have a stored token
    console.log('1️⃣ Checking for stored OAuth token...');
    const { data: tokenData } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('provider', 'practicepanther')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    let accessToken = null;
    
    if (tokenData) {
      console.log('   Found token in database');
      const expiresAt = new Date(tokenData.expires_at);
      const now = new Date();
      
      if (expiresAt > now) {
        console.log('   ✅ Token is still valid');
        accessToken = tokenData.access_token;
      } else if (tokenData.refresh_token) {
        console.log('   ⚠️ Token expired, attempting refresh...');
        
        // Try to refresh the token
        try {
          const refreshResponse = await axios.post(
            'https://app.practicepanther.com/OAuth/Token',
            new URLSearchParams({
              grant_type: 'refresh_token',
              refresh_token: tokenData.refresh_token,
              client_id: process.env.PP_CLIENT_ID,
              client_secret: process.env.PP_CLIENT_SECRET
            }),
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
              }
            }
          );
          
          if (refreshResponse.data.access_token) {
            console.log('   ✅ Token refreshed successfully');
            accessToken = refreshResponse.data.access_token;
            
            // Store the new token
            const newExpiresAt = new Date(Date.now() + (refreshResponse.data.expires_in * 1000));
            await supabase
              .from('oauth_tokens')
              .update({
                access_token: refreshResponse.data.access_token,
                refresh_token: refreshResponse.data.refresh_token || tokenData.refresh_token,
                expires_at: newExpiresAt.toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', tokenData.id);
          }
        } catch (refreshError) {
          console.log('   ❌ Token refresh failed:', refreshError.response?.data?.error || refreshError.message);
        }
      } else {
        console.log('   ❌ Token expired and no refresh token available');
      }
    } else {
      console.log('   ❌ No token found in database');
    }
    
    if (!accessToken) {
      console.log('\n❌ Cannot proceed without valid authentication');
      console.log('\n📝 To authenticate with PracticePanther:');
      console.log('1. Generate auth URL with PP_CLIENT_ID and redirect URI');
      console.log('2. User authorizes and gets authorization code');
      console.log('3. Exchange code for access token');
      console.log('\nWould you like me to generate the auth URL for you?');
      
      // Generate auth URL for manual authentication
      const authUrl = `https://app.practicepanther.com/OAuth/Authorize?` +
        `response_type=code&` +
        `client_id=${process.env.PP_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(process.env.PP_REDIRECT_URI || 'http://localhost:5001/api/pp/callback')}&` +
        `state=${Math.random().toString(36).substring(7)}`;
      
      console.log('\n🔗 Auth URL (open in browser):');
      console.log(authUrl);
      
      return;
    }
    
    // Step 2: Try to fetch matter 7869
    console.log('\n2️⃣ Fetching matter 7869...');
    
    try {
      const response = await axios.get(
        'https://app.practicepanther.com/api/v2/matters/7869',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          }
        }
      );
      
      console.log('   ✅ Successfully fetched matter 7869!\n');
      console.log('📄 Matter Data:');
      console.log(JSON.stringify(response.data, null, 2));
      
      // Step 3: Update our database
      console.log('\n3️⃣ Updating database...');
      
      const ppData = response.data;
      
      // Find the existing exchange
      const { data: existingExchange } = await supabase
        .from('exchanges')
        .select('id')
        .eq('id', 'e00bfb0f-df96-438e-98f0-87ef91b708a7')
        .single();
      
      if (existingExchange) {
        // Update with PP data
        const updateData = {
          pp_matter_id: '7869', // Set correct PP matter ID
          pp_data: ppData, // Store all PP data
          
          // Map specific fields
          client_vesting: ppData.client_vesting,
          bank: ppData.bank,
          proceeds: ppData.proceeds,
          rel_property_address: ppData.rel_property_address,
          rel_property_city: ppData.rel_property_city,
          rel_property_state: ppData.rel_property_state,
          rel_property_zip: ppData.rel_property_zip,
          rel_apn: ppData.rel_apn,
          rel_escrow_number: ppData.rel_escrow_number,
          rel_value: ppData.rel_value,
          rel_contract_date: ppData.rel_contract_date,
          close_of_escrow_date: ppData.close_of_escrow_date,
          day_45: ppData.day_45,
          day_180: ppData.day_180,
          
          // Update timestamps
          last_sync_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { error } = await supabase
          .from('exchanges')
          .update(updateData)
          .eq('id', existingExchange.id);
        
        if (error) {
          console.log('   ❌ Database update failed:', error.message);
        } else {
          console.log('   ✅ Database updated successfully!');
          console.log('\n🎉 Matter 7869 has been synced from PracticePanther!');
          console.log('   Exchange ID: e00bfb0f-df96-438e-98f0-87ef91b708a7');
          console.log('   PP Matter ID: 7869');
          console.log('   Data fields populated:', Object.keys(ppData).length);
        }
      } else {
        console.log('   ❌ Exchange not found in database');
      }
      
    } catch (apiError) {
      console.log('   ❌ API request failed:', apiError.response?.status, apiError.response?.statusText);
      
      if (apiError.response?.status === 401) {
        console.log('   Token is invalid or expired');
      } else if (apiError.response?.status === 404) {
        console.log('   Matter 7869 not found in PracticePanther');
      } else {
        console.log('   Error:', apiError.response?.data || apiError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the test
testDirectPPConnection();