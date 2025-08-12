const fetch = require('node-fetch');

async function testAgenciesNoStats() {
  try {
    console.log('🔍 Testing /api/agencies without stats...');
    
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
    
    // Test with includeStats=false
    const agenciesRes = await fetch('http://localhost:5001/api/agencies?includeStats=false', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('Response status:', agenciesRes.status);
    
    if (agenciesRes.ok) {
      const data = await agenciesRes.json();
      console.log('✅ /api/agencies (no stats) works:', {
        success: data.success,
        count: data.data?.length || 0,
        pagination: data.pagination
      });
      
      if (data.data && data.data.length > 0) {
        console.log('Sample agency:', {
          id: data.data[0].id,
          display_name: data.data[0].display_name,
          email: data.data[0].email,
          hasStats: !!data.data[0].stats
        });
      }
    } else {
      const error = await agenciesRes.text();
      console.error('❌ Failed:', error);
    }
    
    // Test with includeStats=true (default)
    console.log('\n🔍 Testing with includeStats=true...');
    const agenciesWithStatsRes = await fetch('http://localhost:5001/api/agencies?includeStats=true', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('Response status:', agenciesWithStatsRes.status);
    
    if (agenciesWithStatsRes.ok) {
      const data = await agenciesWithStatsRes.json();
      console.log('✅ /api/agencies (with stats) works:', {
        success: data.success,
        count: data.data?.length || 0
      });
    } else {
      const error = await agenciesWithStatsRes.text();
      console.error('❌ Failed:', error);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testAgenciesNoStats();