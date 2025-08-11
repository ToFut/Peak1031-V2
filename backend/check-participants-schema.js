require('dotenv').config();
const supabaseService = require('./services/supabase');

async function checkSchema() {
  try {
    console.log('🔍 Checking exchange_participants table schema...\n');
    
    // Try to get one row to see the actual column names
    const { data, error } = await supabaseService.client
      .from('exchange_participants')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error:', error);
      
      // Try to create the table if it doesn't exist
      console.log('\n📝 The table might not exist. Here\'s the SQL to create it:\n');
      console.log('```sql');
      console.log(`CREATE TABLE IF NOT EXISTS exchange_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_id UUID NOT NULL REFERENCES exchanges(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'participant',
  permissions TEXT[] DEFAULT ARRAY['view', 'send_messages'],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_exchange UNIQUE(exchange_id, user_id),
  CONSTRAINT unique_contact_exchange UNIQUE(exchange_id, contact_id),
  CONSTRAINT participant_type_check CHECK (
    (user_id IS NOT NULL AND contact_id IS NULL) OR 
    (user_id IS NULL AND contact_id IS NOT NULL)
  )
);

-- Create indexes
CREATE INDEX idx_exchange_participants_exchange_id ON exchange_participants(exchange_id);
CREATE INDEX idx_exchange_participants_user_id ON exchange_participants(user_id);
CREATE INDEX idx_exchange_participants_contact_id ON exchange_participants(contact_id);`);
      console.log('```');
      
      return;
    }
    
    if (data && data.length > 0) {
      console.log('✅ Table exists with columns:');
      const columns = Object.keys(data[0]);
      columns.forEach(col => {
        console.log(`   • ${col}: ${typeof data[0][col]} (value: ${JSON.stringify(data[0][col])})`);
      });
    } else {
      console.log('✅ Table exists but is empty');
      
      // Try to get table structure from information_schema
      console.log('\n📋 Attempting to get column information...');
      
      // Create a simple test insert to see what columns exist
      const testParticipant = {
        exchange_id: 'ba7865ac-da20-404a-b609-804d15cb0467',
        user_id: '278304de-568f-4138-b35b-6fdcfbd2f1ce',
        role: 'admin',
        permissions: ['view', 'edit', 'delete', 'manage_participants', 'send_messages'],
        is_active: true
      };
      
      console.log('\n🧪 Attempting test insert with minimal fields...');
      const { data: inserted, error: insertError } = await supabaseService.client
        .from('exchange_participants')
        .insert(testParticipant)
        .select();
      
      if (insertError) {
        console.error('❌ Insert error:', insertError);
        console.log('\n⚠️ The error message tells us what columns are missing or incorrect');
      } else {
        console.log('✅ Test insert successful!');
        console.log('   Inserted data:', inserted);
        
        // Clean up
        if (inserted && inserted[0]) {
          await supabaseService.client
            .from('exchange_participants')
            .delete()
            .eq('id', inserted[0].id);
          console.log('🧹 Test data cleaned up');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkSchema().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});