/**
 * Test the middleware fix by simulating the download request
 */

require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');

// Import the middleware
const { authenticateToken } = require('./middleware/auth');
const { requireDocumentAccess } = require('./middleware/permissions');

// Test configuration
const TEST_DOCUMENT_ID = '52c21773-fac5-457f-a808-8983f3ff5093';

async function testMiddlewareFix() {
  console.log('🧪 Testing Middleware Fix\n');
  console.log('=' .repeat(40));
  
  try {
    // Step 1: Create mock request/response
    console.log('\n📋 Step 1: Setting up mock request...');
    
    // Create admin user token
    const adminUser = {
      userId: '278304de-568f-4138-b35b-6fdcfbd2f1ce',
      email: 'admin@peak1031.com',
      role: 'admin',
      firstName: 'Admin',
      lastName: 'User'
    };
    
    const token = jwt.sign(adminUser, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log('✅ Admin token created');
    
    // Mock request object
    const req = {
      headers: {
        authorization: `Bearer ${token}`
      },
      params: {
        id: TEST_DOCUMENT_ID
      },
      user: null // Will be set by authenticateToken
    };
    
    // Mock response object
    const res = {
      status: (code) => {
        res.statusCode = code;
        return res;
      },
      json: (data) => {
        res.jsonData = data;
        return res;
      }
    };
    
    // Step 2: Test authenticateToken middleware
    console.log('\n📋 Step 2: Testing authenticateToken middleware...');
    
    await new Promise((resolve, reject) => {
      authenticateToken(req, res, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
    
    console.log('✅ Authentication passed');
    console.log('   User set:', req.user?.email, 'Role:', req.user?.role);
    
    // Step 3: Test requireDocumentAccess middleware
    console.log('\n📋 Step 3: Testing requireDocumentAccess middleware...');
    
    const middlewareResult = await new Promise((resolve) => {
      const middleware = requireDocumentAccess('view');
      
      middleware(req, res, (error) => {
        if (error) {
          resolve({ success: false, error });
        } else {
          resolve({ success: true });
        }
      });
      
      // Also check if response was sent (error case)
      setTimeout(() => {
        if (res.statusCode) {
          resolve({ 
            success: false, 
            statusCode: res.statusCode, 
            response: res.jsonData 
          });
        }
      }, 100);
    });
    
    console.log('✅ Middleware result:', middlewareResult);
    
    if (middlewareResult.success) {
      console.log('🎉 SUCCESS! Admin user bypassed document access checks');
      console.log('   Document ID set:', req.documentId);
      console.log('   Access type set:', req.documentAccess);
      console.log('   Is system admin:', req.isSystemAdmin);
    } else if (middlewareResult.statusCode === 400) {
      console.log('❌ FAILURE: Still getting 400 error');
      console.log('   Response:', middlewareResult.response);
    } else {
      console.log('❌ FAILURE: Unexpected error');
      console.log('   Error:', middlewareResult.error);
      console.log('   Status:', middlewareResult.statusCode);
      console.log('   Response:', middlewareResult.response);
    }
    
    console.log('\n' + '=' .repeat(40));
    console.log('🎯 MIDDLEWARE TEST COMPLETE');
    console.log('=' .repeat(40));
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testMiddlewareFix().catch(console.error);