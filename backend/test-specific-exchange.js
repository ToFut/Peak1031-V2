/**
 * Test script to get a specific exchange that we know has participants
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');

const testSpecificExchange = async () => {
  try {
    console.log('🧪 Testing specific exchange with participants...');
    
    // Create admin JWT token
    const adminUserId = '278304de-568f-4138-b35b-6fdcfbd2f1ce';
    const adminToken = jwt.sign(
      {
        userId: adminUserId,
        id: adminUserId,
        email: 'admin@peak1031.com',
        role: 'admin'
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    console.log('🎫 Created admin JWT token');
    
    const fetch = require('node-fetch');
    const baseURL = 'http://localhost:5001/api';
    const targetExchangeId = 'ba7865ac-da20-404a-b609-804d15cb0467';
    
    // Test 1: Get all exchanges and look for our target
    console.log('\\n📋 Test 1: Looking for target exchange in exchanges list...');
    
    const response = await fetch(`${baseURL}/exchanges?limit=100`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.log('❌ Failed to get exchanges:', response.status);
      return;
    }
    
    const data = await response.json();
    const exchanges = data.exchanges || [];
    
    console.log(`📊 Got ${exchanges.length} exchanges`);
    
    const targetExchange = exchanges.find(ex => ex.id === targetExchangeId);
    if (targetExchange) {
      console.log('✅ Found target exchange:', targetExchange.name);
      console.log('👥 Participants in target exchange:');
      console.log('   - exchange_participants:', targetExchange.exchange_participants?.length || 0);
      console.log('   - exchangeParticipants:', targetExchange.exchangeParticipants?.length || 0);
      
      if (targetExchange.exchange_participants && targetExchange.exchange_participants.length > 0) {
        console.log('📋 Sample participant:', targetExchange.exchange_participants[0]);
      } else if (targetExchange.exchangeParticipants && targetExchange.exchangeParticipants.length > 0) {
        console.log('📋 Sample participant:', targetExchange.exchangeParticipants[0]);
      } else {
        console.log('⚠️ No participants found in this exchange through API');
      }
    } else {
      console.log('❌ Target exchange not found in first 100 results');
      
      // Try to get more exchanges
      console.log('\\n📋 Trying larger limit...');
      const response2 = await fetch(`${baseURL}/exchanges?limit=500`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response2.ok) {
        const data2 = await response2.json();
        const exchanges2 = data2.exchanges || [];
        const targetExchange2 = exchanges2.find(ex => ex.id === targetExchangeId);
        
        if (targetExchange2) {
          console.log('✅ Found target exchange in larger result set:', targetExchange2.name);
          console.log('👥 Participants:', targetExchange2.exchange_participants?.length || targetExchange2.exchangeParticipants?.length || 0);
        } else {
          console.log('❌ Target exchange still not found in 500 results');
        }
      }
    }
    
    // Test 2: Get individual exchange details
    console.log('\\n📋 Test 2: Getting individual exchange details...');
    const individualResponse = await fetch(`${baseURL}/exchanges/${targetExchangeId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (individualResponse.ok) {
      const individualData = await individualResponse.json();
      console.log('✅ Individual exchange API works');
      console.log('📋 Exchange name:', individualData.name);
      console.log('👥 Has participants data:', !!individualData.participants);
    } else {
      console.log('❌ Individual exchange API failed:', individualResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testSpecificExchange();