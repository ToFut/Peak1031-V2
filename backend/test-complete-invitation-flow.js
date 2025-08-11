require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const supabaseService = require('./services/supabase');
const invitationService = require('./services/invitationService');

async function testFullInvitationFlow() {
  console.log('🧪 Testing complete invitation flow...');
  
  try {
    // 1. Get a real exchange from database
    console.log('📋 Finding existing exchange...');
    const exchanges = await supabaseService.getExchanges({ limit: 1 });
    
    if (!exchanges || exchanges.length === 0) {
      throw new Error('No exchanges found in database');
    }
    
    const exchange = exchanges[0];
    console.log('✅ Found exchange:', exchange.id, exchange.name || exchange.exchange_number);
    
    // 2. Create mock invitation data
    const mockInvitation = {
      email: 'segev@futurixs.com',
      phone: '+12137086881', 
      role: 'client',
      method: 'email',
      firstName: 'Segev',
      lastName: 'TestUser'
    };
    
    // 3. Test the invitation route logic
    console.log('📧 Sending Supabase invitation...');
    const inviteResult = await invitationService.sendInvitation({
      email: mockInvitation.email,
      phone: mockInvitation.phone,
      method: mockInvitation.method,
      exchangeName: exchange.name || exchange.exchange_number,
      inviterName: 'Test System',
      role: mockInvitation.role,
      firstName: mockInvitation.firstName,
      lastName: mockInvitation.lastName,
      customMessage: 'Welcome! This is a test invitation to verify the complete system works.',
      exchangeId: exchange.id,
      inviterId: 'test-inviter-123'
    });
    
    console.log('✅ Invitation sent successfully:', {
      email_sent: inviteResult.email.sent,
      sms_sent: inviteResult.sms.sent,
      user_id: inviteResult.supabaseUser?.id
    });
    
    // 4. Store invitation record (simulate the full route logic)
    if (inviteResult.email.sent) {
      const invitationId = uuidv4();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      const invitation = await supabaseService.insert('invitations', {
        id: invitationId,
        email: mockInvitation.email,
        phone: mockInvitation.phone,
        exchange_id: exchange.id,
        role: mockInvitation.role,
        invited_by: 'test-inviter-123',
        invitation_token: inviteResult.supabaseUser?.id || invitationId,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
        first_name: mockInvitation.firstName,
        last_name: mockInvitation.lastName,
        custom_message: 'Welcome! This is a test invitation.',
        created_at: new Date().toISOString(),
        supabase_user_id: inviteResult.supabaseUser?.id
      });
      
      console.log('✅ Invitation record created:', invitation.id);
      console.log('📬 Check email for invitation link!');
      console.log('🔗 Callback URL will be:', process.env.FRONTEND_URL + '/auth/callback?exchange=' + exchange.id);
      console.log('🔗 Direct signup URL:', process.env.FRONTEND_URL + '/auth/callback#access_token=USER_TOKEN&exchange=' + exchange.id);
    }
    
  } catch (error) {
    console.error('❌ Full invitation test failed:', error.message);
    if (error.stack) console.error(error.stack);
  }
}

testFullInvitationFlow();