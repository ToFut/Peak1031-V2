// Debug script to test exchanges API from browser console
// Run this in the browser console when logged in

async function debugExchanges() {
  console.log('🔍 Starting exchanges debug...');
  
  // Check if user is logged in
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  console.log('🔐 Token exists:', !!token);
  console.log('👤 User exists:', !!user);
  
  if (user) {
    try {
      const userData = JSON.parse(user);
      console.log('👤 User role:', userData.role);
    } catch (e) {
      console.log('❌ Could not parse user data');
    }
  }
  
  if (!token) {
    console.log('❌ No token found - user not logged in');
    return;
  }
  
  // Test API call directly
  try {
    console.log('📡 Testing direct API call...');
    const response = await fetch('http://localhost:5001/api/exchanges', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Response:', data);
      console.log('📈 Exchanges count:', data.exchanges?.length || 0);
    } else {
      const errorData = await response.text();
      console.log('❌ API Error:', errorData);
    }
  } catch (error) {
    console.log('💥 Fetch error:', error);
  }
}

// Run the debug
debugExchanges();