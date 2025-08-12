const fetch = require('node-fetch');

async function debugExchangeParticipants() {
  try {
    console.log('🔑 Logging in as client...');
    
    // Login first
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
    
    // Test multiple exchanges
    const testExchanges = [
      'ba7865ac-da20-404a-b609-804d15cb0467', // SEGEV DEMO exchange
      '9334eb38-d6ce-4e49-956b-0a38ef4382c9', // Another exchange
      'f2bd3d13-daa9-43dc-84bb-3b9c41a51c85'  // Test exchange
    ];
    
    for (const exchangeId of testExchanges) {
      console.log(`\n📋 Testing exchange: ${exchangeId}`);
      
      // First check exchange participants
      const participantsRes = await fetch(`http://localhost:5001/api/exchanges/${exchangeId}/participants`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (participantsRes.ok) {
        const participants = await participantsRes.json();
        console.log(`  ✅ Exchange has ${participants.length} participants`);
        if (participants.length > 0) {
          console.log('  Sample participants:', participants.slice(0, 2).map(p => ({
            name: p.name,
            email: p.email,
            role: p.role
          })));
        }
      } else {
        console.log(`  ❌ Failed to fetch participants: ${participantsRes.status}`);
      }
      
      // Now test assignees endpoint
      const assigneesRes = await fetch(`http://localhost:5001/api/tasks/assignees/valid?context=exchange&exchangeId=${exchangeId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const assigneesText = await assigneesRes.text();
      console.log(`  📋 Assignees response status: ${assigneesRes.status}`);
      
      try {
        const assignees = JSON.parse(assigneesText);
        if (assignees.success) {
          console.log(`  ✅ Valid assignees: ${assignees.data.total}`);
          if (assignees.data.assignees.length > 0) {
            console.log('  First assignee:', assignees.data.assignees[0]);
          } else {
            console.log('  ⚠️ No assignees returned even though exchange has participants!');
          }
        } else {
          console.log(`  ❌ Error:`, assignees);
        }
      } catch (e) {
        console.log(`  ❌ Failed to parse response:`, assigneesText);
      }
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

debugExchangeParticipants();