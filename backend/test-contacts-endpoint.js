require('dotenv').config();
const jwt = require('jsonwebtoken');
const axios = require('axios');

const API_URL = 'http://localhost:5001/api';

// Create a test token
const token = jwt.sign(
  {
    userId: '44444444-4444-4444-4444-444444444444',
    email: 'admin@peak1031.com',
    role: 'admin'
  },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);

async function testContactsEndpoint() {
  try {
    console.log('🔍 Testing contacts endpoint...');
    
    // Test 1: Get all contacts
    const response1 = await axios.get(`${API_URL}/contacts?limit=10`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ All contacts response:', {
      totalContacts: response1.data.contacts?.length || 0,
      firstContact: response1.data.contacts?.[0] || 'No contacts found'
    });
    
    // Test 2: Search contacts
    const response2 = await axios.get(`${API_URL}/contacts?search=test&limit=5`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Search results:', {
      searchResults: response2.data.contacts?.length || 0,
      matches: response2.data.contacts?.map(c => ({
        name: `${c.firstName} ${c.lastName}`,
        email: c.email,
        role: c.role
      })) || []
    });
    
  } catch (error) {
    console.error('❌ Error testing contacts endpoint:', {
      status: error.response?.status,
      error: error.response?.data || error.message
    });
  }
}

// Run the test
testContactsEndpoint();
