// Utility to clear authentication data
export const clearAuthData = () => {
  console.log('🧹 Clearing authentication data...');
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  console.log('✅ Authentication data cleared');
};

// Check if current token has invalid user ID
const checkTokenValidity = () => {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const invalidUserIds = [
      'dabd14fa-cda2-4096-89a2-3b54906aff3d', // Old invalid ID
      '110e8400-e29b-41d4-a716-446655440002'  // Another invalid ID
    ];
    
    if (invalidUserIds.includes(payload.userId)) {
      console.log('🚨 Found token with invalid user ID:', payload.userId);
      console.log('🧹 Auto-clearing invalid authentication data...');
      clearAuthData();
      return true;
    }
    
    // Check if token is expired
    if (payload.exp && payload.exp < Date.now() / 1000) {
      console.log('🚨 Found expired token');
      console.log('🧹 Auto-clearing expired authentication data...');
      clearAuthData();
      return true;
    }
  } catch (error) {
    console.log('🚨 Found malformed token');
    console.log('🧹 Auto-clearing malformed authentication data...');
    clearAuthData();
    return true;
  }
  
  return false;
};

// Auto-clear invalid tokens on load
const wasCleared = checkTokenValidity();

// Clear auth data on load if URL has ?clearAuth=true
if (window.location.search.includes('clearAuth=true')) {
  clearAuthData();
  // Remove the query parameter from URL
  window.history.replaceState({}, document.title, window.location.pathname);
} else if (wasCleared) {
  // If we auto-cleared tokens, show a notification
  console.log('🔄 Invalid authentication data was automatically cleared. Please log in again.');
}