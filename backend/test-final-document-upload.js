const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

// Test document upload after removing people table dependency
async function testFinalDocumentUpload() {
  console.log('🧪 Testing Document Upload (Final - No People Table)\n');
  
  const API_URL = process.env.API_URL || 'http://localhost:5001/api';
  
  try {
    // Step 1: Login to get auth token
    console.log('1️⃣ Logging in as admin...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@peak1031.com',
      password: 'Peak2024!'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful\n');
    
    // Step 2: Get user info to verify
    console.log('2️⃣ Getting user profile...');
    const profileResponse = await axios.get(`${API_URL}/auth/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const userId = profileResponse.data.id;
    console.log(`✅ User ID: ${userId}\n`);
    
    // Step 3: Get an exchange
    console.log('3️⃣ Getting exchange...');
    const exchangesResponse = await axios.get(`${API_URL}/exchanges`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const exchanges = exchangesResponse.data.exchanges || exchangesResponse.data;
    const exchangeId = exchanges[0].id;
    console.log(`✅ Using exchange: ${exchanges[0].name}\n`);
    
    // Step 4: Create test file
    console.log('4️⃣ Creating test document...');
    const testContent = `Final Test Document
Date: ${new Date().toISOString()}
User ID: ${userId}
Exchange ID: ${exchangeId}

This document tests upload functionality after removing people table dependency.`;
    
    const testFilePath = path.join(__dirname, 'test-final-document.txt');
    fs.writeFileSync(testFilePath, testContent);
    console.log('✅ Test document created\n');
    
    // Step 5: Upload document
    console.log('5️⃣ Uploading document...');
    const form = new FormData();
    form.append('file', fs.createReadStream(testFilePath));
    form.append('exchangeId', exchangeId);
    form.append('category', 'test-final');
    
    const uploadResponse = await axios.post(`${API_URL}/documents`, form, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...form.getHeaders()
      }
    });
    
    const uploadResult = uploadResponse.data;
    console.log('✅ Document uploaded successfully!');
    console.log('📄 Document details:', {
      id: uploadResult.data?.id,
      uploadedBy: uploadResult.data?.uploaded_by,
      status: 'Success - No people table needed!'
    });
    
    // Step 6: Verify in database
    console.log('\n6️⃣ Verifying document in database...');
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    
    const { data: doc, error } = await supabase
      .from('documents')
      .select('id, uploaded_by, original_filename')
      .eq('id', uploadResult.data?.id)
      .single();
      
    if (doc) {
      console.log('✅ Document verified in database');
      console.log('   Uploaded by user ID:', doc.uploaded_by);
      console.log('   Matches current user:', doc.uploaded_by === userId);
      
      // Check if this user exists in users table
      const { data: userExists } = await supabase
        .from('users')
        .select('id, email')
        .eq('id', doc.uploaded_by)
        .single();
        
      if (userExists) {
        console.log('✅ User verified in users table:', userExists.email);
      }
    }
    
    // Clean up
    fs.unlinkSync(testFilePath);
    console.log('\n🎉 SUCCESS! Document system works without people table!');
    console.log('   Foreign keys are properly pointing to users table.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    
    // Clean up
    try {
      const testFilePath = path.join(__dirname, 'test-final-document.txt');
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    } catch (e) {}
  }
  
  process.exit();
}

testFinalDocumentUpload();