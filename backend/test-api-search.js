require('dotenv').config();
const axios = require('axios');

async function testApiSearch() {
  console.log('🔍 Testing API Search for "860 London Green Way"\n');

  try {
    // First login to get a token
    console.log('1️⃣ Logging in as admin...');
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'admin@peak1031.com',
      password: 'admin123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Got token\n');

    // Test 1: Search with the search parameter
    console.log('2️⃣ Testing search API with "860 London Green"...');
    const searchResponse = await axios.get('http://localhost:5001/api/exchanges', {
      params: {
        search: '860 London Green',
        limit: 10
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`Result: ${searchResponse.data.exchanges.length} exchanges returned`);
    console.log('Total count:', searchResponse.data.totalCount);
    
    // Check if our exchange is in the results
    const foundExchange = searchResponse.data.exchanges.find(e => 
      e.name && e.name.includes('860 London Green')
    );

    if (foundExchange) {
      console.log('✅ Found the exchange!');
      console.log('  - ID:', foundExchange.id);
      console.log('  - Name:', foundExchange.name);
      console.log('  - Address:', foundExchange.rel_property_address || foundExchange.relPropertyAddress);
    } else {
      console.log('❌ Exchange not found in search results');
      
      // Show first few results
      console.log('\nFirst few results:');
      searchResponse.data.exchanges.slice(0, 3).forEach((e, i) => {
        console.log(`  ${i+1}. ${e.name || 'No name'}`);
      });
    }

    // Test 2: Get all exchanges to see if it exists
    console.log('\n3️⃣ Getting all exchanges to check if it exists...');
    const allResponse = await axios.get('http://localhost:5001/api/exchanges', {
      params: {
        limit: 500
      },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log(`Total exchanges fetched: ${allResponse.data.exchanges.length}`);
    
    const londonExchange = allResponse.data.exchanges.find(e => 
      (e.name && e.name.includes('860 London Green')) ||
      (e.rel_property_address && e.rel_property_address.includes('860 London Green')) ||
      (e.relPropertyAddress && e.relPropertyAddress.includes('860 London Green'))
    );

    if (londonExchange) {
      console.log('✅ Exchange exists in database!');
      console.log('  - ID:', londonExchange.id);
      console.log('  - Name:', londonExchange.name);
      console.log('  - Status:', londonExchange.status);
      console.log('  - Is Active:', londonExchange.is_active || londonExchange.isActive);
    } else {
      console.log('⚠️ Exchange not found in first 500 exchanges');
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Start the backend server first, then run this test
console.log('⚠️ Make sure the backend server is running on port 5001\n');
setTimeout(testApiSearch, 1000);