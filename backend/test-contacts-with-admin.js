require('dotenv').config();
const axios = require('axios');

const API_URL = 'http://localhost:5001/api';

async function testContactsWithLogin() {
  try {
    console.log('🔐 Logging in as admin...');
    
    // Login first
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@peak1031.com',
      password: 'Peak2024!'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Logged in successfully');
    
    // Test contacts endpoint
    console.log('\n🔍 Testing contacts endpoint...');
    
    // Test 1: Get all contacts
    const response1 = await axios.get(`${API_URL}/contacts?limit=10`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('\n✅ All contacts response:', {
      totalContacts: response1.data.contacts?.length || 0,
      pagination: response1.data.pagination
    });
    
    if (response1.data.contacts?.length > 0) {
      console.log('\n👥 First few contacts:');
      response1.data.contacts.slice(0, 3).forEach(contact => {
        console.log(`  - ${contact.firstName} ${contact.lastName} (${contact.email}) - Role: ${contact.role}`);
      });
    }
    
    // Test 2: Search contacts
    const response2 = await axios.get(`${API_URL}/contacts?search=test&limit=20`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('\n🔍 Search results for "test":', {
      searchResults: response2.data.contacts?.length || 0
    });
    
    if (response2.data.contacts?.length > 0) {
      console.log('\nMatching users:');
      response2.data.contacts.forEach(contact => {
        console.log(`  - ${contact.firstName} ${contact.lastName} (${contact.email}) - Role: ${contact.role}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', {
      status: error.response?.status,
      error: error.response?.data || error.message
    });
  }
}

// Run the test
testContactsWithLogin();
