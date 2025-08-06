// Clear localStorage cache for development
localStorage.removeItem('api:/exchanges');
localStorage.removeItem('exchanges');
localStorage.removeItem('smartApi:exchanges');
console.log('Cache cleared for exchanges');

// Also check what user data we have
const user = localStorage.getItem('user');
if (user) {
  const userData = JSON.parse(user);
  console.log('Current user:', userData.email, 'Role:', userData.role);
} else {
  console.log('No user data found');
}