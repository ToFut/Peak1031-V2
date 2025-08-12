const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function verifyAgenciesSetup() {
  console.log('🔍 Verifying Agencies Setup...\n');
  
  let allGood = true;
  
  // 1. Check backend health
  console.log('1. Checking backend health...');
  try {
    const healthRes = await fetch('http://localhost:5001/api/health');
    const health = await healthRes.json();
    console.log('✅ Backend is healthy:', health.status);
  } catch (e) {
    console.error('❌ Backend not responding:', e.message);
    allGood = false;
  }
  
  // 2. Test admin login
  console.log('\n2. Testing admin login...');
  let adminToken = null;
  try {
    const loginRes = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: 'admin@peak1031.com', 
        password: 'admin123' 
      })
    });
    
    if (loginRes.ok) {
      const data = await loginRes.json();
      adminToken = data.token;
      console.log('✅ Admin login successful');
    } else {
      console.error('❌ Admin login failed:', loginRes.status);
      allGood = false;
    }
  } catch (e) {
    console.error('❌ Login error:', e.message);
    allGood = false;
  }
  
  // 3. Test agencies endpoint
  if (adminToken) {
    console.log('\n3. Testing /api/agencies endpoint...');
    try {
      const agenciesRes = await fetch('http://localhost:5001/api/agencies', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      
      if (agenciesRes.ok) {
        const data = await agenciesRes.json();
        console.log('✅ Agencies endpoint works');
        console.log('   - Success:', data.success);
        console.log('   - Count:', data.data?.length || 0);
        if (data.data && data.data.length > 0) {
          console.log('   - Sample agency:', data.data[0].display_name || data.data[0].email);
        }
      } else {
        console.error('❌ Agencies endpoint failed:', agenciesRes.status);
        allGood = false;
      }
    } catch (e) {
      console.error('❌ Agencies error:', e.message);
      allGood = false;
    }
  }
  
  // 4. Test agency user login
  console.log('\n4. Testing agency user login...');
  let agencyToken = null;
  try {
    const loginRes = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: 'agency@peak1031.com', 
        password: 'agency123' 
      })
    });
    
    if (loginRes.ok) {
      const data = await loginRes.json();
      agencyToken = data.token;
      console.log('✅ Agency user login successful');
    } else {
      console.error('❌ Agency user login failed:', loginRes.status);
      allGood = false;
    }
  } catch (e) {
    console.error('❌ Agency login error:', e.message);
    allGood = false;
  }
  
  // 5. Test agency-specific endpoints
  if (agencyToken) {
    console.log('\n5. Testing agency-specific endpoints...');
    const endpoints = ['/api/agency/stats', '/api/agency/third-parties'];
    
    for (const endpoint of endpoints) {
      try {
        const res = await fetch(`http://localhost:5001${endpoint}`, {
          headers: { 'Authorization': `Bearer ${agencyToken}` }
        });
        
        if (res.ok) {
          console.log(`✅ ${endpoint} works`);
        } else {
          console.error(`❌ ${endpoint} failed:`, res.status);
          allGood = false;
        }
      } catch (e) {
        console.error(`❌ ${endpoint} error:`, e.message);
        allGood = false;
      }
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  if (allGood) {
    console.log('✅ ALL CHECKS PASSED! The agencies system is working correctly.');
    console.log('\nNext steps:');
    console.log('1. Refresh your browser (Ctrl+F5 or Cmd+Shift+R)');
    console.log('2. Clear browser cache if needed');
    console.log('3. Navigate to http://localhost:3001/admin/agencies');
    console.log('4. You can also test at http://localhost:3001/test-agencies-relative.html');
  } else {
    console.log('❌ Some checks failed. Please review the errors above.');
  }
}

verifyAgenciesSetup();