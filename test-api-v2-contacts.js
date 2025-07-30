require('dotenv').config({ path: './backend/.env' });
const axios = require('./backend/node_modules/axios').default;

// Use the access token we obtained
const ACCESS_TOKEN = '00xymrV9BEUoXPviItXSAmrKTmdgv2ErgBIwgg5Wec-oEz9Oe4yZFUxEAkubFJGRgzimcgKZEK36zuORz0nzSYfzmhrEQlqZUoT72DKftiBUMXqTUxDdF6yCTLv1gWnj6dF-uvcrpXSteKbMA-1u0wK2ZEPjRKyOTxlh7a9BJVYYLYNmuiHmmn4HJ6dXdPZMeqBi2IEzjIeSy-L9gInt803HepAq6I1qXVz-cYaYXCF7ALSaBKUmUM2zClifbQmsOrff-TzMAloqWf6YjB5JZ4JDCD_rBvcQVHTtcDBHB5v79T-IewCWsyf_cH48TSMs_G4hpoy9czi8XK21TjYKI659dZHl90xywb6SyQAEQ2uocfqAzUT4ajTFBPklO0i2II-cpxa2R0xFufeWLPx6OEm1DnJTkNV6WopBZCUsLuxFC9sdtGJdpLe-bkNnPWkSCBy5V-h3dnGK1Ep3vpsD1ZfU77QF5cu44xMnF1FnzAtd8hVrQvYUAcVAE4xjIucoOKKXrSFk1evHWgBH075HYdbXsbhuqosxcRLwNWJ-KCFYrHG8XUbIWlzjhQX0AsmA';

async function testContactsAPI() {
  console.log('📡 Testing GET /api/v2/contacts\n');

  try {
    console.log('🔗 Making request to: https://app.practicepanther.com/api/v2/contacts');
    console.log('🔑 Using Bearer token authentication');
    console.log('📋 Request details:');
    console.log('   - Method: GET');
    console.log('   - Headers: Authorization, Content-Type, Accept');
    console.log('   - Parameters: per_page=100\n');

    const response = await axios({
      method: 'GET',
      url: 'https://app.practicepanther.com/api/v2/contacts',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Peak1031-Integration/1.0'
      },
      params: {
        per_page: 100
      },
      timeout: 30000
    });

    console.log('✅ Response received successfully!');
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log(`📏 Content-Length: ${response.headers['content-length'] || 'unknown'}`);
    console.log(`⏱️  Response time: ${response.config.timeout}ms timeout\n`);

    console.log('📋 Response Headers:');
    console.log(`   - Content-Type: ${response.headers['content-type']}`);
    console.log(`   - X-RateLimit-Remaining: ${response.headers['x-ratelimit-remaining'] || 'N/A'}`);
    console.log(`   - X-RateLimit-Limit: ${response.headers['x-ratelimit-limit'] || 'N/A'}\n`);

    console.log('📦 Raw Response Data:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('\n');

    // Analyze the response structure
    console.log('🔍 Response Analysis:');
    console.log(`   - Type: ${typeof response.data}`);
    console.log(`   - Is Array: ${Array.isArray(response.data)}`);
    console.log(`   - Keys: ${Object.keys(response.data || {}).join(', ')}`);
    
    if (response.data) {
      const data = response.data;
      
      // Check common pagination patterns
      if (data.results !== undefined) {
        console.log(`   - Results array: ${Array.isArray(data.results)} (length: ${data.results?.length || 0})`);
      }
      if (data.data !== undefined) {
        console.log(`   - Data array: ${Array.isArray(data.data)} (length: ${data.data?.length || 0})`);
      }
      if (data.contacts !== undefined) {
        console.log(`   - Contacts array: ${Array.isArray(data.contacts)} (length: ${data.contacts?.length || 0})`);
      }
      
      // Pagination info
      console.log(`   - Has more: ${data.has_more || 'N/A'}`);
      console.log(`   - Page: ${data.page || 'N/A'}`);
      console.log(`   - Per page: ${data.per_page || 'N/A'}`);
      console.log(`   - Total: ${data.total || 'N/A'}`);
    }

    // Try to identify contacts
    let contacts = [];
    if (response.data?.results) contacts = response.data.results;
    else if (response.data?.data) contacts = response.data.data;
    else if (response.data?.contacts) contacts = response.data.contacts;
    else if (Array.isArray(response.data)) contacts = response.data;

    console.log(`\n👥 Contacts found: ${contacts.length}`);
    
    if (contacts.length > 0) {
      console.log('\n📋 Sample Contact:');
      console.log(JSON.stringify(contacts[0], null, 2));
    } else {
      console.log('\n📭 No contacts found in the response');
      console.log('💡 This could mean:');
      console.log('   - Empty PracticePanther account');
      console.log('   - Different API endpoint needed');
      console.log('   - Additional permissions required');
      console.log('   - Different query parameters needed');
    }

    return response.data;

  } catch (error) {
    console.error('❌ Request failed:');
    
    if (error.response) {
      console.error(`   - Status: ${error.response.status} ${error.response.statusText}`);
      console.error(`   - Headers: ${JSON.stringify(error.response.headers, null, 2)}`);
      console.error(`   - Data: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.request) {
      console.error('   - No response received');
      console.error(`   - Request: ${error.request}`);
    } else {
      console.error(`   - Error: ${error.message}`);
    }
    
    throw error;
  }
}

// Run the test
testContactsAPI()
  .then(data => {
    console.log('\n✨ API test completed successfully!');
  })
  .catch(error => {
    console.error('\n💥 API test failed');
  });