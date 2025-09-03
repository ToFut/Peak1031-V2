require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { transformToCamelCase, transformApiResponse } = require('./utils/caseTransform');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSingleExchangeAPI() {
  console.log('🧪 Testing single exchange API response...\\n');
  
  const exchangeId = 'e00bfb0f-df96-438e-98f0-87ef91b708a7';
  
  try {
    // Replicate the exact query from the API endpoint
    const { data: exchange, error } = await supabase
      .from('exchanges')
      .select(`
        *,
        client:people!client_id (
          id,
          first_name,
          last_name,
          email,
          company,
          phone,
          address_street
        ),
        coordinator:people!coordinator_id (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', exchangeId)
      .single();

    if (error) {
      console.log('❌ Query error:', error.message);
      return;
    }

    console.log('📋 RAW DATABASE DATA:');
    console.log('bank:', JSON.stringify(exchange.bank));
    console.log('day_45:', JSON.stringify(exchange.day_45));
    console.log('day_180:', JSON.stringify(exchange.day_180));
    console.log('client_vesting:', JSON.stringify(exchange.client_vesting));
    console.log('rel_property_address:', JSON.stringify(exchange.rel_property_address));
    console.log('rep_1_property_address:', JSON.stringify(exchange.rep_1_property_address));
    console.log('proceeds:', JSON.stringify(exchange.proceeds));
    console.log('rel_value:', JSON.stringify(exchange.rel_value));
    console.log('rep_1_value:', JSON.stringify(exchange.rep_1_value));

    // Apply the same transformations as the API
    const enhancedExchangeRaw = {
      ...transformApiResponse(exchange),
      tasks: [],
      recentMessages: [],
      statistics: {
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        recentActivityCount: 0
      }
    };

    const finalResponse = transformToCamelCase(enhancedExchangeRaw);

    console.log('\\n🔄 AFTER API TRANSFORMATIONS:');
    console.log('bank:', JSON.stringify(finalResponse.bank));
    console.log('day_45:', JSON.stringify(finalResponse.day_45));
    console.log('day_180:', JSON.stringify(finalResponse.day_180));
    console.log('client_vesting:', JSON.stringify(finalResponse.client_vesting));
    console.log('rel_property_address:', JSON.stringify(finalResponse.rel_property_address));
    console.log('rep_1_property_address:', JSON.stringify(finalResponse.rep_1_property_address));
    console.log('proceeds:', JSON.stringify(finalResponse.proceeds));
    console.log('rel_value:', JSON.stringify(finalResponse.rel_value));
    console.log('rep_1_value:', JSON.stringify(finalResponse.rep_1_value));

    console.log('\\n✨ CRITICAL FIELDS FOR FRONTEND:');
    const criticalFields = {
      bank: finalResponse.bank,
      day_45: finalResponse.day_45,
      day_180: finalResponse.day_180,
      client_vesting: finalResponse.client_vesting,
      rel_property_address: finalResponse.rel_property_address,
      rep_1_property_address: finalResponse.rep_1_property_address
    };
    
    console.log('Critical fields mapping:');
    Object.keys(criticalFields).forEach(key => {
      console.log(`  ${key}: ${JSON.stringify(criticalFields[key])}`);
    });

    console.log('\\n🚨 ISSUE IDENTIFIED:');
    console.log('The API is converting snake_case to camelCase, but the ExchangeOverview component');
    console.log('expects snake_case field names (day_45, client_vesting, etc.)');
    console.log('\\nFrontend expects: day_45, day_180, client_vesting, rel_property_address');
    console.log('API returns: day45, day180, clientVesting, relPropertyAddress');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSingleExchangeAPI();