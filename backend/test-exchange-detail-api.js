const axios = require('axios');
const supabaseService = require('./services/supabase');

async function testExchangeDetailAPI() {
  try {
    console.log('🔍 Testing Exchange Detail API Response...\n');
    
    // First, get a sample exchange ID from the database
    const { data: exchanges } = await supabaseService.client
      .from('exchanges')
      .select('id, name')
      .limit(1);
    
    if (!exchanges || exchanges.length === 0) {
      console.log('No exchanges found in database');
      return;
    }
    
    const exchangeId = exchanges[0].id;
    console.log(`📋 Testing with exchange: ${exchanges[0].name} (${exchangeId})\n`);
    
    // Get admin token for authentication
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'admin@test.com',
      password: 'Peak2024!'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Authentication successful\n');
    
    // Call the exchange detail API
    const response = await axios.get(
      `http://localhost:5001/api/exchanges/${exchangeId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('📦 API Response Structure:');
    console.log('================================\n');
    
    const exchange = response.data;
    
    // Check key fields
    console.log('🏢 Basic Information:');
    console.log(`  - ID: ${exchange.id}`);
    console.log(`  - Name: ${exchange.name || exchange.exchangeName}`);
    console.log(`  - Exchange Number: ${exchange.exchangeNumber || exchange.exchange_number}`);
    console.log(`  - Status: ${exchange.status}`);
    console.log(`  - Type: ${exchange.exchangeType || exchange.exchange_type}`);
    
    console.log('\n🏠 Property Information:');
    console.log(`  - Property Address: ${exchange.propertyAddress || 'undefined'}`);
    console.log(`  - Rel Property Address: ${exchange.relPropertyAddress || 'undefined'}`);
    console.log(`  - rel_property_address: ${exchange.rel_property_address || 'undefined'}`);
    console.log(`  - Property Sold Address: ${exchange.propertySoldAddress || 'undefined'}`);
    console.log(`  - property_sold_address: ${exchange.property_sold_address || 'undefined'}`);
    
    console.log('\n💰 Value Information:');
    console.log(`  - Exchange Value: ${exchange.exchangeValue || 'undefined'}`);
    console.log(`  - exchange_value: ${exchange.exchange_value || 'undefined'}`);
    console.log(`  - Relinquished Value: ${exchange.relinquishedValue || 'undefined'}`);
    console.log(`  - relinquished_property_value: ${exchange.relinquished_property_value || 'undefined'}`);
    console.log(`  - relinquishedPropertyValue: ${exchange.relinquishedPropertyValue || 'undefined'}`);
    
    console.log('\n📅 Date Information:');
    console.log(`  - Close of Escrow Date: ${exchange.closeOfEscrowDate || 'undefined'}`);
    console.log(`  - close_of_escrow_date: ${exchange.close_of_escrow_date || 'undefined'}`);
    console.log(`  - Sale Date: ${exchange.saleDate || 'undefined'}`);
    console.log(`  - sale_date: ${exchange.sale_date || 'undefined'}`);
    console.log(`  - Expected Closing Date: ${exchange.expectedClosingDate || 'undefined'}`);
    console.log(`  - Forty Five Day Deadline: ${exchange.fortyFiveDayDeadline || 'undefined'}`);
    console.log(`  - forty_five_day_deadline: ${exchange.forty_five_day_deadline || 'undefined'}`);
    console.log(`  - One Eighty Day Deadline: ${exchange.oneEightyDayDeadline || 'undefined'}`);
    console.log(`  - one_eighty_day_deadline: ${exchange.one_eighty_day_deadline || 'undefined'}`);
    
    console.log('\n👥 People Information:');
    console.log(`  - Client: ${exchange.client ? JSON.stringify(exchange.client) : 'null'}`);
    console.log(`  - Coordinator: ${exchange.coordinator ? JSON.stringify(exchange.coordinator) : 'null'}`);
    console.log(`  - Client ID: ${exchange.clientId || exchange.client_id || 'undefined'}`);
    console.log(`  - Coordinator ID: ${exchange.coordinatorId || exchange.coordinator_id || 'undefined'}`);
    
    console.log('\n📊 Exchange Participants:');
    if (exchange.exchangeParticipants) {
      console.log(`  - Count: ${exchange.exchangeParticipants.length}`);
    } else if (exchange.exchange_participants) {
      console.log(`  - Count: ${exchange.exchange_participants.length}`);
    } else {
      console.log('  - No participants field found');
    }
    
    console.log('\n🔑 All Top-Level Keys:');
    console.log('================================');
    Object.keys(exchange).forEach(key => {
      const value = exchange[key];
      const type = Array.isArray(value) ? 'array' : typeof value;
      const preview = type === 'string' ? value.substring(0, 50) : 
                       type === 'number' ? value :
                       type === 'boolean' ? value :
                       type === 'array' ? `[${value.length} items]` :
                       type === 'object' && value !== null ? '{object}' : 
                       'null';
      console.log(`  ${key}: ${preview} (${type})`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testExchangeDetailAPI();