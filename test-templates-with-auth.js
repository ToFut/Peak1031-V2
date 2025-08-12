const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

async function testTemplatesWithAuth() {
  console.log('🔍 Testing templates API with authentication...');
  
  try {
    // First, let's try to authenticate with a test user
    console.log('📋 Testing authentication with test user...');
    
    // Try with test-coordinator user
    const authResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'test-coordinator@peak1031.com',
      password: 'password123'
    });
    
    if (authResponse.data.token) {
      console.log('✅ Authentication successful');
      const token = authResponse.data.token;
      
      // Test templates endpoint with authentication
      console.log('📋 Testing GET /api/templates with auth...');
      const templatesResponse = await axios.get(`${BASE_URL}/templates`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📊 Templates API Response Status:', templatesResponse.status);
      console.log('📊 Templates API Response Data:', JSON.stringify(templatesResponse.data, null, 2));
      
      if (templatesResponse.data.templates) {
        console.log(`✅ Found ${templatesResponse.data.templates.length} templates`);
      } else {
        console.log('⚠️ No templates found or unexpected response format');
      }
      
    } else {
      console.log('❌ Authentication failed - no token received');
    }
    
  } catch (error) {
    console.error('❌ Error testing templates API:', error.message);
    
    if (error.response) {
      console.log('📊 Error Response Status:', error.response.status);
      console.log('📊 Error Response Data:', JSON.stringify(error.response.data, null, 2));
    }
    
    // Try alternative authentication methods
    console.log('🔄 Trying alternative authentication...');
    
    try {
      // Try with working-auth endpoint
      const workingAuthResponse = await axios.post(`${BASE_URL}/working-auth/login`, {
        email: 'test-coordinator@peak1031.com',
        password: 'password123'
      });
      
      if (workingAuthResponse.data.token) {
        console.log('✅ Working auth successful');
        const token = workingAuthResponse.data.token;
        
        // Test templates endpoint
        const templatesResponse = await axios.get(`${BASE_URL}/templates`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('📊 Templates API Response Status:', templatesResponse.status);
        console.log('📊 Templates API Response Data:', JSON.stringify(templatesResponse.data, null, 2));
      }
      
    } catch (authError) {
      console.error('❌ Alternative authentication also failed:', authError.message);
      
      // Try with supabase-auth
      console.log('🔄 Trying supabase-auth...');
      try {
        const supabaseAuthResponse = await axios.post(`${BASE_URL}/supabase-auth/login`, {
          email: 'test-coordinator@peak1031.com',
          password: 'password123'
        });
        
        if (supabaseAuthResponse.data.token) {
          console.log('✅ Supabase auth successful');
          const token = supabaseAuthResponse.data.token;
          
          // Test templates endpoint
          const templatesResponse = await axios.get(`${BASE_URL}/templates`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('📊 Templates API Response Status:', templatesResponse.status);
          console.log('📊 Templates API Response Data:', JSON.stringify(templatesResponse.data, null, 2));
        }
        
      } catch (supabaseError) {
        console.error('❌ Supabase auth also failed:', supabaseError.message);
        
        // Try without authentication to see if the endpoint exists
        console.log('🔄 Testing endpoint without authentication...');
        try {
          const noAuthResponse = await axios.get(`${BASE_URL}/templates`);
          console.log('📊 No Auth Response Status:', noAuthResponse.status);
          console.log('📊 No Auth Response Data:', JSON.stringify(noAuthResponse.data, null, 2));
        } catch (noAuthError) {
          console.log('📊 No Auth Error Status:', noAuthError.response?.status);
          console.log('📊 No Auth Error Data:', JSON.stringify(noAuthError.response?.data, null, 2));
        }
      }
    }
  }
}

testTemplatesWithAuth();
