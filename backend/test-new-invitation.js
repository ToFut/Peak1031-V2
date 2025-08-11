require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const supabaseService = require('./services/supabase');
const invitationService = require('./services/invitationService');

async function testWithNewEmail() {
  console.log('🧪 Testing invitation flow with new email...');
  
  try {
    const exchanges = await supabaseService.getExchanges({ limit: 1 });
    const exchange = exchanges[0];
    console.log('✅ Found exchange:', exchange.id);
    
    // Use a unique test email
    const testEmail = `test-${Date.now()}@futurixs.com`;
    console.log('📧 Testing with email:', testEmail);
    
    const inviteResult = await invitationService.sendInvitation({
      email: testEmail,
      method: 'email',
      exchangeName: exchange.name || exchange.exchange_number,
      inviterName: 'Test System',
      role: 'client',
      firstName: 'Test',
      lastName: 'User',
      customMessage: 'This is a test invitation to verify the system works.',
      exchangeId: exchange.id,
      inviterId: 'test-inviter-123'
    });
    
    console.log('✅ Invitation result:', {
      email_sent: inviteResult.email.sent,
      user_created: !!inviteResult.supabaseUser,
      user_id: inviteResult.supabaseUser?.id
    });
    
    if (inviteResult.email.sent && inviteResult.supabaseUser) {
      console.log('🎉 SUCCESS! Supabase user created and email sent!');
      console.log('📋 User metadata:', inviteResult.supabaseUser.user_metadata);
      console.log('📬 User should receive invitation email shortly.');
      
      // Show what the callback URL will look like
      console.log('🔗 When user completes signup, they will be redirected to:');
      console.log(`   ${process.env.FRONTEND_URL}/auth/callback?exchange=${exchange.id}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testWithNewEmail();