require('dotenv').config();
const axios = require('axios');

const API_URL = 'http://localhost:5001/api';

// Test credentials - you may need to update these
const testUser = {
  email: 'admin@example.com',
  password: 'peak2024'
};

async function testSearchFunctionality() {
  try {
    console.log('🔐 Logging in...');
    
    // First, login to get a token
    const loginResponse = await axios.post(`${API_URL}/auth/login`, testUser);
    const token = loginResponse.data.token;
    
    if (!token) {
      console.error('❌ Failed to get authentication token');
      return;
    }
    
    console.log('✅ Logged in successfully');
    
    // Create headers with authentication
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('\n🔍 Testing search functionality...\n');
    
    // Test 1: Search by PP Matter Number
    console.log('1️⃣ Searching by PP Matter Number: 7981');
    const searchByPPNumber = await axios.get(`${API_URL}/exchanges?search=7981`, { headers });
    console.log(`   Found ${searchByPPNumber.data.exchanges?.length || 0} exchanges`);
    if (searchByPPNumber.data.exchanges?.length > 0) {
      console.log(`   ✅ Found: ${searchByPPNumber.data.exchanges[0].name}`);
    }
    
    // Test 2: Search by Exchange ID
    console.log('\n2️⃣ Searching by Exchange ID: 4b7e0059-8154-4443-ae85-a0549edec8c4');
    const searchById = await axios.get(`${API_URL}/exchanges?search=4b7e0059-8154-4443-ae85-a0549edec8c4`, { headers });
    console.log(`   Found ${searchById.data.exchanges?.length || 0} exchanges`);
    if (searchById.data.exchanges?.length > 0) {
      console.log(`   ✅ Found: ${searchById.data.exchanges[0].name}`);
    }
    
    // Test 3: Search by Name
    console.log('\n3️⃣ Searching by Name: Ofer');
    const searchByName = await axios.get(`${API_URL}/exchanges?search=Ofer`, { headers });
    console.log(`   Found ${searchByName.data.exchanges?.length || 0} exchanges`);
    if (searchByName.data.exchanges?.length > 0) {
      console.log(`   ✅ Found: ${searchByName.data.exchanges[0].name}`);
    }
    
    // Test 4: Search by Address
    console.log('\n4️⃣ Searching by Address: 10982 Roebling');
    const searchByAddress = await axios.get(`${API_URL}/exchanges?search=10982%20Roebling`, { headers });
    console.log(`   Found ${searchByAddress.data.exchanges?.length || 0} exchanges`);
    if (searchByAddress.data.exchanges?.length > 0) {
      console.log(`   ✅ Found: ${searchByAddress.data.exchanges[0].name}`);
    }
    
    // Test 5: Search by APN
    console.log('\n5️⃣ Searching by APN: 4363-007-106');
    const searchByAPN = await axios.get(`${API_URL}/exchanges?search=4363-007-106`, { headers });
    console.log(`   Found ${searchByAPN.data.exchanges?.length || 0} exchanges`);
    if (searchByAPN.data.exchanges?.length > 0) {
      console.log(`   ✅ Found: ${searchByAPN.data.exchanges[0].name}`);
    }
    
    // Test 6: Search by Escrow Number
    console.log('\n6️⃣ Searching by Escrow Number: CA-25-26225');
    const searchByEscrow = await axios.get(`${API_URL}/exchanges?search=CA-25-26225`, { headers });
    console.log(`   Found ${searchByEscrow.data.exchanges?.length || 0} exchanges`);
    if (searchByEscrow.data.exchanges?.length > 0) {
      console.log(`   ✅ Found: ${searchByEscrow.data.exchanges[0].name}`);
    }
    
    // Get the full exchange details
    if (searchByPPNumber.data.exchanges?.length > 0) {
      const exchangeId = searchByPPNumber.data.exchanges[0].id;
      console.log('\n📋 Full Exchange Details:');
      const fullExchange = await axios.get(`${API_URL}/exchanges/${exchangeId}`, { headers });
      const ex = fullExchange.data.exchange;
      
      console.log('   ID:', ex.id);
      console.log('   PP Matter #:', ex.ppMatterNumber || ex.pp_matter_number);
      console.log('   Name:', ex.name);
      console.log('   Status:', ex.status);
      console.log('   Address:', ex.relPropertyAddress || ex.rel_property_address);
      console.log('   APN:', ex.relApn || ex.rel_apn);
      console.log('   Escrow #:', ex.relEscrowNumber || ex.rel_escrow_number);
      console.log('   Value:', ex.relValue || ex.rel_value);
      console.log('   Client Vesting:', ex.clientVesting || ex.client_vesting);
      console.log('   Buyer 1:', ex.buyer1Name || ex.buyer_1_name);
      console.log('   Buyer 2:', ex.buyer2Name || ex.buyer_2_name);
    }
    
    console.log('\n✅ All search tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Run the tests
testSearchFunctionality();