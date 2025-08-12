require('dotenv').config();
const supabaseService = require('./services/supabase');

async function runMigration() {
  try {
    const supabase = supabaseService.client;
    
    if (!supabase) {
      console.error('Supabase client not initialized');
      process.exit(1);
    }

    console.log('Running migration: Add invited_at column to exchange_participants...');

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Add invited_at column to exchange_participants table
        ALTER TABLE exchange_participants
        ADD COLUMN IF NOT EXISTS invited_at TIMESTAMP WITH TIME ZONE;

        -- Update existing records to have invited_at set to created_at if NULL
        UPDATE exchange_participants
        SET invited_at = created_at
        WHERE invited_at IS NULL;
      `
    });

    if (error) {
      console.error('Migration error:', error);
      process.exit(1);
    }

    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

runMigration();