const supabaseService = require('./services/supabase');
require('dotenv').config();

async function createInvitationsTableDirect() {
  console.log('🔧 Creating invitations table using direct client...');
  
  try {
    // Try creating by inserting a test record to trigger table creation
    console.log('📡 Attempting to create table via direct operations...');
    
    // First check if table exists by trying a simple select
    const { data: testData, error: testError } = await supabaseService.client
      .from('invitations')
      .select('id')
      .limit(1);
      
    if (testError && testError.message.includes('relation "public.invitations" does not exist')) {
      console.log('❌ Table does not exist, need to create manually');
      console.log('\n📋 SQL to execute in Supabase dashboard:');
      console.log(`
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  exchange_id UUID NOT NULL REFERENCES exchanges(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('client', 'third_party', 'agency', 'coordinator')),
  invited_by UUID NOT NULL REFERENCES users(id),
  invitation_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  custom_message TEXT,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_by UUID REFERENCES users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_exchange_id ON invitations(exchange_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_invitations_invited_by ON invitations(invited_by);

-- Enable RLS (Row Level Security)
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for authenticated users" ON invitations 
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable insert for authenticated users" ON invitations 
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Enable update for invitation owner or invitee" ON invitations 
FOR UPDATE USING (
  auth.uid() = invited_by OR 
  auth.uid() = user_id
);
      `);
      
      console.log(`\n🔗 Supabase Dashboard: https://supabase.com/dashboard/project/dqmufpexuuvlulpilirt/sql`);
      return false;
    } else if (testError) {
      console.log('❌ Other error:', testError.message);
      return false;
    } else {
      console.log('✅ Table already exists!');
      return true;
    }

  } catch (error) {
    console.error('❌ Error:', error);
    return false;
  }
}

// Check if there are any admin or coordinator users to test with
async function checkUsers() {
  console.log('👥 Checking for admin/coordinator users...');
  
  try {
    const { data: users, error } = await supabaseService.client
      .from('users')
      .select('id, email, role')
      .in('role', ['admin', 'coordinator'])
      .limit(5);
      
    if (error) {
      console.error('❌ Error checking users:', error);
      return;
    }
    
    console.log(`✅ Found ${users.length} admin/coordinator users:`);
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.role}) - ID: ${user.id}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Check available exchanges
async function checkExchanges() {
  console.log('🏢 Checking available exchanges...');
  
  try {
    const { data: exchanges, error } = await supabaseService.client
      .from('exchanges')
      .select('id, name, exchange_number')
      .limit(3);
      
    if (error) {
      console.error('❌ Error checking exchanges:', error);
      return;
    }
    
    console.log(`✅ Found ${exchanges.length} exchanges:`);
    exchanges.forEach(exchange => {
      console.log(`  - ${exchange.name || exchange.exchange_number} - ID: ${exchange.id}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createInvitationsTableDirect()
  .then(async (success) => {
    if (success) {
      console.log('🎉 Invitations table ready!');
      
      // Check available users and exchanges
      await checkUsers();
      await checkExchanges();
    } else {
      console.log('⚠️ Please create the table manually in Supabase dashboard');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });