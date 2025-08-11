const supabaseService = require('./services/supabase');
require('dotenv').config();

async function createInvitationsTableManual() {
  console.log('🔧 Creating invitations table manually...');
  
  try {
    // Since we can't use exec_sql, we'll create the table by using the Supabase REST API directly
    const { createClient } = require('@supabase/supabase-js');
    
    // Create a client with service role key for admin operations
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // First, let's try to create the table using a SQL query via the REST API
    console.log('📡 Attempting to create table via SQL query...');
    
    // Use the sql query endpoint
    const createTableSQL = `
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
    `;

    // Try different approaches to execute the SQL
    try {
      // Method 1: Try the sql function
      const { data, error } = await supabaseAdmin.rpc('sql', { query: createTableSQL });
      if (error) {
        console.log('❌ SQL function not available:', error.message);
      } else {
        console.log('✅ Table created via sql function!');
        return true;
      }
    } catch (e) {
      console.log('⚠️ SQL function approach failed:', e.message);
    }

    // Method 2: Try to execute SQL via the edge function or custom endpoint
    try {
      // Check if we can use a custom SQL execution function
      const { data, error } = await supabaseAdmin.rpc('execute_sql', { sql: createTableSQL });
      if (error) {
        console.log('❌ execute_sql function not available:', error.message);
      } else {
        console.log('✅ Table created via execute_sql!');
        return true;
      }
    } catch (e) {
      console.log('⚠️ execute_sql approach failed:', e.message);
    }

    // Method 3: Create table by attempting to insert and catching the error
    console.log('📝 Creating table structure by analyzing schema...');
    
    // Since we can't execute DDL directly, let's print the SQL for manual execution
    console.log(`
📋 Please execute the following SQL in your Supabase SQL Editor:

${createTableSQL}

🔗 Go to: https://supabase.com/dashboard/project/${process.env.SUPABASE_URL?.split('//')[1]?.split('.')[0]}/sql

After executing the SQL, the invitation system will work properly.
    `);

    return false;

  } catch (error) {
    console.error('❌ Error creating table:', error);
    return false;
  }
}

createInvitationsTableManual()
  .then(success => {
    if (success) {
      console.log('🎉 Invitations table created successfully!');
    } else {
      console.log('⚠️ Please create the table manually in Supabase dashboard');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });