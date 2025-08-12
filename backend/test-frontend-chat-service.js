/**
 * Test script to simulate what the frontend chat service is doing
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');

const testFrontendChatService = async () => {
  try {
    console.log('🧪 Testing frontend chat service behavior for admin...');
    
    // Create admin JWT token (same way frontend does)
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
    
    // Simulate the exact same call that frontend chatService.getExchanges() makes
    const fetch = require('node-fetch');
    const baseURL = 'http://localhost:5001/api';
    
    console.log('📋 ChatService: Fetching exchanges for user:', adminUserId);
    
    const response = await fetch(`${baseURL}/exchanges`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    console.log('📋 Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Error response:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('📋 Raw exchanges data structure:', {
      keys: Object.keys(data),
      hasSuccess: 'success' in data,
      success: data.success,
      hasExchanges: 'exchanges' in data,
      exchangesLength: data.exchanges?.length,
      hasData: 'data' in data,
      dataLength: data.data?.length,
      totalCount: data.total || data.totalCount || data.count
    });
    
    // Apply the same logic as frontend chatService
    if (!data.success && data.success !== undefined) {
      console.log('❌ Success check failed, would throw error:', data.error || 'Failed to fetch exchanges');
      return;
    }
    
    const exchanges = data.exchanges || data.data || data || [];
    console.log('📋 Found', exchanges.length, 'exchanges');
    
    if (!Array.isArray(exchanges)) {
      console.log('⚠️ Exchanges data is not an array:', typeof exchanges);
      return;
    }
    
    if (exchanges.length > 0) {
      console.log('📋 Sample exchange structure:', {
        id: exchanges[0].id,
        name: exchanges[0].name,
        exchange_name: exchanges[0].exchange_name,
        status: exchanges[0].status,
        hasParticipants: 'exchangeParticipants' in exchanges[0],
        hasExchangeParticipants: 'exchange_participants' in exchanges[0],
        hasParticipantsField: 'participants' in exchanges[0],
        participantKeys: exchanges[0].exchangeParticipants ? Object.keys(exchanges[0].exchangeParticipants[0] || {}) : 'none',
        participantCount: exchanges[0].exchangeParticipants?.length || exchanges[0].exchange_participants?.length || exchanges[0].participants?.length || 0
      });
      
      // Test transformation to ChatExchange
      const transformedExchanges = exchanges.map((exchange, index) => {
        if (!exchange.id) {
          console.log(`⚠️ Exchange ${index} missing id:`, exchange);
          return null;
        }
        
        const participants = [];
        const participantsList = exchange.exchangeParticipants || exchange.exchange_participants || exchange.participants || [];
        
        console.log(`🔍 Exchange ${exchange.name}: participants list type:`, typeof participantsList, 'length:', participantsList.length);
        
        return {
          id: exchange.id,
          exchange_name: exchange.name || exchange.exchange_name || exchange.title || 'Unnamed Exchange',
          status: exchange.status || 'PENDING',
          last_message: undefined,
          unread_count: 0,
          participants: participants
        };
      }).filter(ex => ex !== null);
      
      console.log('✅ Successfully transformed', transformedExchanges.length, 'exchanges for chat interface');
      
      if (transformedExchanges.length > 0) {
        console.log('📋 Sample transformed exchange:', {
          id: transformedExchanges[0].id,
          exchange_name: transformedExchanges[0].exchange_name,
          status: transformedExchanges[0].status,
          participants_count: transformedExchanges[0].participants.length
        });
      }
    } else {
      console.log('❌ No exchanges found - this explains why chat interface is empty!');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testFrontendChatService();