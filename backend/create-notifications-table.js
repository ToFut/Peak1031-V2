#!/usr/bin/env node

/**
 * Create the missing notifications table in Supabase
 */

const supabaseService = require('./services/supabase');

async function createNotificationsTable() {
  console.log('🛠️ Creating notifications table in Supabase...\n');

  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS public.notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT,
      urgency VARCHAR(50) DEFAULT 'medium',
      read BOOLEAN DEFAULT false,
      read_at TIMESTAMPTZ,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      related_exchange_id UUID REFERENCES exchanges(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
    CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
    CREATE INDEX IF NOT EXISTS idx_notifications_related_exchange_id ON public.notifications(related_exchange_id);

    -- Enable Row Level Security
    ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

    -- Create RLS policies
    CREATE POLICY IF NOT EXISTS "Users can only see their own notifications" 
    ON public.notifications 
    FOR SELECT 
    USING (auth.uid()::text = user_id::text);

    CREATE POLICY IF NOT EXISTS "Users can only update their own notifications" 
    ON public.notifications 
    FOR UPDATE 
    USING (auth.uid()::text = user_id::text);

    -- Allow service role to insert notifications (for backend)
    CREATE POLICY IF NOT EXISTS "Service role can insert notifications" 
    ON public.notifications 
    FOR INSERT 
    WITH CHECK (true);
  `;

  try {
    // Execute the SQL
    const { data, error } = await supabaseService.client.rpc('exec_sql', {
      sql: createTableSQL
    });

    if (error) {
      console.log('❌ RPC failed, trying direct SQL execution...');
      
      // Try direct SQL execution via the REST API
      const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
        },
        body: JSON.stringify({ sql: createTableSQL })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      
      console.log('✅ Table created successfully via direct SQL!');
    } else {
      console.log('✅ Table created successfully via RPC!', data);
    }

    // Test the table was created
    console.log('\n🔍 Testing notifications table...');
    const { data: testData, error: testError } = await supabaseService.client
      .from('notifications')
      .select('*')
      .limit(1);

    if (testError) {
      throw new Error(`Table test failed: ${testError.message}`);
    }

    console.log('✅ Notifications table is working correctly!');
    console.log(`📊 Current notifications count: ${testData?.length || 0}\n`);

    console.log('🎉 Notifications table setup complete!');

  } catch (error) {
    console.error('❌ Failed to create notifications table:', error.message);
    console.error('Full error:', error);
  }
}

createNotificationsTable();