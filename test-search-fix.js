// Use built-in fetch (Node.js 18+) or fallback to a simple test
const fetch = globalThis.fetch || require('node-fetch').default || require('node-fetch');

async function testSearchFix() {
  try {
    console.log('🔍 Testing search fix...');
    
    // First, login to get a token
    console.log('1. Getting authentication token...');
    const loginResponse = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@peak1031.com',
        password: 'admin123'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    
    if (!token) {
      throw new Error('No token received from login');
    }
    
    console.log('✅ Got authentication token');
    
    // Now test the search that was failing
    console.log('2. Testing search with "segev"...');
    const searchResponse = await fetch('http://localhost:5001/api/exchanges?search=segev&limit=5', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Search response status: ${searchResponse.status}`);
    
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      throw new Error(`Search failed: ${searchResponse.status} - ${errorText}`);
    }
    
    const searchData = await searchResponse.json();
    console.log('✅ Search successful!');
    console.log(`Found ${searchData.exchanges?.length || 0} exchanges`);
    
    if (searchData.exchanges?.length > 0) {
      console.log('First exchange:', {
        id: searchData.exchanges[0].id,
        name: searchData.exchanges[0].name,
        status: searchData.exchanges[0].status
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSearchFix();