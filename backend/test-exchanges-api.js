#!/usr/bin/env node

const fetch = require('node-fetch');

async function testExchanges() {
  try {
    console.log('🔍 Testing Exchanges API...');
    
    // First login
    const loginRes = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@peak1031.com',
        password: 'admin123'
      })
    });
    
    if (!loginRes.ok) {
      console.log('❌ Login failed:', loginRes.status);
      return;
    }
    
    const { token } = await loginRes.json();
    console.log('✅ Login successful');
    
    // Test exchanges endpoint
    const exchangesRes = await fetch('http://localhost:5001/api/exchanges', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('📋 Exchanges response status:', exchangesRes.status);
    
    if (exchangesRes.ok) {
      const exchangesData = await exchangesRes.json();
      console.log('📋 Raw response:', JSON.stringify(exchangesData, null, 2));
      
      console.log('📋 Data structure analysis:', {
        isArray: Array.isArray(exchangesData),
        hasData: !!exchangesData.data,
        dataIsArray: Array.isArray(exchangesData.data),
        keys: Object.keys(exchangesData),
        totalItems: Array.isArray(exchangesData) ? exchangesData.length : 
                   Array.isArray(exchangesData.data) ? exchangesData.data.length : 'unknown'
      });
      
      if (Array.isArray(exchangesData)) {
        console.log('✅ Direct array format:', exchangesData.length, 'exchanges');
        exchangesData.slice(0, 3).forEach(ex => {
          console.log(`  - ${ex.exchange_number || ex.number} (${ex.id}) - ${ex.status}`);
        });
      } else if (exchangesData.data && Array.isArray(exchangesData.data)) {
        console.log('✅ Wrapped array format:', exchangesData.data.length, 'exchanges');
        exchangesData.data.slice(0, 3).forEach(ex => {
          console.log(`  - ${ex.exchange_number || ex.number} (${ex.id}) - ${ex.status}`);
        });
      } else {
        console.log('❌ Unexpected format - Keys:', Object.keys(exchangesData));
        console.log('❌ Sample data:', exchangesData);
      }
    } else {
      const error = await exchangesRes.text();
      console.log('❌ Exchanges fetch failed:', error);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testExchanges();