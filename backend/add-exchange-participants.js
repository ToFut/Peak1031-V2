require('dotenv').config();
const supabaseService = require('./services/supabase');
const { v4: uuidv4 } = require('uuid');

async function addExchangeParticipants() {
  try {
    console.log('🔧 Adding participants to SEGEV DEMO exchange...\n');
    
    const exchangeId = 'ba7865ac-da20-404a-b609-804d15cb0467';
    
    // First, get all @peak1031.com users
    const { data: users, error: usersError } = await supabaseService.client
      .from('users')
      .select('id, email, first_name, last_name, role')
      .like('email', '%@peak1031.com');
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
      return;
    }
    
    console.log(`📋 Found ${users.length} @peak1031.com users`);
    
    // Check existing participants
    const { data: existingParticipants, error: existingError } = await supabaseService.client
      .from('exchange_participants')
      .select('user_id')
      .eq('exchange_id', exchangeId);
    
    const existingUserIds = existingParticipants ? existingParticipants.map(p => p.user_id) : [];
    console.log(`📋 Exchange already has ${existingUserIds.length} participants`);
    
    // Add each user as a participant if not already added
    const participantsToAdd = [];
    
    for (const user of users) {
      if (!existingUserIds.includes(user.id)) {
        const participant = {
          id: uuidv4(),
          exchange_id: exchangeId,
          user_id: user.id,
          contact_id: null, // Users don't need contact_id
          role: user.role === 'admin' ? 'admin' : 
                user.role === 'coordinator' ? 'coordinator' : 
                'participant',
          permissions: user.role === 'admin' ? 
            ['view', 'edit', 'delete', 'manage_participants', 'send_messages'] :
            ['view', 'send_messages'],
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        participantsToAdd.push(participant);
        console.log(`   ➕ Will add: ${user.email} (${user.first_name} ${user.last_name}) as ${participant.role}`);
      } else {
        console.log(`   ✓ Already participant: ${user.email}`);
      }
    }
    
    if (participantsToAdd.length > 0) {
      console.log(`\n📝 Adding ${participantsToAdd.length} new participants...`);
      
      const { data: newParticipants, error: insertError } = await supabaseService.client
        .from('exchange_participants')
        .insert(participantsToAdd)
        .select();
      
      if (insertError) {
        console.error('❌ Error adding participants:', insertError);
        return;
      }
      
      console.log(`✅ Successfully added ${newParticipants.length} participants!`);
    } else {
      console.log('\n✅ All users are already participants');
    }
    
    // Also ensure the admin has the right permissions
    console.log('\n🔧 Ensuring admin has full permissions...');
    
    const adminUserId = '278304de-568f-4138-b35b-6fdcfbd2f1ce';
    const { data: adminParticipant, error: adminError } = await supabaseService.client
      .from('exchange_participants')
      .select('*')
      .eq('exchange_id', exchangeId)
      .eq('user_id', adminUserId)
      .single();
    
    if (adminParticipant) {
      // Update permissions to ensure full access
      const { error: updateError } = await supabaseService.client
        .from('exchange_participants')
        .update({
          role: 'admin',
          permissions: ['view', 'edit', 'delete', 'manage_participants', 'send_messages', 'full_access']
        })
        .eq('id', adminParticipant.id);
      
      if (updateError) {
        console.error('❌ Error updating admin permissions:', updateError);
      } else {
        console.log('✅ Admin permissions updated to full access');
      }
    }
    
    // List all final participants
    console.log('\n📋 Final participant list for SEGEV DEMO exchange:');
    const { data: finalParticipants, error: finalError } = await supabaseService.client
      .from('exchange_participants')
      .select(`
        *,
        users:user_id (email, first_name, last_name, role)
      `)
      .eq('exchange_id', exchangeId);
    
    if (finalParticipants) {
      finalParticipants.forEach(p => {
        if (p.users) {
          console.log(`   • ${p.users.email} - Role: ${p.role}, Permissions: ${p.permissions.join(', ')}`);
        }
      });
    }
    
    console.log('\n✅ All done! The chat should now work for all @peak1031.com users');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

addExchangeParticipants().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});