require('dotenv').config();
const axios = require('axios');

async function testKicelianSearch() {
  console.log('🔍 Testing API Search for "Kicelian"\n');

  try {
    // First login to get a token
    console.log('1️⃣ Logging in as admin...');
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'admin@peak1031.com',
      password: 'admin123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Got token\n');

    // Test search with "Kicelian"
    console.log('2️⃣ Testing search API with "Kicelian"...');
    const searchResponse = await axios.get('http://localhost:5001/api/exchanges', {
      params: {
        search: 'Kicelian',
        limit: 20
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`Result: ${searchResponse.data.exchanges.length} exchanges returned`);
    console.log('Total count:', searchResponse.data.totalCount);
    
    // Check if our exchange is in the results
    const foundExchange = searchResponse.data.exchanges.find(e => 
      e.name && (e.name.toLowerCase().includes('kicelian') || 
                e.pp_display_name && e.pp_display_name.toLowerCase().includes('kicelian') ||
                e.pp_account_ref_display_name && e.pp_account_ref_display_name.toLowerCase().includes('kicelian'))
    );

    if (foundExchange) {
      console.log('✅ Found the exchange with Kicelian!');
      console.log('  - ID:', foundExchange.id);
      console.log('  - Name:', foundExchange.name);
      console.log('  - PP Display Name:', foundExchange.pp_display_name);
      console.log('  - PP Account Name:', foundExchange.pp_account_ref_display_name);
      console.log('  - Matter ID:', foundExchange.pp_matter_id);
    } else {
      console.log('❌ Exchange with Kicelian not found in search results');
      
      // Show all results to debug
      console.log('\nAll search results:');
      searchResponse.data.exchanges.forEach((e, i) => {
        console.log(`  ${i+1}. ${e.name || 'No name'} (ID: ${e.id})`);
        if (e.pp_display_name) console.log(`      PP Display: ${e.pp_display_name}`);
        if (e.pp_account_ref_display_name) console.log(`      PP Account: ${e.pp_account_ref_display_name}`);
      });
    }

    // Test with "Hector" 
    console.log('\n3️⃣ Testing search API with "Hector"...');
    const hectorResponse = await axios.get('http://localhost:5001/api/exchanges', {
      params: {
        search: 'Hector',
        limit: 20
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`Hector search result: ${hectorResponse.data.exchanges.length} exchanges returned`);

    // Test with matter ID "7869"
    console.log('\n4️⃣ Testing search API with "7869"...');
    const matterResponse = await axios.get('http://localhost:5001/api/exchanges', {
      params: {
        search: '7869',
        limit: 20
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`Matter ID search result: ${matterResponse.data.exchanges.length} exchanges returned`);

  } catch (error) {
    console.error('❌ Error testing search:', error.response?.data || error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure the backend server is running on port 5001');
    }
  }
}

testKicelianSearch();