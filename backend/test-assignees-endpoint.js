const fetch = require('node-fetch');

async function testAssigneesEndpoint() {
  try {
    console.log('🔑 Logging in as client...');
    
    // Login first as client
    const loginRes = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'client@peak1031.com',
        password: 'client123'
      })
    });
    
    if (!loginRes.ok) {
      console.log('❌ Login failed:', await loginRes.text());
      return;
    }
    
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('✅ Login successful');
    
    // Test 1: Get assignees for exchange context
    console.log('\n📋 Test 1: Get valid assignees for specific exchange');
    const exchangeId = '9334eb38-d6ce-4e49-956b-0a38ef4382c9'; // A known exchange
    
    const exchangeAssigneesRes = await fetch(`http://localhost:5001/api/tasks/assignees/valid?context=exchange&exchangeId=${exchangeId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('📋 Exchange assignees status:', exchangeAssigneesRes.status);
    const exchangeAssigneesText = await exchangeAssigneesRes.text();
    
    try {
      const exchangeAssignees = JSON.parse(exchangeAssigneesText);
      if (exchangeAssignees.success) {
        console.log('✅ Exchange assignees:', {
          total: exchangeAssignees.data.total,
          assignees: exchangeAssignees.data.assignees.slice(0, 3).map(a => ({
            name: a.name,
            email: a.email,
            role: a.role
          }))
        });
      } else {
        console.log('❌ Exchange assignees error:', exchangeAssignees);
      }
    } catch (e) {
      console.log('❌ Exchange assignees response:', exchangeAssigneesText);
    }
    
    // Test 2: Get assignees for dashboard context
    console.log('\n📋 Test 2: Get valid assignees for dashboard context');
    const dashboardAssigneesRes = await fetch('http://localhost:5001/api/tasks/assignees/valid?context=dashboard', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('📋 Dashboard assignees status:', dashboardAssigneesRes.status);
    const dashboardAssigneesText = await dashboardAssigneesRes.text();
    
    try {
      const dashboardAssignees = JSON.parse(dashboardAssigneesText);
      if (dashboardAssignees.success) {
        console.log('✅ Dashboard assignees:', {
          total: dashboardAssignees.data.total,
          assignees: dashboardAssignees.data.assignees.slice(0, 3).map(a => ({
            name: a.name,
            email: a.email,
            role: a.role
          }))
        });
      } else {
        console.log('❌ Dashboard assignees error:', dashboardAssignees);
      }
    } catch (e) {
      console.log('❌ Dashboard assignees response:', dashboardAssigneesText);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testAssigneesEndpoint();