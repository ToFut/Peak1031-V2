const axios = require('axios');
const supabaseService = require('../services/supabase');
const jwt = require('jsonwebtoken');

async function testClientAuthentication() {
  const exchangeId = "d0ff9efc-c9c8-431e-83fa-e48661d10ef1";
  const userEmail = "client@peak1031.com";
  
  console.log('🧪 Testing client authentication and access for:', { exchangeId, userEmail });
  
  try {
    // 1. Get the user from database
    const { data: user, error: userError } = await supabaseService.client
      .from('users')
      .select('*')
      .eq('email', userEmail)
      .single();
      
    if (userError) {
      console.log('❌ User not found:', userError);
      return;
    }
    
    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      role: user.role,
      contact_id: user.contact_id
    });
    
    // 2. Create a JWT token for the user (simulating login)
    const token = jwt.sign(
      {
        userId: user.id, // Use userId to match auth middleware
        email: user.email,
        role: user.role,
        contact_id: user.contact_id
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    
    console.log('🔐 JWT token created for user');
    
    // 3. Test the messaging endpoint with authentication
    console.log('\n📥 Testing GET /api/messages/exchange/:exchangeId with auth...');
    
    const response = await axios.get(`http://localhost:5001/api/messages/exchange/${exchangeId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Response status:', response.status);
    console.log('📊 Messages found:', response.data?.data?.length || 0);
    
    // 4. Test the participants endpoint
    console.log('\n👥 Testing GET /api/exchanges/:id/participants with auth...');
    
    const participantsResponse = await axios.get(`http://localhost:5001/api/exchanges/${exchangeId}/participants`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Participants response status:', participantsResponse.status);
    console.log('📊 Participants found:', participantsResponse.data?.data?.length || 0);
    
    if (participantsResponse.data?.data) {
      participantsResponse.data.data.forEach((participant, index) => {
        console.log(`   ${index + 1}. ${participant.firstName} ${participant.lastName} (${participant.email}) - ${participant.role}`);
      });
    }
    
    // 5. Test the exchange details endpoint
    console.log('\n🏢 Testing GET /api/exchanges/:id with auth...');
    
    const exchangeResponse = await axios.get(`http://localhost:5001/api/exchanges/${exchangeId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Exchange response status:', exchangeResponse.status);
    console.log('📋 Exchange details:', {
      id: exchangeResponse.data?.id,
      name: exchangeResponse.data?.name,
      status: exchangeResponse.data?.status,
      client_id: exchangeResponse.data?.client_id,
      coordinator_id: exchangeResponse.data?.coordinator_id
    });
    
  } catch (error) {
    console.log('❌ Error:', error.response?.status, error.response?.data?.message || error.message);
    
    if (error.response?.status === 403) {
      console.log('🔒 Access denied - RBAC system is blocking access');
      console.log('💡 This suggests the RBAC fix might not be working properly');
    } else if (error.response?.status === 401) {
      console.log('🔐 Unauthorized - authentication issue');
    }
  }
  
  // 6. Test admin access for comparison
  console.log('\n👑 Testing admin access for comparison...');
  
  try {
    const { data: adminUser } = await supabaseService.client
      .from('users')
      .select('*')
      .eq('role', 'admin')
      .single();
    
    if (adminUser) {
      const adminToken = jwt.sign(
        {
          userId: adminUser.id, // Use userId to match auth middleware
          email: adminUser.email,
          role: adminUser.role
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '1h' }
      );
      
      const adminResponse = await axios.get(`http://localhost:5001/api/messages/exchange/${exchangeId}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Admin access works - status:', adminResponse.status);
    }
  } catch (adminError) {
    console.log('❌ Admin test failed:', adminError.message);
  }
}

// Run the test
testClientAuthentication().catch(console.error);
