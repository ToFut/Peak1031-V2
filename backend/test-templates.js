/**
 * Test script to check why templates show as 0
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');

const testTemplates = async () => {
  try {
    console.log('🧪 Testing templates endpoint...');
    
    // Create admin JWT token
    const adminUserId = '278304de-568f-4138-b35b-6fdcfbd2f1ce';
    const adminToken = jwt.sign(
      {
        userId: adminUserId,
        id: adminUserId,
        email: 'admin@peak1031.com',
        role: 'admin',
        contact_id: adminUserId
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    console.log('🎫 Created admin JWT token');
    
    const fetch = require('node-fetch');
    const baseURL = 'http://localhost:5001/api';
    
    // Test 1: Get all templates
    console.log('\n📋 Test 1: Fetching all templates...');
    const response1 = await fetch(`${baseURL}/templates`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response1.ok) {
      console.log('❌ Failed to get templates:', response1.status);
      const errorText = await response1.text();
      console.log('Error:', errorText);
    } else {
      const templates = await response1.json();
      console.log(`✅ Got ${templates.length} templates`);
      
      if (templates.length > 0) {
        console.log('📄 Sample template:', {
          id: templates[0].id,
          name: templates[0].name,
          category: templates[0].category,
          created_at: templates[0].created_at
        });
      }
    }
    
    // Test 2: Get active templates
    console.log('\n📋 Test 2: Fetching active templates...');
    const response2 = await fetch(`${baseURL}/templates/active`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response2.ok) {
      console.log('❌ Failed to get active templates:', response2.status);
      const errorText = await response2.text();
      console.log('Error:', errorText);
    } else {
      const activeTemplates = await response2.json();
      console.log(`✅ Got ${activeTemplates.length} active templates`);
    }
    
    // Test 3: Check if document_templates table exists in Supabase
    console.log('\n📋 Test 3: Checking document_templates table directly...');
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    const { data, error, count } = await supabase
      .from('document_templates')
      .select('*', { count: 'exact' });
    
    if (error) {
      console.log('❌ Error querying document_templates:', error.message);
      console.log('   This likely means the table doesn\'t exist or is empty');
    } else {
      console.log(`✅ document_templates table exists with ${data?.length || 0} records`);
      if (data && data.length > 0) {
        console.log('📄 First template in database:', data[0]);
      }
    }
    
    // Test 4: Check documents table for templates
    console.log('\n📋 Test 4: Checking if templates are in documents table...');
    const { data: docs, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .or('category.eq.template,is_template.eq.true')
      .limit(5);
    
    if (docsError) {
      console.log('❌ Error querying documents:', docsError.message);
    } else {
      console.log(`✅ Found ${docs?.length || 0} potential templates in documents table`);
      if (docs && docs.length > 0) {
        console.log('📄 Sample document:', {
          id: docs[0].id,
          name: docs[0].original_filename,
          category: docs[0].category,
          is_template: docs[0].is_template
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testTemplates();