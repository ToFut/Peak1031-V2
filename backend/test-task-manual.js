const fetch = require('node-fetch');

async function testManualTaskCreation() {
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
    
    // Test manual task creation (similar to frontend)
    console.log('📋 Creating manual task...');
    const taskData = {
      title: 'Manual Test Task',
      description: 'Testing manual task creation from script',
      exchange_id: 'f2bd3d13-daa9-43dc-84bb-3b9c41a51c85', // Use known exchange
      exchangeId: 'f2bd3d13-daa9-43dc-84bb-3b9c41a51c85', // Duplicate for compatibility
      priority: 'MEDIUM',
      status: 'PENDING',
      assigned_to: null,
      assignedTo: null,
      due_date: null,
      dueDate: null
    };
    
    console.log('📋 Manual task data:', JSON.stringify(taskData, null, 2));
    
    const taskRes = await fetch('http://localhost:5001/api/tasks', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(taskData)
    });
    
    console.log('📋 Manual task creation status:', taskRes.status);
    const taskResult = await taskRes.text();
    console.log('📋 Manual task creation response:', taskResult);
    
    if (taskRes.ok) {
      console.log('✅ Manual task creation successful!');
    } else {
      console.log('❌ Manual task creation failed');
    }
    
    // Test natural language task creation
    console.log('🌟 Testing natural language task creation...');
    const nlTaskData = {
      text: 'Upload property identification document by Friday',
      exchangeId: 'f2bd3d13-daa9-43dc-84bb-3b9c41a51c85'
    };
    
    const nlRes = await fetch('http://localhost:5001/api/tasks/natural-language', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(nlTaskData)
    });
    
    console.log('🌟 Natural language task status:', nlRes.status);
    const nlResult = await nlRes.text();
    console.log('🌟 Natural language task response:', nlResult);
    
    if (nlRes.ok) {
      console.log('✅ Natural language task creation successful!');
    } else {
      console.log('❌ Natural language task creation failed');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testManualTaskCreation();