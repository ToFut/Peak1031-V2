const fetch = require('node-fetch');

async function testAdminApiCall() {
  console.log('🧪 Testing admin API call to /api/exchanges...\n');
  
  // Login as admin first
  const loginResponse = await fetch('http://localhost:5001/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'admin@peak1031.com',
      password: 'admin123'
    })
  });
  
  if (!loginResponse.ok) {
    console.error('Login failed:', loginResponse.status);
    return;
  }
  
  const loginData = await loginResponse.json();
  const token = loginData.token;
  console.log('✅ Login successful');
  
  // Now call the exchanges endpoint
  const exchangesResponse = await fetch('http://localhost:5001/api/exchanges', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  console.log('API Response status:', exchangesResponse.status, exchangesResponse.statusText);
  
  if (!exchangesResponse.ok) {
    const errorText = await exchangesResponse.text();
    console.error('API Error:', errorText);
    return;
  }
  
  const exchangesData = await exchangesResponse.json();
  console.log('Total exchanges returned:', exchangesData.data?.length || 0);
  
  // Look for SEGEV DEMO specifically
  const segevExchange = exchangesData.data?.find(ex => ex.id === 'ba7865ac-da20-404a-b609-804d15cb0467');
  
  if (segevExchange) {
    console.log('\n✅ SEGEV DEMO found in API response:');
    console.log('- Name:', segevExchange.name);
    console.log('- Status:', segevExchange.status);
    console.log('- Participants:', segevExchange.exchangeParticipants?.length || 0);
  } else {
    console.log('\n❌ SEGEV DEMO NOT found in API response');
    
    if (exchangesData.data && exchangesData.data.length > 0) {
      console.log('\nFirst few exchanges returned:');
      exchangesData.data.slice(0, 3).forEach(ex => {
        console.log(`- ${ex.name} (${ex.id.substring(0, 8)}...)`);
      });
    }
  }
}

testAdminApiCall().catch(console.error);