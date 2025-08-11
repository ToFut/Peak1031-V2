#!/usr/bin/env node

require('dotenv').config();
const jwt = require('jsonwebtoken');

async function createTestJWT() {
  try {
    console.log('🔧 Creating test JWT token for API testing...\n');
    
    // Create a test user payload with the actual admin user ID from Supabase
    const payload = {
      userId: '278304de-568f-4138-b35b-6fdcfbd2f1ce', // Actual admin user ID from database
      email: 'admin@peak1031.com',
      role: 'admin',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours from now
    };
    
    // Use the JWT secret from environment or default
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    
    // Generate the token
    const token = jwt.sign(payload, secret);
    
    console.log('✅ Test JWT token created successfully!');
    console.log(`   Token: ${token}`);
    console.log(`   User ID: ${payload.userId}`);
    console.log(`   Email: ${payload.email}`);
    console.log(`   Expires: ${new Date(payload.exp * 1000).toISOString()}`);
    
    console.log('\n🧪 You can now test the API with:');
    console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:5001/api/documents/exchange/8330bc7a-269d-4216-a22c-fd9657eca87c`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createTestJWT().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 