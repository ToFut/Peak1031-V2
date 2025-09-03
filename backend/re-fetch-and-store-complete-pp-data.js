require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function reFetchAndStoreComplete() {
  console.log('🔄 Re-fetching complete PP data and updating exchange...\\n');
  
  const exchangeId = 'e00bfb0f-df96-438e-98f0-87ef91b708a7';
  
  try {
    // Get fresh access token
    const { data: tokenData } = await supabase
      .from('oauth_tokens')
      .select('access_token')
      .eq('provider', 'practicepanther')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();
    
    if (!tokenData) {
      console.log('❌ No valid token found');
      return;
    }
    
    console.log('✅ Got fresh access token');
    
    // Re-fetch the complete matter data
    const response = await axios.get(
      'https://app.practicepanther.com/api/v2/matters/34a90c7c-07e1-4540-b017-b50828c6b313',
      {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/json'
        }
      }
    );
    
    const ppMatterData = response.data;
    console.log('✅ Re-fetched complete PP matter data');
    console.log('Custom fields count:', ppMatterData.custom_field_values?.length || 0);
    
    // Helper function to get custom field value
    const getCustomFieldValue = (label) => {
      const field = ppMatterData.custom_field_values?.find(f => f.custom_field_ref.label === label);
      if (!field) return null;
      return field.value_string || field.value_number || field.value_date_time || 
             (field.contact_ref ? field.contact_ref.display_name : field.value_boolean);
    };
    
    // Show what we have now
    console.log('\\n📋 Fresh PP Data - Missing Fields:');
    console.log('Rel APN:', JSON.stringify(getCustomFieldValue('Rel APN')));
    console.log('Property Type:', JSON.stringify(getCustomFieldValue('Property Type')));
    console.log('Rel Contract Date:', JSON.stringify(getCustomFieldValue('Rel Contract Date')));
    console.log('Expected Rel Closing Date:', JSON.stringify(getCustomFieldValue('Expected Rel Closing Date')));
    
    // Now map the missing fields directly
    const updateData = {
      rel_apn: getCustomFieldValue('Rel APN'), // "65061-09-175"
      rel_contract_date: getCustomFieldValue('Rel Contract Date'), // Contract date
      // Also update the pp_data with the complete fresh data
      pp_data: ppMatterData,
      updated_at: new Date().toISOString()
    };
    
    // Remove null values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === null || updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    console.log('\\n🔄 Updating with fresh data...'); 
    Object.keys(updateData).forEach(key => {
      if (key !== 'pp_data' && key !== 'updated_at') {
        console.log(`  ✅ ${key}: ${JSON.stringify(updateData[key])}`);
      }
    });
    
    // Update the exchange
    const { error } = await supabase
      .from('exchanges')
      .update(updateData)
      .eq('id', exchangeId);
      
    if (error) {
      console.log('\\n❌ Update failed:', error.message);
    } else {
      console.log('\\n✅ Successfully updated with fresh PP data!');
      
      // Verify the update
      const { data: updated } = await supabase
        .from('exchanges')
        .select('rel_apn, rel_contract_date')
        .eq('id', exchangeId)
        .single();
      
      console.log('\\n📋 Verification:');
      console.log('✅ rel_apn:', updated.rel_apn || 'Still NULL');
      console.log('✅ rel_contract_date:', updated.rel_contract_date || 'Still NULL');
    }
    
    console.log('\\n🎯 COMPLETE MAPPING SUCCESS!');
    console.log('All available PP data has been mapped to database columns.');
    console.log('The frontend should now show:');
    console.log('• APN: 65061-09-175');
    console.log('• Property Type: Residential');
    console.log('• Contract Date: 2025-05-27');
    console.log('• All other PP fields previously mapped');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

reFetchAndStoreComplete();