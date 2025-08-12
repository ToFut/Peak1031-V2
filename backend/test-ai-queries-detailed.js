/**
 * Test detailed AI query examples
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

const testDetailedQueries = async () => {
  try {
    console.log('🧪 Testing detailed AI queries...');
    
    const adminToken = jwt.sign(
      {
        userId: '278304de-568f-4138-b35b-6fdcfbd2f1ce',
        id: '278304de-568f-4138-b35b-6fdcfbd2f1ce',
        email: 'admin@peak1031.com',
        role: 'admin'
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    const baseURL = 'http://localhost:5001/api/analytics';
    
    const queries = [
      'How many exchanges do we have?',
      'Show me high value exchanges',
      'What are the upcoming deadlines?',
      'Show exchanges by status',
      'What is our completion rate?'
    ];
    
    for (const query of queries) {
      console.log(`\n🤖 Testing: "${query}"`);
      
      const response = await fetch(`${baseURL}/ai-query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Success: ${result.data?.queryName || 'N/A'}`);
        console.log(`   Type: ${result.data?.queryType || 'N/A'}`);
        console.log(`   Results: ${result.data?.data?.length || 0} rows`);
        
        if (result.data?.data?.[0]) {
          const sample = result.data.data[0];
          const keys = Object.keys(sample).slice(0, 2);
          console.log(`   Sample: ${keys.map(k => `${k}=${sample[k]}`).join(', ')}`);
        }
      } else {
        const error = await response.text();
        console.log(`❌ Failed: ${response.status} - ${error}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testDetailedQueries();