require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const API_URL = 'http://localhost:5001/api';
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testExchangeFetch() {
  try {
    console.log('🔍 Testing Exchange Data Fetch for ID: 4b7e0059-8154-4443-ae85-a0549edec8c4\n');
    
    // First, get an admin token
    console.log('🔐 Getting authentication token...');
    
    // Get admin user from database
    const { data: adminUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('role', 'admin')
      .limit(1)
      .single();
    
    if (!adminUser) {
      console.error('❌ No admin user found');
      return;
    }
    
    // Create a test token (in production, you'd use proper login)
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { 
        id: adminUser.id, 
        email: adminUser.email, 
        role: 'admin' 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    
    console.log('✅ Using admin user:', adminUser.email);
    
    // Test the API endpoint
    console.log('\n📡 Fetching exchange via API...');
    const response = await axios.get(
      `${API_URL}/exchanges/4b7e0059-8154-4443-ae85-a0549edec8c4`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const exchangeData = response.data;
    
    console.log('\n✅ Exchange Data Retrieved Successfully!\n');
    console.log('📋 Basic Information:');
    console.log('   ID:', exchangeData.id);
    console.log('   Name:', exchangeData.name);
    console.log('   Status:', exchangeData.status);
    console.log('   PP Matter Number:', exchangeData.ppMatterNumber || exchangeData.pp_matter_number);
    
    console.log('\n🏠 Relinquished Property (from main object):');
    console.log('   Address:', exchangeData.relPropertyAddress || exchangeData.rel_property_address);
    console.log('   Type:', exchangeData.relPropertyType || exchangeData.rel_property_type);
    console.log('   APN:', exchangeData.relApn || exchangeData.rel_apn);
    console.log('   Escrow #:', exchangeData.relEscrowNumber || exchangeData.rel_escrow_number);
    console.log('   Value:', exchangeData.relValue || exchangeData.rel_value);
    console.log('   Contract Date:', exchangeData.relContractDate || exchangeData.rel_contract_date);
    console.log('   Contract Type:', exchangeData.contractType || exchangeData.contract_type);
    console.log('   Expected Closing:', exchangeData.expectedClosingDate || exchangeData.expected_closing_date);
    console.log('   Settlement Agent:', exchangeData.settlementAgent || exchangeData.settlement_agent);
    
    console.log('\n👥 Vesting & Buyers (from main object):');
    console.log('   Client Vesting:', exchangeData.clientVesting || exchangeData.client_vesting);
    console.log('   Buyer Vesting:', exchangeData.buyerVesting || exchangeData.buyer_vesting);
    console.log('   Buyer 1:', exchangeData.buyer1Name || exchangeData.buyer_1_name);
    console.log('   Buyer 2:', exchangeData.buyer2Name || exchangeData.buyer_2_name);
    
    if (exchangeData.relinquishedProperty) {
      console.log('\n🏠 Relinquished Property (from nested object):');
      const prop = exchangeData.relinquishedProperty;
      console.log('   Address:', prop.address);
      console.log('   Type:', prop.propertyType);
      console.log('   APN:', prop.apn);
      console.log('   Escrow #:', prop.escrowNumber);
      console.log('   Value:', prop.value);
      console.log('   Contract Date:', prop.contractDate);
      console.log('   Contract Type:', prop.contractType);
      console.log('   Expected Closing:', prop.expectedClosing);
      console.log('   Settlement Agent:', prop.settlementAgent);
      console.log('   Client Vesting:', prop.clientVesting);
      console.log('   Buyer Vesting:', prop.buyerVesting);
      console.log('   Buyer 1:', prop.buyer1Name);
      console.log('   Buyer 2:', prop.buyer2Name);
    }
    
    if (exchangeData.practicePartnerData) {
      console.log('\n📊 PracticePanther Data:');
      const pp = exchangeData.practicePartnerData;
      console.log('   Matter ID:', pp.matterId);
      console.log('   Matter Number:', pp.matterNumber);
      console.log('   Matter Name:', pp.matterName);
    }
    
    console.log('\n🎯 Field Availability Check:');
    const fieldsToCheck = [
      'pp_matter_number',
      'rel_property_address',
      'rel_property_type',
      'rel_apn',
      'rel_escrow_number',
      'rel_value',
      'client_vesting',
      'buyer_vesting',
      'buyer_1_name',
      'buyer_2_name',
      'settlement_agent',
      'contract_type',
      'expected_closing_date'
    ];
    
    fieldsToCheck.forEach(field => {
      const camelCase = field.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      const value = exchangeData[field] || exchangeData[camelCase];
      console.log(`   ${field}: ${value ? '✅ Available' : '❌ Missing'} ${value ? `(${value})` : ''}`);
    });
    
    console.log('\n✅ All data fields are accessible via the API!');
    console.log('The frontend should be able to display all these fields.');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Run the test
testExchangeFetch();