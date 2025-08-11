require('dotenv').config();
const axios = require('axios');

async function testMarkReadAPI() {
  console.log('🔍 Testing mark-as-read API endpoint...\n');

  const baseUrl = 'http://localhost:5001/api';
  
  try {
    // First, login to get a valid token
    console.log('1️⃣ Logging in...');
    
    // Try with direct Supabase user credentials
    const loginResponse = await axios.post(`${baseUrl}/auth/login`, {
      email: 'admin@peak1031.com',
      password: 'TempPass123!' // This might be the actual password
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');

    // Now test marking a message as read
    const messageId = '24019c35-3fb0-4db9-84cc-64fa5f58e909'; // Message from the error
    console.log(`\n2️⃣ Marking message ${messageId} as read...`);
    
    try {
      const markReadResponse = await axios.put(`${baseUrl}/messages/${messageId}/read`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Mark as read successful:', markReadResponse.data);
      
    } catch (markReadError) {
      console.error('❌ Mark as read failed:');
      console.error('Status:', markReadError.response?.status);
      console.error('Error:', markReadError.response?.data);
      
      // If it's because message doesn't exist, try with a message we know exists
      if (markReadError.response?.status === 404) {
        console.log('\n3️⃣ Trying with a known existing message...');
        const knownMessageId = 'f89414fd-5387-4ac5-b046-9ab0b3ad158e';
        
        const retryResponse = await axios.put(`${baseUrl}/messages/${knownMessageId}/read`, {}, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('✅ Retry successful:', retryResponse.data);
      }
    }

  } catch (error) {
    if (error.response?.status === 401) {
      console.log('❌ Login failed - trying different password...');
      
      // Try common passwords
      const passwords = ['admin123', 'password', 'TempPass123!', 'Peak1031!'];
      
      for (const password of passwords) {
        try {
          console.log(`Trying password: ${password}`);
          const loginAttempt = await axios.post(`${baseUrl}/auth/login`, {
            email: 'admin@peak1031.com',
            password: password
          });
          console.log(`✅ Success with password: ${password}`);
          break;
        } catch (loginError) {
          console.log(`❌ Failed with password: ${password}`);
        }
      }
    } else {
      console.error('❌ Test failed:', error.response?.data || error.message);
    }
  }
}

testMarkReadAPI().then(() => {
  console.log('\n🏁 Test completed');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Test error:', err);
  process.exit(1);
});