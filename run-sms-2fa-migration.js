const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://fozdhmlcjnjkwilmiiem.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvemRobWxjam5qa3dpbG1paWVtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDM5NjczNSwiZXhwIjoyMDY5OTcyNzM1fQ.9Rgobs72hgeXtue4fG7Yqz0cWsri6JV88fn3UbKmI8g'
);

async function runMigration() {
  console.log('🔄 Running SMS 2FA migration...\n');

  try {
    // Add SMS 2FA columns to users table
    const migrationSQL = `
      -- Add SMS 2FA columns to users table
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS two_fa_type VARCHAR(10) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS two_fa_expires_at TIMESTAMP DEFAULT NULL;

      -- Add index for 2FA type
      CREATE INDEX IF NOT EXISTS idx_users_two_fa_type ON users(two_fa_type);

      -- Add index for 2FA expiration
      CREATE INDEX IF NOT EXISTS idx_users_two_fa_expires ON users(two_fa_expires_at);

      -- Update existing users to have 'totp' as default 2FA type if they have 2FA enabled
      UPDATE users 
      SET two_fa_type = 'totp' 
      WHERE two_fa_enabled = true AND two_fa_type IS NULL;
    `;

    const { data, error } = await supabase.rpc('execute_safe_query', { sql: migrationSQL });

    if (error) {
      console.error('❌ Migration error:', error);
      return;
    }

    console.log('✅ SMS 2FA migration completed successfully!');
    console.log('📊 Migration result:', data);

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run the migration
runMigration();
