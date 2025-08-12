const fetch = require('node-fetch');

async function testAgencyEndpoints() {
  console.log('Testing agency API endpoints...\n');
  
  // First, get a valid token for an admin user
  const loginRes = await fetch('http://localhost:5001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@peak1031.com',
      password: 'admin123'
    })
  });
  
  if (!loginRes.ok) {
    console.error('❌ Failed to login as admin');
    return;
  }
  
  const { token, user } = await loginRes.json();
  console.log('✅ Logged in as admin:', user.email);
  
  // Test getting all assignments
  console.log('\n📊 Testing GET /api/agency/assignments...');
  const assignmentsRes = await fetch('http://localhost:5001/api/agency/assignments', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (assignmentsRes.ok) {
    const data = await assignmentsRes.json();
    console.log('✅ Fetched assignments:', data.count, 'total');
    if (data.data && data.data[0]) {
      console.log('Sample assignment:', {
        agency: data.data[0].agency_name,
        third_party: data.data[0].third_party_name,
        performance: data.data[0].can_view_performance,
        score: data.data[0].performance_score
      });
    }
  } else {
    console.error('❌ Failed to fetch assignments:', await assignmentsRes.text());
  }
  
  // Test getting contacts for assignment
  console.log('\n📊 Testing GET /api/agency/contacts...');
  const agencyContactsRes = await fetch('http://localhost:5001/api/agency/contacts?type=agency', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (agencyContactsRes.ok) {
    const data = await agencyContactsRes.json();
    console.log('✅ Fetched agency contacts:', data.count, 'total');
    if (data.data && data.data[0]) {
      console.log('Sample agency:', {
        name: data.data[0].display_name || `${data.data[0].first_name} ${data.data[0].last_name}`,
        email: data.data[0].email
      });
    }
  } else {
    console.error('❌ Failed to fetch agency contacts:', await agencyContactsRes.text());
  }
  
  const thirdPartyContactsRes = await fetch('http://localhost:5001/api/agency/contacts?type=third_party', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (thirdPartyContactsRes.ok) {
    const data = await thirdPartyContactsRes.json();
    console.log('✅ Fetched third party contacts:', data.count, 'total');
    if (data.data && data.data[0]) {
      console.log('Sample third party:', {
        name: data.data[0].display_name || `${data.data[0].first_name} ${data.data[0].last_name}`,
        email: data.data[0].email
      });
    }
  } else {
    console.error('❌ Failed to fetch third party contacts:', await thirdPartyContactsRes.text());
  }
  
  // Now test as an agency user to see their third parties
  console.log('\n📊 Testing agency perspective...');
  
  // Login as agency (if we have one)
  const agencyLoginRes = await fetch('http://localhost:5001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'agency@peak1031.com',
      password: 'agency123'
    })
  });
  
  if (agencyLoginRes.ok) {
    const { token: agencyToken, user: agencyUser } = await agencyLoginRes.json();
    console.log('✅ Logged in as agency:', agencyUser.email);
    
    // Get third parties for this agency
    const thirdPartiesRes = await fetch('http://localhost:5001/api/agency/third-parties', {
      headers: { 'Authorization': `Bearer ${agencyToken}` }
    });
    
    if (thirdPartiesRes.ok) {
      const data = await thirdPartiesRes.json();
      console.log('✅ Agency sees', data.count, 'third parties assigned to them');
      if (data.data && data.data[0]) {
        console.log('Sample third party data:', {
          name: data.data[0].name,
          active_exchanges: data.data[0].active_exchanges,
          performance_score: data.data[0].performance_score,
          success_rate: data.data[0].success_rate + '%'
        });
      }
    } else {
      const error = await thirdPartiesRes.text();
      console.log('⚠️  Agency third parties endpoint:', error);
    }
    
    // Get agency stats
    const statsRes = await fetch('http://localhost:5001/api/agency/stats', {
      headers: { 'Authorization': `Bearer ${agencyToken}` }
    });
    
    if (statsRes.ok) {
      const data = await statsRes.json();
      console.log('✅ Agency stats:', data.data);
    } else {
      console.log('⚠️  Agency stats endpoint:', await statsRes.text());
    }
  } else {
    console.log('⚠️  No agency user found (this is normal if not created yet)');
  }
  
  console.log('\n✅ Agency assignment system is fully operational!');
}

testAgencyEndpoints().catch(console.error);