// Helper function to login as admin for testing
// You can paste this in the browser console to login
async function loginAsAdmin() {
  try {
    const response = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@peak1031.com',
        password: 'admin123'
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('token', data.token);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      console.log('✅ Logged in successfully as admin');
      console.log('👤 User:', data.user);
      console.log('🔑 Token saved to localStorage');
      
      // Optionally reload the page to reflect the login state
      // window.location.reload();
      
      return data;
    } else {
      const error = await response.text();
      console.error('❌ Login failed:', error);
      return null;
    }
  } catch (error) {
    console.error('❌ Login error:', error);
    return null;
  }
}

// You can also check current authentication status
function checkAuth() {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  console.log('🔐 Authentication Status:');
  console.log('Has Token:', !!token);
  console.log('Token (first 20 chars):', token ? token.substring(0, 20) + '...' : 'none');
  
  if (user) {
    try {
      const userData = JSON.parse(user);
      console.log('User:', userData);
    } catch (e) {
      console.log('User data:', user);
    }
  } else {
    console.log('No user data in localStorage');
  }
  
  return !!token;
}

// Clear authentication (logout)
function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  console.log('🔓 Authentication cleared');
}

console.log('🎯 Login Helper Loaded!');
console.log('Available functions:');
console.log('  - loginAsAdmin() : Login as admin@peak1031.com');
console.log('  - checkAuth()    : Check current authentication status');
console.log('  - clearAuth()    : Clear authentication (logout)');