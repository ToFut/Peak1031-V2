/**
 * Test script to verify admin user can access all exchanges
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');

const testAdminExchangeAccess = async () => {
  try {
    console.log('🧪 Testing admin exchange access fix...');
    
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
    
    // Test exchanges endpoint
    const fetch = require('node-fetch');
    const apiUrl = 'http://localhost:5001/api';
    
    console.log('📡 Testing GET /exchanges endpoint...');
    const exchangesResponse = await fetch(`${apiUrl}/exchanges`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Exchanges Response Status:', exchangesResponse.status);
    
    if (exchangesResponse.ok) {
      const exchangesData = await exchangesResponse.json();
      console.log('✅ Exchanges Response Structure:', {
        hasData: !!exchangesData.data,
        dataType: typeof exchangesData.data,
        dataLength: exchangesData.data?.length,
        hasExchanges: !!exchangesData.exchanges,
        exchangesLength: exchangesData.exchanges?.length,
        keys: Object.keys(exchangesData),
        totalCount: exchangesData.totalCount || exchangesData.count || exchangesData.total
      });
      
      const exchanges = exchangesData.data || exchangesData.exchanges || exchangesData;
      const exchangeCount = Array.isArray(exchanges) ? exchanges.length : 0;
      console.log('✅ Exchanges Retrieved:', exchangeCount);
      
      if (exchanges && exchangeCount > 0) {
        console.log('📋 Sample exchange:', {
          id: exchanges[0].id,
          name: exchanges[0].name,
          status: exchanges[0].status
        });
        
        // Test messages for the specific exchange
        const testExchangeId = 'ba7865ac-da20-404a-b609-804d15cb0467';
        console.log(`📨 Testing messages for exchange: ${testExchangeId}`);
        
        const messagesResponse = await fetch(`${apiUrl}/messages/exchange/${testExchangeId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('💬 Messages Response Status:', messagesResponse.status);
        
        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json();
          console.log('✅ Messages Retrieved:', messagesData.data?.length || 0);
          
          if (messagesData.data && messagesData.data.length > 0) {
            console.log('💬 Sample message:', {
              id: messagesData.data[0].id,
              content: messagesData.data[0].content?.substring(0, 50) + '...',
              sender_id: messagesData.data[0].sender_id
            });
          }
        } else {
          const messagesError = await messagesResponse.text();
          console.log('❌ Messages Error:', messagesError);
        }
      }
    } else {
      const exchangesError = await exchangesResponse.text();
      console.log('❌ Exchanges Error:', exchangesError);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testAdminExchangeAccess();