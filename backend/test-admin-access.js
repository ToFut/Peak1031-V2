// Use built-in fetch if available, otherwise require node-fetch
const fetch = global.fetch || require('node-fetch');

async function testAdminAccess() {
  const baseURL = 'http://localhost:5001/api';
  
  try {
    // 1. Login as admin
    console.log('🔐 Attempting to login as admin...');
    const loginResponse = await fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@peak1031.com',
        password: 'peak2025!'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);
    
    if (!loginData.token) {
      console.log('❌ Login failed');
      return;
    }
    
    const token = loginData.token;
    console.log('✅ Login successful');
    
    // 2. Test exchanges access
    console.log('\n📋 Testing exchanges access...');
    const exchangesResponse = await fetch(`${baseURL}/exchanges`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const exchangesData = await exchangesResponse.json();
    console.log('Exchanges response status:', exchangesResponse.status);
    console.log('Exchanges count:', exchangesData.exchanges ? exchangesData.exchanges.length : 0);
    
    if (exchangesData.exchanges && exchangesData.exchanges.length > 0) {
      const firstExchange = exchangesData.exchanges[0];
      console.log('First exchange:', firstExchange.name, firstExchange.id);
      
      // 3. Test messages access for first exchange
      console.log('\n💬 Testing messages access...');
      const messagesResponse = await fetch(`${baseURL}/messages/exchange/${firstExchange.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const messagesData = await messagesResponse.json();
      console.log('Messages response status:', messagesResponse.status);
      console.log('Messages count:', messagesData.data ? messagesData.data.length : 0);
      
      if (messagesResponse.status !== 200) {
        console.log('Messages error:', messagesData);
      }
    } else {
      console.log('❌ No exchanges found for admin');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAdminAccess();