const PPTokenManager = require('./services/ppTokenManager');
const axios = require('axios');

async function checkPPTables() {
  try {
    console.log('🔍 Checking what PracticePanther tables/endpoints are available...\n');
    
    const tokenManager = new PPTokenManager();
    const storedToken = await tokenManager.getStoredToken();
    
    if (!storedToken) {
      console.error('❌ No stored token found');
      return;
    }
    
    // Test various PP API endpoints to see what's available
    const endpoints = [
      { name: 'Contacts', url: 'https://app.practicepanther.com/api/v2/contacts?limit=1' },
      { name: 'Accounts', url: 'https://app.practicepanther.com/api/v2/accounts?limit=1' },
      { name: 'Matters', url: 'https://app.practicepanther.com/api/v2/matters?limit=1' },
      { name: 'Tasks', url: 'https://app.practicepanther.com/api/v2/tasks?limit=1' },
      { name: 'Notes', url: 'https://app.practicepanther.com/api/v2/notes?limit=1' },
      { name: 'Documents', url: 'https://app.practicepanther.com/api/v2/documents?limit=1' },
      { name: 'Time Entries', url: 'https://app.practicepanther.com/api/v2/time_entries?limit=1' },
      { name: 'Invoices', url: 'https://app.practicepanther.com/api/v2/invoices?limit=1' },
      { name: 'Expenses', url: 'https://app.practicepanther.com/api/v2/expenses?limit=1' },
      { name: 'Calendar Events', url: 'https://app.practicepanther.com/api/v2/calendar_events?limit=1' },
      { name: 'Users', url: 'https://app.practicepanther.com/api/v2/users?limit=1' },
      { name: 'Practice Areas', url: 'https://app.practicepanther.com/api/v2/practice_areas?limit=1' }
    ];
    
    console.log('📊 Testing PP API endpoints...\n');
    
    const available = [];
    const unavailable = [];
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(endpoint.url, {
          headers: {
            'Authorization': `Bearer ${storedToken.access_token}`,
            'Accept': 'application/json'
          },
          timeout: 8000
        });
        
        const count = Array.isArray(response.data) ? response.data.length : (response.data ? 1 : 0);
        console.log(`✅ ${endpoint.name.padEnd(15)} - Available, returned ${count} items`);
        available.push(endpoint.name);
        
      } catch (error) {
        const status = error.response?.status || 'Network';
        const message = error.response?.statusText || error.message;
        console.log(`❌ ${endpoint.name.padEnd(15)} - Error: ${status} ${message}`);
        unavailable.push(`${endpoint.name} (${status})`);
      }
    }
    
    console.log(`\n📈 Summary:`);
    console.log(`✅ Available endpoints: ${available.length}`);
    console.log(`❌ Unavailable endpoints: ${unavailable.length}`);
    
    if (available.length > 0) {
      console.log(`\n🎯 Available tables to sync:`);
      available.forEach(table => console.log(`   • ${table}`));
    }
    
    if (unavailable.length > 0) {
      console.log(`\n⚠️  Unavailable tables:`);
      unavailable.forEach(table => console.log(`   • ${table}`));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

checkPPTables();