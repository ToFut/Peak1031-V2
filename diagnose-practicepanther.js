require('dotenv').config({ path: './backend/.env' });
const axios = require('./backend/node_modules/axios').default;

// Use the access token we just obtained
const ACCESS_TOKEN = '00xymrV9BEUoXPviItXSAmrKTmdgv2ErgBIwgg5Wec-oEz9Oe4yZFUxEAkubFJGRgzimcgKZEK36zuORz0nzSYfzmhrEQlqZUoT72DKftiBUMXqTUxDdF6yCTLv1gWnj6dF-uvcrpXSteKbMA-1u0wK2ZEPjRKyOTxlh7a9BJVYYLYNmuiHmmn4HJ6dXdPZMeqBi2IEzjIeSy-L9gInt803HepAq6I1qXVz-cYaYXCF7ALSaBKUmUM2zClifbQmsOrff-TzMAloqWf6YjB5JZ4JDCD_rBvcQVHTtcDBHB5v79T-IewCWsyf_cH48TSMs_G4hpoy9czi8XK21TjYKI659dZHl90xywb6SyQAEQ2uocfqAzUT4ajTFBPklO0i2II-cpxa2R0xFufeWLPx6OEm1DnJTkNV6WopBZCUsLuxFC9sdtGJdpLe-bkNnPWkSCBy5V-h3dnGK1Ep3vpsD1ZfU77QF5cu44xMnF1FnzAtd8hVrQvYUAcVAE4xjIucoOKKXrSFk1evHWgBH075HYdbXsbhuqosxcRLwNWJ-KCFYrHG8XUbIWlzjhQX0AsmA';

const client = axios.create({
  baseURL: 'https://app.practicepanther.com/api/v2',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${ACCESS_TOKEN}`
  }
});

async function diagnoseAPI() {
  console.log('🔍 Diagnosing PracticePanther API Access...\n');

  // Test various endpoints to see what's available
  const endpoints = [
    '/contacts',
    '/matters',
    '/tasks', 
    '/clients',
    '/people',
    '/activities',
    '/users'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`📡 Testing endpoint: ${endpoint}`);
      
      const response = await client.get(endpoint, {
        params: { per_page: 5 }
      });
      
      console.log(`✅ ${endpoint}: ${response.status} - Found ${response.data.results?.length || response.data.data?.length || 0} records`);
      
      if (response.data.results?.length > 0 || response.data.data?.length > 0) {
        console.log('📋 Sample data structure:');
        const sampleData = response.data.results?.[0] || response.data.data?.[0];
        console.log(JSON.stringify(sampleData, null, 2));
      }
      
      console.log('📊 Full response structure:');
      console.log(`- results: ${response.data.results ? 'array with ' + response.data.results.length + ' items' : 'not present'}`);
      console.log(`- data: ${response.data.data ? 'array with ' + response.data.data.length + ' items' : 'not present'}`);
      console.log(`- has_more: ${response.data.has_more}`);
      console.log(`- total: ${response.data.total || 'not provided'}`);
      console.log(`- page: ${response.data.page || 'not provided'}`);
      console.log(`- per_page: ${response.data.per_page || 'not provided'}`);
      
    } catch (error) {
      if (error.response) {
        console.log(`❌ ${endpoint}: ${error.response.status} - ${error.response.statusText}`);
        if (error.response.status === 404) {
          console.log('   → Endpoint not found');
        } else if (error.response.status === 403) {
          console.log('   → Access forbidden - check permissions');
        } else {
          console.log(`   → Error: ${error.response.data?.message || error.message}`);
        }
      } else {
        console.log(`❌ ${endpoint}: Network error - ${error.message}`);
      }
    }
    console.log('---');
  }

  // Test with different parameters
  console.log('\n🔧 Testing contacts endpoint with different parameters...');
  
  const contactParams = [
    {},
    { per_page: 1 },
    { per_page: 100 },
    { page: 1, per_page: 50 },
    { include_inactive: true },
    { sort: 'created_at' },
    { sort: 'updated_at' }
  ];

  for (const params of contactParams) {
    try {
      console.log(`📡 Testing /contacts with params:`, params);
      const response = await client.get('/contacts', { params });
      console.log(`✅ Success: ${response.data.results?.length || 0} contacts found`);
      
      if (response.data.results?.length > 0) {
        const contact = response.data.results[0];
        console.log(`📋 Sample contact: ${contact.first_name} ${contact.last_name} (${contact.email || 'no email'})`);
      }
    } catch (error) {
      console.log(`❌ Failed with params ${JSON.stringify(params)}: ${error.response?.status || error.message}`);
    }
    console.log('---');
  }
}

diagnoseAPI()
  .then(() => {
    console.log('\n✨ Diagnosis complete!');
  })
  .catch(error => {
    console.error('💥 Diagnosis failed:', error.message);
  });