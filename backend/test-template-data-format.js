/**
 * Test script to check template data format returned by the API
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');

const testTemplateDataFormat = async () => {
  try {
    console.log('🧪 Testing template data format from API...');
    
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
    
    const fetch = require('node-fetch');
    const baseURL = 'http://localhost:5001/api';
    
    // Get all templates
    console.log('\n📋 Fetching templates...');
    const response = await fetch(`${baseURL}/templates`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.log('❌ Failed to get templates:', response.status);
      const errorText = await response.text();
      console.log('Error:', errorText);
    } else {
      const result = await response.json();
      
      // Check the structure of the response
      console.log('\n📊 Response structure:');
      console.log('   - Has success field:', 'success' in result);
      console.log('   - Success value:', result.success);
      console.log('   - Has data field:', 'data' in result);
      console.log('   - Data is array:', Array.isArray(result.data));
      console.log('   - Number of templates:', result.data?.length || 0);
      
      if (result.data && result.data.length > 0) {
        const firstTemplate = result.data[0];
        
        console.log('\n📄 First template field analysis:');
        console.log('   Fields present in template:');
        Object.keys(firstTemplate).forEach(key => {
          const value = firstTemplate[key];
          const type = Array.isArray(value) ? 'array' : typeof value;
          console.log(`     - ${key}: ${type}`);
        });
        
        console.log('\n🔍 Checking active field variations:');
        console.log('   - Has is_active:', 'is_active' in firstTemplate);
        console.log('   - is_active value:', firstTemplate.is_active);
        console.log('   - Has isActive:', 'isActive' in firstTemplate);
        console.log('   - isActive value:', firstTemplate.isActive);
        console.log('   - Has active:', 'active' in firstTemplate);
        console.log('   - active value:', firstTemplate.active);
        
        // Count active templates with different field names
        const activeCount_is_active = result.data.filter(t => t.is_active === true).length;
        const activeCount_isActive = result.data.filter(t => t.isActive === true).length;
        const activeCount_active = result.data.filter(t => t.active === true).length;
        
        console.log('\n📊 Active template counts:');
        console.log(`   - Active (using is_active): ${activeCount_is_active}`);
        console.log(`   - Active (using isActive): ${activeCount_isActive}`);
        console.log(`   - Active (using active): ${activeCount_active}`);
        
        console.log('\n📝 Sample template (first 3):');
        result.data.slice(0, 3).forEach((template, index) => {
          console.log(`\n   Template ${index + 1}:`);
          console.log(`     - id: ${template.id}`);
          console.log(`     - name: ${template.name}`);
          console.log(`     - category: ${template.category}`);
          console.log(`     - is_active: ${template.is_active}`);
          console.log(`     - isActive: ${template.isActive}`);
          console.log(`     - created_at: ${template.created_at}`);
        });
      }
    }
    
    console.log('\n✅ Template data format test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testTemplateDataFormat();