#!/usr/bin/env node

/**
 * Test script to verify the new default permissions system
 */

const { requireExchangePermission } = require('./middleware/exchangePermissions');

// Mock request/response objects for testing
const mockUser = (role, id = 'test-id') => ({ id, role, email: `${role}@test.com` });
const mockReq = (user, exchangeId = 'test-exchange') => ({ 
  user, 
  params: { exchangeId },
  body: { exchangeId }
});
const mockRes = () => {
  const res = {};
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => { res.data = data; return res; };
  return res;
};
const mockNext = () => console.log('✅ Permission granted');

async function testPermissions() {
  console.log('🧪 Testing new default permission system...\n');

  // Test cases for different roles
  const testCases = [
    {
      role: 'admin',
      permission: 'can_view_messages',
      expected: true,
      description: 'Admin should have all permissions'
    },
    {
      role: 'client', 
      permission: 'can_view_messages',
      expected: true,
      description: 'Client should be able to view messages'
    },
    {
      role: 'client',
      permission: 'can_delete',
      expected: false,
      description: 'Client should NOT be able to delete'
    },
    {
      role: 'third_party',
      permission: 'can_view_overview',
      expected: true,
      description: 'Third party should be able to view overview'
    },
    {
      role: 'third_party',
      permission: 'can_view_messages',
      expected: false,
      description: 'Third party should NOT be able to view messages by default'
    },
    {
      role: 'agency',
      permission: 'can_view_overview',
      expected: true,
      description: 'Agency should be able to view overview'
    },
    {
      role: 'agency',
      permission: 'can_send_messages',
      expected: false,
      description: 'Agency should NOT be able to send messages by default'
    }
  ];

  for (const testCase of testCases) {
    console.log(`📋 Testing: ${testCase.description}`);
    console.log(`   Role: ${testCase.role}, Permission: ${testCase.permission}`);
    
    try {
      const middleware = requireExchangePermission(testCase.permission);
      const req = mockReq(mockUser(testCase.role));
      const res = mockRes();
      let permissionGranted = false;
      
      const next = () => {
        permissionGranted = true;
      };

      await middleware(req, res, next);
      
      if (testCase.expected && permissionGranted) {
        console.log('   ✅ PASS - Permission correctly granted\n');
      } else if (!testCase.expected && res.statusCode === 403) {
        console.log('   ✅ PASS - Permission correctly denied\n');
      } else {
        console.log(`   ❌ FAIL - Expected ${testCase.expected ? 'granted' : 'denied'}, got ${permissionGranted ? 'granted' : 'denied'}\n`);
      }
    } catch (error) {
      console.log(`   ❌ ERROR - ${error.message}\n`);
    }
  }
}

// Run the tests
testPermissions().catch(console.error);