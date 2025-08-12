const express = require('express');
const agenciesRoutes = require('./routes/agencies');
const { authenticateToken } = require('./middleware/auth');
const { requireRole } = require('./middleware/rbac');

// Create a mock request and response to test the route
async function testAgenciesEndpoint() {
  try {
    console.log('🔍 Testing agencies endpoint directly...');
    
    // Mock request object
    const mockReq = {
      query: {
        page: '1',
        limit: '10',
        includeStats: 'false'
      },
      user: {
        id: '278304de-568f-4138-b35b-6fdcfbd2f1ce',
        email: 'admin@peak1031.com',
        role: 'admin'
      },
      headers: {}
    };
    
    // Mock response object
    let responseData = null;
    let statusCode = 200;
    
    const mockRes = {
      json: (data) => {
        responseData = data;
        console.log('📊 Response:', JSON.stringify(data, null, 2));
      },
      status: (code) => {
        statusCode = code;
        return mockRes;
      }
    };
    
    // Import and test the route handler directly
    console.log('Loading agencies route...');
    
    // We need to test the GET / route from agencies.js
    // Let's look at the route file structure first
    console.log('Routes object keys:', Object.keys(agenciesRoutes));
    console.log('Routes stack length:', agenciesRoutes.stack?.length);
    
    if (agenciesRoutes.stack && agenciesRoutes.stack.length > 0) {
      // Find the GET / route
      const getRoute = agenciesRoutes.stack.find(layer => 
        layer.route && 
        layer.route.path === '/' && 
        layer.route.methods.get
      );
      
      if (getRoute) {
        console.log('✅ Found GET / route');
        
        // Get the actual handler (skip auth middleware)
        const handlers = getRoute.route.stack;
        const mainHandler = handlers[handlers.length - 1]; // Last handler is usually the main one
        
        console.log('Executing route handler...');
        await mainHandler.handle(mockReq, mockRes);
        
        console.log('✅ Route executed successfully');
        console.log('Status code:', statusCode);
        
      } else {
        console.log('❌ GET / route not found');
        console.log('Available routes:', agenciesRoutes.stack.map(layer => ({
          path: layer.route?.path,
          methods: Object.keys(layer.route?.methods || {})
        })));
      }
    } else {
      console.log('❌ No routes found in agencies router');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testAgenciesEndpoint();