const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixPermissions() {
  try {
    console.log('🔧 Fixing permissions for exchange...');
    
    const exchangeId = 'ba7865ac-da20-404a-b609-804d15cb0467';
    
    // First, let's check if the is_active column exists
    console.log('📋 Checking exchange_participants table structure...');
    
    const { data: participants, error } = await supabase
      .from('exchange_participants')
      .select('*')
      .eq('exchange_id', exchangeId);
    
    if (error) {
      console.error('❌ Error fetching participants:', error);
      return;
    }
    
    console.log('✅ Found participants:', participants.length);
    
    // Update all participants to have is_active = true and proper permissions
    for (const participant of participants) {
      console.log(`📝 Updating participant: ${participant.id}`);
      
      const updateData = {
        is_active: true,
        permissions: [
          'can_view_messages',
          'can_send_messages', 
          'can_view_documents',
          'can_upload_documents',
          'can_view_tasks',
          'can_create_tasks',
          'can_edit_tasks',
          'can_delete_tasks'
        ]
      };
      
      const { error: updateError } = await supabase
        .from('exchange_participants')
        .update(updateData)
        .eq('id', participant.id);
      
      if (updateError) {
        console.error(`❌ Error updating participant ${participant.id}:`, updateError);
      } else {
        console.log(`✅ Updated participant ${participant.id}`);
      }
    }
    
    console.log('🎉 Permissions fix complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixPermissions();
