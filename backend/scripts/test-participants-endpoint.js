const axios = require('axios');
const supabaseService = require('../services/supabase');
const jwt = require('jsonwebtoken');

async function testParticipantsEndpoint() {
  const exchangeId = "d0ff9efc-c9c8-431e-83fa-e48661d10ef1";
  const userEmail = "client@peak1031.com";
  
  console.log('🧪 Testing participants endpoint for:', { exchangeId, userEmail });
  
  try {
    // 1. Get the user and create token
    const { data: user } = await supabaseService.client
      .from('users')
      .select('*')
      .eq('email', userEmail)
      .single();
    
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        contact_id: user.contact_id
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    
    // 2. Test the participants endpoint
    console.log('\n👥 Testing GET /api/exchanges/:id/participants...');
    
    const response = await axios.get(`http://localhost:5001/api/exchanges/${exchangeId}/participants`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Response status:', response.status);
    console.log('📊 Participants found:', response.data?.data?.length || 0);
    
    if (response.data?.data) {
      response.data.data.forEach((participant, index) => {
        console.log(`   ${index + 1}. ${participant.firstName} ${participant.lastName} (${participant.email}) - ${participant.role}`);
      });
    }
    
    // 3. Direct database query for comparison
    console.log('\n🔍 Direct database query for participants...');
    
    const { data: directParticipants, error: directError } = await supabaseService.client
      .from('exchange_participants')
      .select(`
        *,
        users:user_id(id, email, first_name, last_name),
        contacts:contact_id(id, email, first_name, last_name)
      `)
      .eq('exchange_id', exchangeId)
      .eq('is_active', true);
    
    if (directError) {
      console.log('❌ Direct query error:', directError);
    } else {
      console.log('📊 Direct query found:', directParticipants?.length || 0, 'participants');
      directParticipants?.forEach((p, index) => {
        const user = p.users;
        const contact = p.contacts;
        const name = user ? `${user.first_name} ${user.last_name}` : 
                    contact ? `${contact.first_name} ${contact.last_name}` : 'Unknown';
        const email = user?.email || contact?.email || 'No email';
        console.log(`   ${index + 1}. ${name} (${email}) - ${p.role}`);
      });
    }
    
  } catch (error) {
    console.log('❌ Error:', error.response?.status, error.response?.data?.message || error.message);
  }
}

// Run the test
testParticipantsEndpoint().catch(console.error);
