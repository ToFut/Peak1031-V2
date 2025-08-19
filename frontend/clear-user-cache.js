// Clear user cache and localStorage data
console.log('🧹 Clearing user cache and localStorage...');

// Clear localStorage items related to users
const itemsToRemove = [
  'users-list',
  'user-profile',
  'exchanges-summary',
  'cached-users',
  'user-data'
];

itemsToRemove.forEach(item => {
  localStorage.removeItem(item);
  console.log(`✅ Removed ${item} from localStorage`);
});

// Clear sessionStorage
sessionStorage.clear();
console.log('✅ Cleared sessionStorage');

// Clear any cached API responses
if (window.caches) {
  caches.keys().then(names => {
    names.forEach(name => {
      caches.delete(name);
      console.log(`✅ Deleted cache: ${name}`);
    });
  });
}

console.log('🎉 User cache cleared successfully!');
console.log('🔄 Please refresh the page to reload fresh data.');
