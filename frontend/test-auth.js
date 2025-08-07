
// Test authentication
const testAuth = async () => {
  const token = localStorage.getItem('token');
  if (\!token) {
    console.log('❌ No token found');
    return;
  }
  
  try {
    console.log('🔐 Testing /auth/me endpoint...');
    const response = await fetch('http://localhost:5001/api/auth/me', {
      headers: { 
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    });
    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response data:', data);
  } catch (error) {
    console.log('Error:', error);
  }
};
testAuth();

