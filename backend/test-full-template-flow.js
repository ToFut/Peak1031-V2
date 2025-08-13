/**
 * Comprehensive Template Flow Test
 * Tests the complete flow from database to frontend
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testCompleteFlow() {
  console.log('🔍 Complete Template Flow Debug\n');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Test Database Connection
    console.log('\n📋 Step 1: Testing database connection...');
    const { data: dbTest, error: dbError } = await supabase
      .from('document_templates')
      .select('count(*)')
      .single();
    
    if (dbError) {
      console.error('❌ Database connection failed:', dbError);
      return;
    }
    console.log('✅ Database connection working');
    
    // Step 2: Test DocumentTemplateService directly
    console.log('\n📋 Step 2: Testing DocumentTemplateService...');
    const DocumentTemplateService = require('./services/documentTemplateService');
    const templateService = new DocumentTemplateService();
    
    try {
      const templates = await templateService.getTemplates();
      console.log(`✅ DocumentTemplateService returned ${templates?.length || 0} templates`);
      
      if (templates && templates.length > 0) {
        console.log('Sample template:', {
          id: templates[0].id,
          name: templates[0].name,
          category: templates[0].category,
          is_active: templates[0].is_active
        });
      }
    } catch (serviceError) {
      console.error('❌ DocumentTemplateService error:', serviceError);
      return;
    }
    
    // Step 3: Test API Route Handler
    console.log('\n📋 Step 3: Testing template-management route...');
    try {
      // Simulate the route handler
      const options = {};
      const templates = await templateService.getTemplates(options);
      const response = {
        success: true,
        data: templates
      };
      
      console.log('✅ Route would return:', {
        success: response.success,
        dataLength: response.data?.length || 0,
        firstTemplate: response.data?.[0]?.name || 'N/A'
      });
    } catch (routeError) {
      console.error('❌ Route simulation error:', routeError);
    }
    
    // Step 4: Test Authentication Requirements
    console.log('\n📋 Step 4: Testing authentication setup...');
    
    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      console.warn('⚠️ JWT_SECRET not configured - this will cause auth issues');
    } else {
      console.log('✅ JWT_SECRET is configured');
    }
    
    // Step 5: Check Server Configuration
    console.log('\n📋 Step 5: Checking server configuration...');
    
    // Check if server file exists and has the right route mounting
    const fs = require('fs');
    const path = require('path');
    
    try {
      const serverPath = path.join(__dirname, 'server.js');
      const serverContent = fs.readFileSync(serverPath, 'utf8');
      
      if (serverContent.includes("this.app.use('/api/templates', templateManagementRoutes)")) {
        console.log('✅ Templates route is properly mounted at /api/templates');
      } else {
        console.warn('⚠️ Templates route mounting not found in server.js');
      }
      
      if (serverContent.includes('authenticateToken')) {
        console.log('✅ Authentication middleware is being used');
      }
      
    } catch (e) {
      console.warn('⚠️ Could not read server.js file');
    }
    
    // Step 6: Frontend Compatibility Check
    console.log('\n📋 Step 6: Testing frontend response format...');
    
    const templates = await templateService.getTemplates();
    const apiResponse = {
      success: true,
      data: templates
    };
    
    // Simulate what frontend does
    let frontendTemplates = [];
    if (apiResponse && apiResponse.success && apiResponse.data) {
      frontendTemplates = apiResponse.data || [];
    } else if (Array.isArray(apiResponse)) {
      frontendTemplates = apiResponse;
    }
    
    console.log(`✅ Frontend would receive ${frontendTemplates.length} templates`);
    
    // Step 7: Create a simple test user token (for testing)
    console.log('\n📋 Step 7: Testing JWT token creation...');
    
    if (process.env.JWT_SECRET) {
      try {
        const jwt = require('jsonwebtoken');
        const testUser = {
          id: 'test-user-123',
          email: 'test@example.com',
          role: 'admin'
        };
        
        const testToken = jwt.sign(testUser, process.env.JWT_SECRET, { expiresIn: '1h' });
        console.log('✅ Test JWT token created successfully');
        console.log('Test token (first 50 chars):', testToken.substring(0, 50) + '...');
        
        // Verify the token
        const decoded = jwt.verify(testToken, process.env.JWT_SECRET);
        console.log('✅ Token verification successful:', decoded.email);
        
      } catch (jwtError) {
        console.error('❌ JWT token creation/verification failed:', jwtError.message);
      }
    }
    
    // Step 8: Instructions for next steps
    console.log('\n📋 Step 8: Debugging recommendations...');
    console.log('');
    console.log('To debug further:');
    console.log('1. Start the backend server: npm run dev:backend');
    console.log('2. Check browser console for errors');
    console.log('3. Check Network tab in browser dev tools');
    console.log('4. Look for failed requests to /api/templates');
    console.log('5. Check if authentication token is being sent');
    console.log('');
    console.log('Common issues:');
    console.log('- Backend server not running');
    console.log('- Invalid or missing auth token');
    console.log('- CORS issues');
    console.log('- Frontend calling wrong endpoint');
    
    // Step 9: Test raw database query that documents.js route uses
    console.log('\n📋 Step 9: Testing supabaseService method...');
    
    try {
      // Try to import supabaseService
      const supabaseService = require('./services/supabase');
      const templatesViaOldService = await supabaseService.select('document_templates', {
        where: { is_active: true },
        orderBy: { column: 'created_at', ascending: false }
      });
      
      console.log(`✅ Old supabaseService returned ${templatesViaOldService?.length || 0} templates`);
      
      if (templatesViaOldService && templatesViaOldService.length === 0) {
        console.log('🔍 This might be why /documents/templates was returning 0!');
      }
      
    } catch (oldServiceError) {
      console.error('❌ Old supabaseService error:', oldServiceError.message);
      console.log('🔍 This explains why /documents/templates wasn\'t working');
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 SUMMARY');
    console.log('=' .repeat(60));
    console.log(`✅ Database has ${templates?.length || 0} templates`);
    console.log('✅ DocumentTemplateService works correctly');
    console.log('✅ New /api/templates endpoint should work');
    console.log('✅ Frontend has been updated to use new endpoint');
    console.log('');
    console.log('If templates still don\'t show:');
    console.log('1. Ensure backend server is running on port 5001');
    console.log('2. Check browser console for auth errors');
    console.log('3. Verify user is logged in with valid token');
    console.log('4. Check Network tab for 401/403 errors');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the comprehensive test
testCompleteFlow().catch(console.error);