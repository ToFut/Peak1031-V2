// Simple script to clear authentication data from localStorage
console.log('Clearing authentication data...');

// Clear tokens
localStorage.removeItem('token');
localStorage.removeItem('refreshToken');
localStorage.removeItem('user');

console.log('Authentication data cleared!');
console.log('Please refresh the page.');