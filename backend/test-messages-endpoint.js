require('dotenv').config();

async function testMessagesEndpoint() {
  console.log('Testing messages endpoint specific issue...');
  
  const fetch = await import('node-fetch');
  
  // Get token for test-admin
  const loginResponse = await fetch.default('http://localhost:5001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      email: 'test-admin@peak1031.com', 
      password: 'test123' 
    })
  });
  
  const loginData = await loginResponse.json();
  console.log('Login status:', loginResponse.status);
  
  if (!loginResponse.ok) {
    console.log('Login failed:', loginData);
    return;
  }
  
  const token = loginData.token;
  console.log('Got admin token, testing messages endpoint...');
  
  // Test messages endpoint
  const messagesResponse = await fetch.default('http://localhost:5001/api/messages?limit=10', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  console.log('Messages status:', messagesResponse.status);
  const messagesData = await messagesResponse.json();
  console.log('Messages response:', JSON.stringify(messagesData, null, 2));
  
  if (!messagesResponse.ok) {
    console.log('Admin messages failed. Testing coordinator...');
    
    // Get coordinator token
    const coordLoginResponse = await fetch.default('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: 'test-coordinator@peak1031.com', 
        password: 'test123' 
      })
    });
    
    const coordLoginData = await coordLoginResponse.json();
    if (coordLoginResponse.ok) {
      const coordToken = coordLoginData.token;
      
      const coordMessagesResponse = await fetch.default('http://localhost:5001/api/messages?limit=10', {
        headers: {
          'Authorization': `Bearer ${coordToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Coordinator messages status:', coordMessagesResponse.status);
      const coordMessagesData = await coordMessagesResponse.json();
      console.log('Coordinator messages response:', JSON.stringify(coordMessagesData, null, 2));
    }
  }
}

testMessagesEndpoint().then(() => process.exit(0));