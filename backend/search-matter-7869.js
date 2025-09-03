require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function searchMatter7869() {
  console.log('🔍 Searching for matter 7869 in PracticePanther...\n');
  
  try {
    // Get the access token
    const { data: tokenData } = await supabase
      .from('oauth_tokens')
      .select('access_token')
      .eq('provider', 'practicepanther')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();
    
    if (!tokenData || !tokenData.access_token) {
      console.log('❌ No valid token found');
      return;
    }
    
    const accessToken = tokenData.access_token;
    console.log('✅ Using stored access token\n');
    
    // Method 1: Try to search matters by number
    console.log('1️⃣ Searching matters by number...');
    try {
      const searchResponse = await axios.get(
        'https://app.practicepanther.com/api/v2/matters',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          },
          params: {
            'matter_number': '7869',
            'limit': 10
          }
        }
      );
      
      console.log('   Response received');
      const matters = Array.isArray(searchResponse.data) ? searchResponse.data : 
                      (searchResponse.data.items || searchResponse.data.data || []);
      
      if (matters.length > 0) {
        console.log(`   ✅ Found ${matters.length} matter(s)`);
        
        // Look for matter with number 7869
        const matter7869 = matters.find(m => 
          m.matter_number === '7869' || 
          m.matter_number === 7869 ||
          m.number === '7869' ||
          m.number === 7869
        );
        
        if (matter7869) {
          console.log('\n✅ Found matter 7869!');
          console.log('Matter details:');
          console.log(JSON.stringify(matter7869, null, 2));
          return matter7869;
        }
      } else {
        console.log('   No matters returned by number search');
      }
    } catch (error) {
      console.log('   Number search failed:', error.response?.data || error.message);
    }
    
    // Method 2: Try to get all matters and filter
    console.log('\n2️⃣ Fetching matters list to find 7869...');
    try {
      const listResponse = await axios.get(
        'https://app.practicepanther.com/api/v2/matters',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          },
          params: {
            'limit': 100,
            'offset': 0
          }
        }
      );
      
      const matters = Array.isArray(listResponse.data) ? listResponse.data : 
                      (listResponse.data.items || listResponse.data.data || []);
      
      console.log(`   Received ${matters.length} matters`);
      
      // Search through matters for 7869
      let found = null;
      for (const matter of matters) {
        // Check various fields where matter number might be
        if (matter.matter_number == '7869' || 
            matter.number == '7869' ||
            matter.display_number == '7869' ||
            matter.name?.includes('7869') ||
            matter.matter_name?.includes('7869')) {
          found = matter;
          break;
        }
      }
      
      if (found) {
        console.log('\n✅ Found matter 7869!');
        console.log('Matter ID (GUID):', found.id);
        console.log('Matter Number:', found.matter_number || found.number);
        console.log('Matter Name:', found.name || found.matter_name);
        
        // Now fetch full details using the GUID
        console.log('\n3️⃣ Fetching full matter details using GUID...');
        const detailResponse = await axios.get(
          `https://app.practicepanther.com/api/v2/matters/${found.id}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/json'
            }
          }
        );
        
        console.log('✅ Full matter data retrieved!');
        const fullData = detailResponse.data;
        
        // Show all fields
        console.log('\n📄 Complete Matter Data:');
        console.log(JSON.stringify(fullData, null, 2));
        
        // Update database
        console.log('\n4️⃣ Updating database...');
        await updateExchangeWithPPData(fullData);
        
        return fullData;
      } else {
        console.log('\n❌ Matter 7869 not found in first 100 matters');
        console.log('Sample matter numbers found:');
        matters.slice(0, 5).forEach(m => {
          console.log(`  - ${m.matter_number || m.number || 'no number'}: ${m.name || m.matter_name}`);
        });
      }
      
    } catch (error) {
      console.log('   List fetch failed:', error.response?.status, error.response?.statusText);
      if (error.response?.data) {
        console.log('   Error details:', error.response.data);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function updateExchangeWithPPData(ppData) {
  try {
    // Map PP fields to our database
    const updateData = {
      pp_matter_id: ppData.matter_number?.toString() || ppData.number?.toString() || ppData.id,
      pp_data: ppData, // Store complete PP data
      
      // Map known fields
      name: ppData.matter_name || ppData.name || ppData.display_name,
      
      // Try to map custom fields if they exist
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Extract custom fields if present
    if (ppData.custom_fields) {
      console.log('Found custom fields:', Object.keys(ppData.custom_fields).length);
      
      // Map custom fields to our schema
      const customFields = ppData.custom_fields;
      
      // These are the PP custom field names based on what you showed
      updateData.client_vesting = customFields.client_vesting || customFields.CLIENT_VESTING;
      updateData.bank = customFields.bank || customFields.BANK;
      updateData.proceeds = customFields.proceeds || customFields.PROCEEDS;
      updateData.rel_property_address = customFields.rel_property_address || customFields.REL_PROPERTY_ADDRESS;
      updateData.day_45 = customFields.day_45 || customFields.DAY_45;
      updateData.day_180 = customFields.day_180 || customFields.DAY_180;
    }
    
    // Update the exchange
    const { error } = await supabase
      .from('exchanges')
      .update(updateData)
      .eq('id', 'e00bfb0f-df96-438e-98f0-87ef91b708a7');
    
    if (error) {
      console.log('❌ Database update failed:', error.message);
    } else {
      console.log('✅ Database updated successfully!');
      console.log('   Updated fields:', Object.keys(updateData).length);
    }
    
  } catch (error) {
    console.error('❌ Update error:', error.message);
  }
}

// Run the search
searchMatter7869();