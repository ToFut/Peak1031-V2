const fetch = require('node-fetch');

async function testSimpleAssignment() {
  try {
    console.log('🔑 Logging in as admin...');
    
    // Login first
    const loginRes = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@peak1031.com',
        password: 'admin123'
      })
    });
    
    if (!loginRes.ok) {
      console.log('❌ Login failed:', await loginRes.text());
      return;
    }
    
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('✅ Login successful');
    
    // Test: Check database table structure
    console.log('\n📋 Test: Check exchange participants table');
    const checkRes = await fetch('http://localhost:5001/api/admin/data-integrity', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'exchange_participants' ORDER BY ordinal_position"
      })
    });
    
    console.log('📋 Table structure check status:', checkRes.status);
    const checkResult = await checkRes.text();
    console.log('📋 Table structure response:', checkResult);
    
    // Try a direct query to exchange_participants
    console.log('\n📋 Test: Query exchange participants directly');
    const queryRes = await fetch('http://localhost:5001/api/admin/data-integrity', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        query: "SELECT * FROM exchange_participants LIMIT 5"
      })
    });
    
    console.log('📋 Direct query status:', queryRes.status);
    const queryResult = await queryRes.text();
    console.log('📋 Direct query response:', queryResult);
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testSimpleAssignment();