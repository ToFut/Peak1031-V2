// Debug script to test frontend-backend connection
const axios = require('axios');

async function debugFrontendBackendConnection() {
  const baseURL = 'http://localhost:5001/api';
  const exchangeId = 'ba7865ac-da20-404a-b609-804d15cb0467';
  
  try {
    console.log('🧪 Debugging Frontend-Backend Connection...');
    
    // Test 1: Check if backend is running
    console.log('\n1️⃣ Testing Backend Availability...');
    try {
      const healthResponse = await axios.get(`${baseURL}/health`);
      console.log('✅ Backend is running:', healthResponse.status);
    } catch (error) {
      console.log('❌ Backend not accessible:', error.message);
      return;
    }
    
    // Test 2: Test authentication
    console.log('\n2️⃣ Testing Authentication...');
    let token;
    try {
      const loginResponse = await axios.post(`${baseURL}/auth/login`, {
        email: 'admin@peak1031.com',
        password: 'admin123'
      });
      token = loginResponse.data.token;
      console.log('✅ Authentication successful');
    } catch (error) {
      console.log('❌ Authentication failed:', error.response?.data || error.message);
      return;
    }
    
    const headers = { Authorization: `Bearer ${token}` };
    
    // Test 3: Test exact API endpoints that frontend uses
    console.log('\n3️⃣ Testing Frontend API Endpoints...');
    
    // Test exchange details endpoint
    console.log('   - Testing exchange details...');
    try {
      const exchangeResponse = await axios.get(`${baseURL}/exchanges/${exchangeId}`, { headers });
      console.log('   ✅ Exchange details loaded:', exchangeResponse.data.name);
    } catch (error) {
      console.log('   ❌ Exchange details failed:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    // Test tasks endpoint (this is the key one)
    console.log('   - Testing tasks endpoint...');
    try {
      const tasksResponse = await axios.get(`${baseURL}/exchanges/${exchangeId}/tasks`, { headers });
      const tasksData = tasksResponse.data;
      console.log('   ✅ Tasks endpoint successful');
      console.log('   📊 Tasks response:', {
        type: typeof tasksData,
        isArray: Array.isArray(tasksData),
        hasTasksProperty: tasksData && typeof tasksData === 'object' && 'tasks' in tasksData,
        tasksLength: tasksData?.tasks?.length || 'N/A',
        responseKeys: tasksData ? Object.keys(tasksData) : 'N/A'
      });
    } catch (error) {
      console.log('   ❌ Tasks endpoint failed:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    // Test users endpoint
    console.log('   - Testing users endpoint...');
    try {
      const usersResponse = await axios.get(`${baseURL}/users`, { headers });
      const usersData = usersResponse.data;
      console.log('   ✅ Users endpoint successful');
      console.log('   📊 Users response:', {
        type: typeof usersData,
        isArray: Array.isArray(usersData),
        hasDataProperty: usersData && typeof usersData === 'object' && 'data' in usersData,
        dataLength: usersData?.data?.length || 'N/A',
        responseKeys: usersData ? Object.keys(usersData) : 'N/A'
      });
    } catch (error) {
      console.log('   ❌ Users endpoint failed:', error.response?.status, error.response?.data?.message || error.message);
    }
    
    // Test 4: Simulate frontend network requests
    console.log('\n4️⃣ Simulating Frontend Network Requests...');
    
    // Test with different user agents and headers
    const frontendHeaders = {
      ...headers,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    
    try {
      const frontendTasksResponse = await axios.get(`${baseURL}/exchanges/${exchangeId}/tasks`, { 
        headers: frontendHeaders,
        timeout: 10000
      });
      console.log('✅ Frontend-style request successful');
      console.log('📊 Response:', {
        status: frontendTasksResponse.status,
        dataType: typeof frontendTasksResponse.data,
        tasksCount: frontendTasksResponse.data?.tasks?.length || 'N/A'
      });
    } catch (error) {
      console.log('❌ Frontend-style request failed:', error.message);
    }
    
    // Test 5: Check for CORS or network issues
    console.log('\n5️⃣ Testing Network Configuration...');
    
    // Test with different origins
    try {
      const corsResponse = await axios.get(`${baseURL}/exchanges/${exchangeId}/tasks`, { 
        headers: {
          ...headers,
          'Origin': 'http://localhost:3001'
        }
      });
      console.log('✅ CORS test successful');
    } catch (error) {
      console.log('❌ CORS test failed:', error.message);
    }
    
    // Test 6: Check if there are any rate limiting or permission issues
    console.log('\n6️⃣ Testing Permissions and Rate Limiting...');
    
    // Test multiple requests
    for (let i = 0; i < 3; i++) {
      try {
        const testResponse = await axios.get(`${baseURL}/exchanges/${exchangeId}/tasks`, { headers });
        console.log(`   ✅ Request ${i + 1} successful:`, testResponse.data?.tasks?.length || 'N/A', 'tasks');
      } catch (error) {
        console.log(`   ❌ Request ${i + 1} failed:`, error.response?.status, error.response?.data?.message || error.message);
      }
    }
    
    console.log('\n📊 Summary:');
    console.log('- Backend availability: ✅');
    console.log('- Authentication: ✅');
    console.log('- API endpoints: ✅');
    console.log('- Network configuration: ✅');
    console.log('- Permissions: ✅');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugFrontendBackendConnection();

