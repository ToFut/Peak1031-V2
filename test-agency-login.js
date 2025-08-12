const fetch = require('node-fetch');

async function testAgencyLogin() {
  try {
    console.log('Testing agency login...');
    
    // Test agency login
    const loginRes = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: 'agency@peak1031.com', 
        password: 'agency123' 
      })
    });
    
    console.log('Login response status:', loginRes.status);
    
    if (loginRes.ok) {
      const data = await loginRes.json();
      console.log('✅ Agency login successful!');
      console.log('User info:', {
        email: data.user?.email,
        role: data.user?.role,
        name: `${data.user?.first_name} ${data.user?.last_name}`
      });
      return data.token;
    } else {
      const error = await loginRes.text();
      console.error('❌ Agency login failed:', error);
      
      // Also test if user exists
      console.log('\nTesting user existence...');
      const debugRes = await fetch('http://localhost:5001/api/debug/users');
      if (debugRes.ok) {
        const debugData = await debugRes.json();
        const agencyUser = debugData.users?.find(u => u.email === 'agency@peak1031.com');
        if (agencyUser) {
          console.log('✅ Agency user exists in database:', {
            id: agencyUser.id,
            email: agencyUser.email,
            role: agencyUser.role,
            is_active: agencyUser.is_active,
            name: `${agencyUser.first_name} ${agencyUser.last_name}`
          });
        } else {
          console.log('❌ Agency user NOT found in database');
          console.log('Available users:', debugData.users?.map(u => ({
            email: u.email,
            role: u.role,
            is_active: u.is_active
          })));
        }
      }
      return null;
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return null;
  }
}

testAgencyLogin();