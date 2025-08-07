// Validate current token
export const validateCurrentToken = async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.log('🔐 No token found');
    return { valid: false, reason: 'no_token' };
  }

  try {
    // Test token validity by making a simple API call
    const response = await fetch('http://localhost:5000/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const userData = await response.json();
      console.log('✅ Token is valid, user:', userData.email);
      return { valid: true, user: userData };
    } else {
      console.log('❌ Token is invalid:', response.status);
      // Clear invalid tokens
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      return { valid: false, reason: 'invalid_token', status: response.status };
    }
  } catch (error) {
    console.error('❌ Token validation error:', error);
    return { valid: false, reason: 'validation_error', error: error.message };
  }
};

// Test authentication
export const testAuth = async () => {
  console.log('🔐 Testing authentication...');
  
  // Clear existing tokens
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  
  try {
    // Test login - credentials should be provided via environment or test config
    const testEmail = process.env.REACT_APP_TEST_EMAIL || prompt('Enter test email:');
    const testPassword = process.env.REACT_APP_TEST_PASSWORD || prompt('Enter test password:');
    
    if (!testEmail || !testPassword) {
      throw new Error('Test credentials required');
    }
    
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });
    
    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      throw new Error(`Login failed: ${loginResponse.status} ${errorText}`);
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login successful:', loginData);
    
    // Store token
    localStorage.setItem('token', loginData.token);
    if (loginData.refreshToken) {
      localStorage.setItem('refreshToken', loginData.refreshToken);
    }
    
    // Test API call
          const contactsResponse = await fetch('http://localhost:5000/api/contacts', {
      headers: {
        'Authorization': `Bearer ${loginData.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!contactsResponse.ok) {
      throw new Error(`Contacts API failed: ${contactsResponse.status}`);
    }
    
    const contactsData = await contactsResponse.json();
    console.log('✅ Contacts API successful:', contactsData);
    
    return { success: true, data: { login: loginData, contacts: contactsData } };
    
  } catch (error) {
    console.error('❌ Auth test failed:', error);
    return { success: false, error: error.message };
  }
};

// Auto-run if in development and URL has ?testAuth=true
if (window.location.search.includes('testAuth=true')) {
  testAuth().then(result => {
    console.log('Auth test result:', result);
    if (result.success) {
      alert('Authentication test passed! Check console for details.');
    } else {
      alert(`Authentication test failed: ${result.error}`);
    }
  });
}