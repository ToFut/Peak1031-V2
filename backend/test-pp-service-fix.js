require('dotenv').config();
const PracticePartnerService = require('./services/practicePartnerService');
const PPTokenManager = require('./services/ppTokenManager');

console.log('Testing PP Service Setup...');
console.log('');

// Test class export
console.log('PracticePartnerService export type:', typeof PracticePartnerService);
console.log('PracticePartnerService.instance type:', typeof PracticePartnerService.instance);

// Test token manager
const tokenManager = new PPTokenManager();
console.log('PPTokenManager created:', !!tokenManager);

// Test service instantiation
try {
  const ppService = new PracticePartnerService();
  console.log('✅ New PracticePartnerService created successfully');
} catch (error) {
  console.log('❌ Error creating PracticePartnerService:', error.message);
}

console.log('');
console.log('Mock mode explanation:');
console.log('The OSS LLM service runs in mock mode because it needs a real');
console.log('language model (like Llama) to be loaded, which requires significant');
console.log('resources. Mock mode provides sample responses for testing.');