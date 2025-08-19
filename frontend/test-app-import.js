// Test script to check App component import
console.log('🔍 Testing App component import...');

try {
  // Try to import the App component
  const App = require('./src/App.tsx');
  console.log('✅ App component imported successfully');
  console.log('📦 App component type:', typeof App);
  console.log('📦 App component keys:', Object.keys(App));
} catch (error) {
  console.log('❌ Failed to import App component:');
  console.log('📄 Error:', error.message);
  console.log('📄 Stack:', error.stack);
}

// Also test the index file
console.log('\n🔍 Testing index.tsx...');
try {
  const fs = require('fs');
  const indexContent = fs.readFileSync('./src/index.tsx', 'utf8');
  console.log('✅ index.tsx file read successfully');
  console.log('📄 First few lines:');
  console.log(indexContent.split('\n').slice(0, 10).join('\n'));
} catch (error) {
  console.log('❌ Failed to read index.tsx:');
  console.log('📄 Error:', error.message);
}
