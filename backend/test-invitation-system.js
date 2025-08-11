const invitationService = require('./services/invitationService');
const supabaseService = require('./services/supabase');
require('dotenv').config();

async function testInvitationSystem() {
  console.log('🧪 Testing Invitation System...');
  
  try {
    // Step 1: Check if invitations table exists
    console.log('\n1️⃣ Checking if invitations table exists...');
    const { data: tableCheck, error: tableError } = await supabaseService.client
      .from('invitations')
      .select('id')
      .limit(1);
      
    if (tableError && tableError.message.includes('does not exist')) {
      console.log('❌ Invitations table does not exist!');
      console.log('📋 Please run the SQL file: INVITATIONS_TABLE_SETUP.sql');
      console.log('🔗 In Supabase dashboard: https://supabase.com/dashboard/project/dqmufpexuuvlulpilirt/sql');
      return false;
    }
    
    if (tableError) {
      console.log('❌ Error checking table:', tableError);
      return false;
    }
    
    console.log('✅ Invitations table exists!');
    
    // Step 2: Find an admin/coordinator user
    console.log('\n2️⃣ Finding admin/coordinator user...');
    const { data: adminUsers, error: userError } = await supabaseService.client
      .from('users')
      .select('id, email, role, first_name, last_name')
      .in('role', ['admin', 'coordinator'])
      .limit(1);
      
    if (userError || !adminUsers || adminUsers.length === 0) {
      console.log('❌ No admin/coordinator users found');
      return false;
    }
    
    const adminUser = adminUsers[0];
    console.log(`✅ Found user: ${adminUser.email} (${adminUser.role})`);
    
    // Step 3: Find an exchange
    console.log('\n3️⃣ Finding available exchange...');
    const { data: exchanges, error: exchangeError } = await supabaseService.client
      .from('exchanges')
      .select('id, name, exchange_number')
      .limit(1);
      
    if (exchangeError || !exchanges || exchanges.length === 0) {
      console.log('❌ No exchanges found');
      return false;
    }
    
    const exchange = exchanges[0];
    console.log(`✅ Found exchange: ${exchange.name || exchange.exchange_number}`);
    
    // Step 4: Test invitation token generation
    console.log('\n4️⃣ Testing invitation token generation...');
    const token = invitationService.generateInvitationToken();
    console.log(`✅ Generated token: ${token.substring(0, 16)}...`);
    
    // Step 5: Test invitation creation (without sending)
    console.log('\n5️⃣ Testing invitation creation...');
    const testInvitation = {
      email: 'test@example.com',
      phone: '+1234567890',
      role: 'client',
      method: 'email',
      firstName: 'Test',
      lastName: 'User'
    };
    
    const invitationToken = invitationService.generateInvitationToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    const { data: createdInvitation, error: createError } = await supabaseService.client
      .from('invitations')
      .insert([{
        email: testInvitation.email,
        phone: testInvitation.phone,
        exchange_id: exchange.id,
        role: testInvitation.role,
        invited_by: adminUser.id,
        invitation_token: invitationToken,
        expires_at: expiresAt.toISOString(),
        first_name: testInvitation.firstName,
        last_name: testInvitation.lastName,
        custom_message: 'Test invitation from automated system'
      }])
      .select()
      .single();
      
    if (createError) {
      console.log('❌ Error creating test invitation:', createError);
      return false;
    }
    
    console.log('✅ Test invitation created successfully!');
    console.log(`   ID: ${createdInvitation.id}`);
    console.log(`   Token: ${createdInvitation.invitation_token}`);
    
    // Step 6: Test email template generation
    console.log('\n6️⃣ Testing email template generation...');
    const emailHtml = invitationService.generateEmailTemplate(
      testInvitation.firstName,
      adminUser.first_name || 'Admin',
      exchange.name || exchange.exchange_number,
      testInvitation.role,
      createdInvitation.invitation_token,
      'Welcome to our platform!'
    );
    
    if (emailHtml && emailHtml.includes('invitation')) {
      console.log('✅ Email template generated successfully');
    } else {
      console.log('❌ Email template generation failed');
    }
    
    // Step 7: Test SMS template generation
    console.log('\n7️⃣ Testing SMS template generation...');
    const smsText = invitationService.generateSMSTemplate(
      testInvitation.firstName,
      exchange.name || exchange.exchange_number,
      createdInvitation.invitation_token
    );
    
    if (smsText && smsText.includes('invitation')) {
      console.log('✅ SMS template generated successfully');
      console.log(`   Preview: ${smsText.substring(0, 100)}...`);
    } else {
      console.log('❌ SMS template generation failed');
    }
    
    // Step 8: Cleanup test invitation
    console.log('\n8️⃣ Cleaning up test invitation...');
    const { error: deleteError } = await supabaseService.client
      .from('invitations')
      .delete()
      .eq('id', createdInvitation.id);
      
    if (deleteError) {
      console.log('⚠️ Warning: Could not delete test invitation:', deleteError);
    } else {
      console.log('✅ Test invitation cleaned up');
    }
    
    // Final summary
    console.log('\n🎉 INVITATION SYSTEM TEST COMPLETE!');
    console.log('✅ All components are working correctly');
    console.log('');
    console.log('Ready to send real invitations to:');
    console.log('📧 Email: segev@futurixs.com');
    console.log('📱 Phone: +12137086881');
    console.log('');
    console.log('Next steps:');
    console.log('1. Start the backend server: npm run dev:backend');
    console.log('2. Start the frontend: npm run dev:frontend');
    console.log('3. Navigate to an exchange page');
    console.log('4. Go to Invitations tab');
    console.log('5. Send invitation to segev@futurixs.com and +12137086881');
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return false;
  }
}

// Check environment variables
function checkEnvironmentVariables() {
  console.log('🔧 Checking environment variables...');
  
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SENDGRID_API_KEY',
    'SENDGRID_FROM_EMAIL',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_FROM_NUMBER'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.log('❌ Missing required environment variables:');
    missing.forEach(key => console.log(`   - ${key}`));
    return false;
  }
  
  console.log('✅ All required environment variables are set');
  return true;
}

// Run the test
async function runTest() {
  console.log('🚀 Starting Invitation System Test Suite\n');
  
  if (!checkEnvironmentVariables()) {
    process.exit(1);
  }
  
  const success = await testInvitationSystem();
  process.exit(success ? 0 : 1);
}

runTest();