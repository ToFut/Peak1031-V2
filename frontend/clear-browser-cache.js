// Script to help clear browser caches and fix chunk loading errors
console.log('🔧 Clearing browser caches to fix chunk loading errors...');

// Clear localStorage and sessionStorage
localStorage.clear();
sessionStorage.clear();

// Clear any cached service workers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
    }
  });
}

// Clear cache storage if available
if ('caches' in window) {
  caches.keys().then(function(names) {
    for (let name of names) {
      caches.delete(name);
    }
  });
}

console.log('✅ Browser caches cleared!');
console.log('📝 Next steps:');
console.log('1. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)');
console.log('2. If the error persists, try opening in an incognito/private window');
console.log('3. Check the browser console for any remaining errors');
