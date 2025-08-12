const fetch = require('node-fetch');

async function testCompleteAgencyFlow() {
  try {
    console.log('🎯 Testing complete agency user flow...');
    
    // Step 1: Test agency user login
    console.log('\n1. Testing agency user login...');
    const loginRes = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: 'agency@peak1031.com', 
        password: 'agency123' 
      })
    });
    
    if (!loginRes.ok) {
      const error = await loginRes.text();
      console.error('❌ Agency login failed:', error);
      return;
    }
    
    const { token, user } = await loginRes.json();
    console.log('✅ Agency login successful:', {
      email: user.email,
      role: user.role,
      name: `${user.first_name} ${user.last_name}`
    });
    
    // Step 2: Test accessing agencies endpoint as admin
    console.log('\n2. Testing /api/agencies endpoint (admin access)...');
    
    // First get admin token
    const adminLoginRes = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: 'admin@peak1031.com', 
        password: 'admin123' 
      })
    });
    
    if (!adminLoginRes.ok) {
      console.error('❌ Admin login failed');
      return;
    }
    
    const { token: adminToken } = await adminLoginRes.json();
    
    const agenciesRes = await fetch('http://localhost:5001/api/agencies', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    if (agenciesRes.ok) {
      const agenciesData = await agenciesRes.json();
      console.log('✅ /api/agencies accessible:', {
        success: agenciesData.success,
        count: agenciesData.data?.length || 0,
        pagination: agenciesData.pagination
      });
      
      if (agenciesData.data && agenciesData.data.length > 0) {
        console.log('Sample agency:', {
          id: agenciesData.data[0].id,
          display_name: agenciesData.data[0].display_name,
          email: agenciesData.data[0].email
        });
      }
    } else {
      const error = await agenciesRes.text();
      console.error('❌ /api/agencies failed:', agenciesRes.status, error);
    }
    
    // Step 3: Test agency-specific endpoints
    console.log('\n3. Testing agency-specific endpoints...');
    
    const agencyEndpoints = [
      '/api/agency/stats',
      '/api/agency/third-parties',
      '/api/agency/exchanges'
    ];
    
    for (const endpoint of agencyEndpoints) {
      try {
        const res = await fetch(`http://localhost:5001${endpoint}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          console.log(`✅ ${endpoint}:`, {
            success: data.success,
            dataCount: data.data?.length || (typeof data.data === 'object' ? 'object' : 'unknown')
          });
        } else {
          const error = await res.text();
          console.log(`❌ ${endpoint}:`, res.status, error.substring(0, 100));
        }
      } catch (e) {
        console.log(`❌ ${endpoint}: ${e.message}`);
      }
    }
    
    console.log('\n🎉 Agency flow test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCompleteAgencyFlow();