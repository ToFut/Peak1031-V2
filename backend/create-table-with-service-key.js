const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function createInvitationsTable() {
  console.log('🔧 Creating invitations table with service role key...');
  
  try {
    // Create admin client with service key
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        db: { schema: 'public' }
      }
    );

    console.log('📡 Attempting to create table via REST API...');
    
    // Since direct DDL isn't available, let's try a different approach
    // First check if we can access the users table to validate connection
    const { data: usersTest, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id')
      .limit(1);
      
    if (usersError) {
      console.log('❌ Cannot access users table:', usersError);
      throw new Error('Invalid Supabase connection');
    }
    
    console.log('✅ Supabase connection verified');
    
    // Try to create table by attempting schema manipulation
    // This approach uses the PostgREST API to execute stored procedures
    
    const createTableSQL = `
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  exchange_id UUID NOT NULL REFERENCES public.exchanges(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('client', 'third_party', 'agency', 'coordinator')),
  invited_by UUID NOT NULL REFERENCES public.users(id),
  invitation_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  custom_message TEXT,
  user_id UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_exchange_id ON public.invitations(exchange_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON public.invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_invitations_invited_by ON public.invitations(invited_by);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
    `;
    
    console.log('📋 Since direct DDL execution is not available via PostgREST,');
    console.log('   please execute the following SQL in your Supabase dashboard:');
    console.log('');
    console.log('🔗 Supabase SQL Editor: https://supabase.com/dashboard/project/dqmufpexuuvlulpilirt/sql');
    console.log('');
    console.log('📄 SQL to execute:');
    console.log('=====================================');
    console.log(createTableSQL);
    console.log('=====================================');
    console.log('');
    console.log('📝 Alternatively, use the file: INVITATIONS_TABLE_SETUP.sql');
    console.log('   (This file contains the complete setup with RLS policies)');
    
    return false; // Manual creation required
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function testAfterCreation() {
  console.log('\n🧪 Testing after manual table creation...');
  
  try {
    const supabaseService = require('./services/supabase');
    
    // Test if table exists now
    const { data, error } = await supabaseService.client
      .from('invitations')
      .select('id')
      .limit(1);
      
    if (error && error.message.includes('does not exist')) {
      console.log('❌ Table still does not exist');
      console.log('   Please create it manually using the SQL provided above');
      return false;
    }
    
    console.log('✅ Invitations table is now accessible!');
    
    // Find test data for invitations
    const { data: users } = await supabaseService.client
      .from('users')
      .select('id, email, role')
      .in('role', ['admin', 'coordinator'])
      .limit(1);
      
    const { data: exchanges } = await supabaseService.client
      .from('exchanges')
      .select('id, name, exchange_number')
      .limit(1);
      
    if (users.length > 0 && exchanges.length > 0) {
      console.log('✅ Found test data:');
      console.log(`   User: ${users[0].email} (${users[0].role})`);
      console.log(`   Exchange: ${exchanges[0].name || exchanges[0].exchange_number}`);
      console.log('');
      console.log('🎯 Ready to send invitations to:');
      console.log('   📧 segev@futurixs.com');
      console.log('   📱 +12137086881');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Error testing:', error.message);
    return false;
  }
}

// Run the setup
createInvitationsTable()
  .then(async (success) => {
    if (!success) {
      console.log('\n⏳ Waiting for manual table creation...');
      console.log('   After creating the table, run this script again to test.');
      
      // Try to test anyway in case table was created
      await testAfterCreation();
    }
    
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });