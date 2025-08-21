const axios = require('axios');

async function testAgencyAssignment() {
  try {
    console.log('🧪 Testing agency assignment endpoint...');

    // Step 1: Login to get a valid token
    console.log('🔑 Logging in as admin...');
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'admin@peak1031.com',
      password: 'admin123'
    });

    if (loginResponse.status !== 200) {
      throw new Error('Login failed');
    }

    const token = loginResponse.data.accessToken;
    console.log('✅ Successfully authenticated as admin');

    // Step 2: Get list of contacts to find agencies and third parties
    console.log('📋 Fetching contacts...');
    const contactsResponse = await axios.get('http://localhost:5001/api/contacts', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const contacts = contactsResponse.data.data || [];
    console.log(`Found ${contacts.length} contacts`);

    // Find agencies and third parties
    const agencies = contacts.filter(c => c.contact_type?.includes('agency'));
    const thirdParties = contacts.filter(c => c.contact_type?.includes('third_party'));

    console.log(`📊 Found ${agencies.length} agencies and ${thirdParties.length} third parties`);

    if (agencies.length === 0) {
      console.log('⚠️ No agencies found. Creating a test agency contact...');
      return;
    }

    if (thirdParties.length === 0) {
      console.log('⚠️ No third parties found. Creating a test third party contact...');
      return;
    }

    // Step 3: Test assignment
    const agency = agencies[0];
    const thirdParty = thirdParties[0];

    console.log(`🔗 Testing assignment: ${thirdParty.display_name || thirdParty.first_name + ' ' + thirdParty.last_name} → ${agency.display_name || agency.first_name + ' ' + agency.last_name}`);

    const assignmentData = {
      agency_contact_id: agency.id,
      third_party_contact_id: thirdParty.id,
      can_view_performance: true
    };

    const assignResponse = await axios.post('http://localhost:5001/api/agencies/assign-third-party', assignmentData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📧 Assignment Response Status:', assignResponse.status);
    console.log('📧 Assignment Response Data:', JSON.stringify(assignResponse.data, null, 2));

    if (assignResponse.status === 200) {
      console.log('✅ Third party assigned to agency successfully!');
    } else {
      console.log('❌ Assignment failed');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('💡 Try logging in to the frontend first to ensure admin user exists');
    }
  }
}

testAgencyAssignment();