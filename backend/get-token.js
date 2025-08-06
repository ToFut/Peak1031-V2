const axios = require('axios');

async function getToken() {
  try {
    const response = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'admin@peak1031.com',
      password: 'TempPass123!'
    });
    
    console.log('Token:', response.data.token);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

getToken();