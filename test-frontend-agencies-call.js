const fetch = require('node-fetch');

async function testFrontendAgenciesCall() {
  try {
    console.log('🔍 Testing agencies API as frontend would call it...');
    
    // Get admin token
    const loginRes = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: 'admin@peak1031.com', 
        password: 'admin123' 
      })
    });
    
    if (!loginRes.ok) {
      console.error('❌ Login failed');
      return;
    }
    
    const { token } = await loginRes.json();
    console.log('✅ Admin login successful');
    
    // Test the exact URL the frontend would use
    const frontendUrl = 'http://localhost:5001/api/agencies';
    console.log('Testing URL:', frontendUrl);
    
    const agenciesRes = await fetch(frontendUrl, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      }
    });
    
    console.log('Response status:', agenciesRes.status);
    console.log('Response headers:', Object.fromEntries(agenciesRes.headers.entries()));
    
    if (agenciesRes.ok) {
      const data = await agenciesRes.json();
      console.log('✅ SUCCESS! Agencies endpoint works');
      console.log('Response:', {
        success: data.success,
        dataCount: data.data?.length || 0,
        pagination: data.pagination
      });
      
      if (data.data && data.data.length > 0) {
        console.log('Sample agency:', {
          id: data.data[0].id,
          display_name: data.data[0].display_name,
          email: data.data[0].email
        });
      }
    } else {
      const errorText = await agenciesRes.text();
      console.error('❌ FAILED:', agenciesRes.status, agenciesRes.statusText);
      console.error('Error response:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testFrontendAgenciesCall();