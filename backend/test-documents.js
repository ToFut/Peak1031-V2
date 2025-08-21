const axios = require('axios');
require('dotenv').config();

async function testDocuments() {
  console.log('🧪 Testing Document Functionality');
  console.log('================================');

  const baseURL = 'http://localhost:5001/api';
  
  // Test credentials
  const testUser = {
    email: 'admin@peak1031.com',
    password: 'admin123'
  };

  let token, user;
  
  try {
    // Step 1: Login to get token
    console.log('🔐 Step 1: Logging in...');
    try {
      const loginResponse = await axios.post(`${baseURL}/auth/login`, {
        email: testUser.email,
        password: testUser.password
      });

      token = loginResponse.data.token;
      user = loginResponse.data.user;
      console.log('✅ Login successful');
      console.log(`👤 Logged in as: ${user.email} (${user.id}) - Role: ${user.role}`);
    } catch (error) {
      console.log('❌ Login failed:', error.response?.data || error.message);
      console.log('❌ Status:', error.response?.status);
      console.log('❌ URL:', `${baseURL}/auth/login`);
      return;
    }

    // Step 2: Get user's exchanges
    console.log('\n📋 Step 2: Getting user exchanges...');
    const exchangesResponse = await axios.get(`${baseURL}/exchanges`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('📊 Raw exchanges response structure:', {
      hasData: !!exchangesResponse.data,
      isArray: Array.isArray(exchangesResponse.data),
      hasNestedData: !!(exchangesResponse.data && exchangesResponse.data.data),
      keys: exchangesResponse.data ? Object.keys(exchangesResponse.data) : []
    });
    
    let exchanges = [];
    if (Array.isArray(exchangesResponse.data)) {
      exchanges = exchangesResponse.data;
    } else if (exchangesResponse.data && exchangesResponse.data.data) {
      exchanges = exchangesResponse.data.data;
    } else if (exchangesResponse.data && exchangesResponse.data.exchanges) {
      exchanges = exchangesResponse.data.exchanges;
    } else {
      exchanges = [];
    }
    
    console.log(`✅ Found ${exchanges.length} exchanges`);
    
    if (exchanges.length === 0) {
      console.log('❌ No exchanges found for user');
      return;
    }

    const firstExchange = exchanges[0];
    console.log(`📋 Using exchange: ${firstExchange.name || firstExchange.exchangeNumber} (${firstExchange.id})`);

    // Step 3: Test document stats
    console.log('\n📊 Step 3: Testing document stats...');
    try {
      const statsResponse = await axios.get(`${baseURL}/documents/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Document stats:', statsResponse.data);
    } catch (error) {
      console.log('❌ Document stats failed:', error.response?.data || error.message);
    }

    // Step 4: Test exchange-specific document stats
    console.log('\n📊 Step 4: Testing exchange document stats...');
    try {
      const exchangeStatsResponse = await axios.get(`${baseURL}/documents/exchange/${firstExchange.id}/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Exchange document stats:', exchangeStatsResponse.data);
    } catch (error) {
      console.log('❌ Exchange document stats failed:', error.response?.data || error.message);
    }

    // Step 5: Test getting documents for exchange
    console.log('\n📄 Step 5: Testing document retrieval...');
    try {
      const documentsResponse = await axios.get(`${baseURL}/documents/exchange/${firstExchange.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('📊 Documents response structure:', {
        hasData: !!documentsResponse.data,
        isArray: Array.isArray(documentsResponse.data),
        keys: documentsResponse.data ? Object.keys(documentsResponse.data) : []
      });
      
      let documents = [];
      if (Array.isArray(documentsResponse.data)) {
        documents = documentsResponse.data;
      } else if (documentsResponse.data && documentsResponse.data.data) {
        documents = documentsResponse.data.data;
      } else if (documentsResponse.data && documentsResponse.data.documents) {
        documents = documentsResponse.data.documents;
      } else {
        documents = [];
      }
      
      console.log(`✅ Found ${documents.length} documents for exchange`);
      if (documents.length > 0) {
        console.log('📄 Sample document:', documents[0]);
      }
    } catch (error) {
      console.log('❌ Document retrieval failed:', error.response?.data || error.message);
    }

    // Step 6: Test getting all documents
    console.log('\n📄 Step 6: Testing all documents retrieval...');
    try {
      const allDocumentsResponse = await axios.get(`${baseURL}/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('📊 All documents response structure:', {
        hasData: !!allDocumentsResponse.data,
        isArray: Array.isArray(allDocumentsResponse.data),
        keys: allDocumentsResponse.data ? Object.keys(allDocumentsResponse.data) : []
      });
      
      let allDocuments = [];
      if (Array.isArray(allDocumentsResponse.data)) {
        allDocuments = allDocumentsResponse.data;
      } else if (allDocumentsResponse.data && allDocumentsResponse.data.data) {
        allDocuments = allDocumentsResponse.data.data;
      } else if (allDocumentsResponse.data && allDocumentsResponse.data.documents) {
        allDocuments = allDocumentsResponse.data.documents;
      } else {
        allDocuments = [];
      }
      
      console.log(`✅ Found ${allDocuments.length} total documents`);
    } catch (error) {
      console.log('❌ All documents retrieval failed:', error.response?.data || error.message);
    }

    console.log('\n✅ Document functionality test completed');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testDocuments();
