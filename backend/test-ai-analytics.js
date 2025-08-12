/**
 * Test AI analytics endpoints
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

const testAIAnalytics = async () => {
  try {
    console.log('🧪 Testing AI analytics endpoints...');
    
    // Create admin JWT token
    const adminUserId = '278304de-568f-4138-b35b-6fdcfbd2f1ce';
    const adminToken = jwt.sign(
      {
        userId: adminUserId,
        id: adminUserId,
        email: 'admin@peak1031.com',
        role: 'admin',
        contact_id: adminUserId
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    const baseURL = 'http://localhost:5001/api/analytics';
    
    // Test 1: Get classic queries
    console.log('\n📊 Testing /classic-queries...');
    const classicResponse = await fetch(`${baseURL}/classic-queries`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (classicResponse.ok) {
      const classicResult = await classicResponse.json();
      console.log(`✅ Classic queries: ${classicResult.data?.length || 0} available`);
      console.log('Sample queries:', classicResult.data?.slice(0, 3).map(q => q.name));
    } else {
      console.log(`❌ Classic queries failed: ${classicResponse.status}`);
    }
    
    // Test 2: Execute a classic query
    console.log('\n🔍 Testing /classic-query execution...');
    const classicQueryResponse = await fetch(`${baseURL}/classic-query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        queryKey: 'total_exchange_value'
      })
    });
    
    if (classicQueryResponse.ok) {
      const queryResult = await classicQueryResponse.json();
      console.log('✅ Classic query executed successfully');
      console.log(`- Query: ${queryResult.data?.queryName || 'N/A'}`);
      console.log(`- Results: ${queryResult.data?.data?.length || 0} rows`);
      if (queryResult.data?.data?.[0]) {
        const firstRow = queryResult.data.data[0];
        console.log('- Sample data:', Object.keys(firstRow).slice(0, 3).map(key => `${key}: ${firstRow[key]}`));
      }
    } else {
      const errorText = await classicQueryResponse.text();
      console.log(`❌ Classic query failed: ${classicQueryResponse.status} - ${errorText}`);
    }
    
    // Test 3: Execute AI query
    console.log('\n🤖 Testing /ai-query execution...');
    const aiQueryResponse = await fetch(`${baseURL}/ai-query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: 'Show me the total value of all exchanges'
      })
    });
    
    if (aiQueryResponse.ok) {
      const aiResult = await aiQueryResponse.json();
      console.log('✅ AI query executed successfully');
      console.log(`- Query: ${aiResult.data?.queryName || 'N/A'}`);
      console.log(`- Results: ${aiResult.data?.data?.length || 0} rows`);
      console.log(`- Query type: ${aiResult.data?.queryType || 'N/A'}`);
      if (aiResult.data?.data?.[0]) {
        const firstRow = aiResult.data.data[0];
        console.log('- Sample data:', Object.keys(firstRow).slice(0, 3).map(key => `${key}: ${firstRow[key]}`));
      }
    } else {
      const errorText = await aiQueryResponse.text();
      console.log(`❌ AI query failed: ${aiQueryResponse.status} - ${errorText}`);
    }
    
    // Test 4: Get query suggestions
    console.log('\n💡 Testing /query-suggestions...');
    const suggestionsResponse = await fetch(`${baseURL}/query-suggestions?page=exchanges`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (suggestionsResponse.ok) {
      const suggestionsResult = await suggestionsResponse.json();
      console.log(`✅ Query suggestions: ${suggestionsResult.data?.length || 0} available`);
      console.log('Sample suggestions:', suggestionsResult.data?.slice(0, 3));
    } else {
      console.log(`❌ Query suggestions failed: ${suggestionsResponse.status}`);
    }
    
    console.log('\n✅ AI analytics testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testAIAnalytics();