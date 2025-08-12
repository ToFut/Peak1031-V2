const fetch = require('node-fetch');

async function testAgenciesEndpoint() {
  try {
    console.log('Testing /api/agencies endpoint...');
    
    // Login as admin
    const loginRes = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@peak1031.com', password: 'admin123' })
    });
    
    if (!loginRes.ok) {
      console.error('❌ Failed to login');
      const error = await loginRes.text();
      console.error('Login error:', error);
      return;
    }
    
    const { token } = await loginRes.json();
    console.log('✅ Logged in successfully');
    
    // Test the agencies endpoint
    console.log('Testing GET /api/agencies...');
    const agenciesRes = await fetch('http://localhost:5001/api/agencies', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('Status:', agenciesRes.status);
    console.log('Headers:', Object.fromEntries(agenciesRes.headers.entries()));
    
    if (agenciesRes.ok) {
      const data = await agenciesRes.json();
      console.log('✅ Success! Got agencies response:');
      console.log('Response keys:', Object.keys(data));
      if (data.data && Array.isArray(data.data)) {
        console.log(`Found ${data.data.length} agencies`);
        if (data.data.length > 0) {
          console.log('Sample agency:', JSON.stringify(data.data[0], null, 2));
        }
      } else {
        console.log('Full response:', JSON.stringify(data, null, 2));
      }
    } else {
      const error = await agenciesRes.text();
      console.error('❌ Error:', agenciesRes.status, error);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testAgenciesEndpoint();