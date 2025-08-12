const fetch = require('node-fetch');

async function testAssignmentRestrictions() {
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
    
    // Test 1: Get valid assignees for exchange context
    console.log('\n📋 Test 1: Get valid assignees for exchange context');
    const exchangeId = 'f2bd3d13-daa9-43dc-84bb-3b9c41a51c85';
    
    const exchangeAssigneesRes = await fetch(`http://localhost:5001/api/tasks/assignees/valid?context=exchange&exchangeId=${exchangeId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('📋 Exchange assignees status:', exchangeAssigneesRes.status);
    const exchangeAssigneesResult = await exchangeAssigneesRes.text();
    console.log('📋 Exchange assignees response:', exchangeAssigneesResult);
    
    // Test 2: Get valid assignees for dashboard context
    console.log('\n📋 Test 2: Get valid assignees for dashboard context');
    const dashboardAssigneesRes = await fetch('http://localhost:5001/api/tasks/assignees/valid?context=dashboard', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('📋 Dashboard assignees status:', dashboardAssigneesRes.status);
    const dashboardAssigneesResult = await dashboardAssigneesRes.text();
    console.log('📋 Dashboard assignees response:', dashboardAssigneesResult);
    
    // Test 3: Try to create task with valid assignment
    console.log('\n📋 Test 3: Create task with valid assignment');
    const validTaskData = {
      title: 'Test Assignment Validation - Valid',
      description: 'Testing valid assignment to exchange participant',
      exchange_id: exchangeId,
      exchangeId: exchangeId,
      priority: 'MEDIUM',
      status: 'PENDING',
      assigned_to: null, // Will be set based on available assignees
      assignedTo: null,
      due_date: null,
      dueDate: null
    };
    
    // Parse the exchange assignees response to get a valid assignee
    let validAssigneeId = null;
    try {
      const exchangeData = JSON.parse(exchangeAssigneesResult);
      if (exchangeData.success && exchangeData.data.assignees.length > 0) {
        validAssigneeId = exchangeData.data.assignees[0].id;
        validTaskData.assigned_to = validAssigneeId;
        validTaskData.assignedTo = validAssigneeId;
        console.log('📋 Using valid assignee:', validAssigneeId);
      }
    } catch (error) {
      console.log('⚠️ Could not parse exchange assignees, creating task without assignment');
    }
    
    const validTaskRes = await fetch('http://localhost:5001/api/tasks', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(validTaskData)
    });
    
    console.log('📋 Valid task creation status:', validTaskRes.status);
    const validTaskResult = await validTaskRes.text();
    console.log('📋 Valid task creation response:', validTaskResult);
    
    // Test 4: Try to create task with invalid assignment (fake user ID)
    console.log('\n📋 Test 4: Create task with invalid assignment');
    const invalidTaskData = {
      title: 'Test Assignment Validation - Invalid',
      description: 'Testing invalid assignment to non-participant',
      exchange_id: exchangeId,
      exchangeId: exchangeId,
      priority: 'MEDIUM',
      status: 'PENDING',
      assigned_to: '00000000-0000-0000-0000-000000000000', // Fake user ID
      assignedTo: '00000000-0000-0000-0000-000000000000',
      due_date: null,
      dueDate: null
    };
    
    const invalidTaskRes = await fetch('http://localhost:5001/api/tasks', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(invalidTaskData)
    });
    
    console.log('📋 Invalid task creation status:', invalidTaskRes.status);
    const invalidTaskResult = await invalidTaskRes.text();
    console.log('📋 Invalid task creation response:', invalidTaskResult);
    
    console.log('\n✅ Assignment restriction tests completed!');
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testAssignmentRestrictions();