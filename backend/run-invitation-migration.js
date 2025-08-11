const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function runInvitationMigration() {
  console.log('🚀 Starting invitations table migration...');
  
  try {
    // Create invitations table
    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create invitations table for managing exchange invitations
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
      `
    });

    if (tableError) {
      console.error('❌ Error creating table:', tableError);
      throw tableError;
    }

    // Create indexes
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(invitation_token);
        CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
        CREATE INDEX IF NOT EXISTS idx_invitations_exchange_id ON invitations(exchange_id);
        CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
        CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at);
        CREATE INDEX IF NOT EXISTS idx_invitations_invited_by ON invitations(invited_by);
      `
    });

    if (indexError) {
      console.error('❌ Error creating indexes:', indexError);
      // Don't throw here - indexes are not critical
    }

    // Try direct table creation if RPC doesn't work
    if (tableError && tableError.message.includes('function exec_sql')) {
      console.log('⚠️ RPC function not available, trying direct table creation...');
      
      // Check if table already exists
      const { data: tableExists, error: checkError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'invitations');

      if (checkError) {
        console.error('❌ Error checking if table exists:', checkError);
        throw checkError;
      }

      if (!tableExists || tableExists.length === 0) {
        console.log('📊 Table does not exist. Please create it manually in Supabase dashboard:');
        console.log(`
-- Create invitations table for managing exchange invitations
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_exchange_id ON invitations(exchange_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_invitations_invited_by ON invitations(invited_by);

-- Enable RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view invitations they sent" ON invitations
    FOR SELECT USING (invited_by = auth.uid());

CREATE POLICY "Admins can view all invitations" ON invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "Coordinators can view invitations for their exchanges" ON invitations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM exchanges e
            JOIN users u ON u.id = auth.uid()
            WHERE e.id = exchange_id 
            AND (e.coordinator_id = auth.uid() OR u.role = 'coordinator')
        )
    );

CREATE POLICY "Authorized users can create invitations" ON invitations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'coordinator')
        )
    );

CREATE POLICY "Users can update invitations for acceptance" ON invitations
    FOR UPDATE USING (
        status = 'pending' 
        AND expires_at > CURRENT_TIMESTAMP
    );
        `);
        return;
      } else {
        console.log('✅ Table already exists!');
      }
    }

    console.log('✅ Invitations table migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
runInvitationMigration()
  .then(() => {
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });