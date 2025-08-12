const fetch = require('node-fetch');

async function testTaskCreation() {
  try {
    // First get a valid auth token
    console.log('🔑 Attempting login...');
    const loginRes = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@peak1031.com',
        password: 'admin123'
      })
    });
    
    if (!loginRes.ok) {
      const errorText = await loginRes.text();
      console.log('❌ Login failed:', errorText);
      return;
    }
    
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('✅ Login successful, got token');
    
    // Get existing exchanges to find a valid exchange ID
    console.log('🔍 Fetching exchanges...');
    const exchangesRes = await fetch('http://localhost:5001/api/exchanges', {
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!exchangesRes.ok) {
      console.log('❌ Failed to fetch exchanges:', await exchangesRes.text());
      return;
    }
    
    const exchangesData = await exchangesRes.json();
    console.log('📊 Found exchanges:', exchangesData.exchanges?.length || 0);
    
    let exchangeId = null;
    if (exchangesData.exchanges && exchangesData.exchanges.length > 0) {
      exchangeId = exchangesData.exchanges[0].id;
      console.log('✅ Using exchange ID:', exchangeId);
    } else {
      // Use a dummy UUID if no exchanges exist
      exchangeId = '123e4567-e89b-12d3-a456-426614174000';
      console.log('⚠️  No exchanges found, using dummy ID:', exchangeId);
    }
    
    // Now test task creation
    console.log('📋 Creating test task...');
    const taskData = {
      title: 'Test Task Creation',
      description: 'Testing task creation functionality from script',
      exchange_id: exchangeId,
      priority: 'MEDIUM',
      status: 'PENDING'
    };
    
    console.log('📋 Task data:', JSON.stringify(taskData, null, 2));
    
    const taskRes = await fetch('http://localhost:5001/api/tasks', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(taskData)
    });
    
    console.log('📋 Task creation response status:', taskRes.status);
    const taskResult = await taskRes.text();
    console.log('📋 Task creation response:', taskResult);
    
    if (taskRes.ok) {
      console.log('✅ Task creation successful!');
    } else {
      console.log('❌ Task creation failed');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testTaskCreation();