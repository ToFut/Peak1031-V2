require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function cleanMockData() {
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    
    console.log('🧹 CLEANING MOCK DATA - KEEPING ONLY REAL PP DATA\n');
    
    // First, let's see what we have
    console.log('📊 BEFORE CLEANUP:');
    const { data: beforeContacts } = await supabase.from('contacts').select('id, pp_contact_id, first_name, last_name');
    const { data: beforeExchanges } = await supabase.from('exchanges').select('id, pp_matter_id, name');
    const { data: beforeTasks } = await supabase.from('tasks').select('id, pp_task_id, title');
    const { data: beforeUsers } = await supabase.from('users').select('id, email, role');
    const { data: beforeOrgs } = await supabase.from('organizations').select('id, name, type');
    
    console.log('- Contacts:', beforeContacts.length);
    console.log('- Exchanges:', beforeExchanges.length);
    console.log('- Tasks:', beforeTasks.length);
    console.log('- Users:', beforeUsers.length);
    console.log('- Organizations:', beforeOrgs.length);
    
    // Delete mock/sample contacts (those without pp_contact_id)
    console.log('\n🗑️  Deleting mock contacts...');
    const { data: deletedContacts } = await supabase
      .from('contacts')
      .delete()
      .is('pp_contact_id', null);
    console.log('✅ Mock contacts deleted');
    
    // Delete mock/sample exchanges (those without pp_matter_id)
    console.log('\n🗑️  Deleting mock exchanges...');
    const { data: deletedExchanges } = await supabase
      .from('exchanges')
      .delete()
      .is('pp_matter_id', null);
    console.log('✅ Mock exchanges deleted');
    
    // Delete mock/sample tasks (those without pp_task_id)
    console.log('\n🗑️  Deleting mock tasks...');
    const { data: deletedTasks } = await supabase
      .from('tasks')
      .delete()
      .is('pp_task_id', null);
    console.log('✅ Mock tasks deleted');
    
    // Keep users and organizations as they're needed for login/access
    console.log('\n✅ KEEPING users and organizations (needed for access)');
    
    // Also clean up related data
    console.log('\n🗑️  Cleaning related data...');
    
    // Delete messages not associated with PP exchanges
    const { data: ppExchangeIds } = await supabase
      .from('exchanges')
      .select('id')
      .not('pp_matter_id', 'is', null);
    
    if (ppExchangeIds.length > 0) {
      const ppExchangeIdList = ppExchangeIds.map(e => e.id);
      await supabase
        .from('messages')
        .delete()
        .not('exchange_id', 'in', `(${ppExchangeIdList.map(id => `'${id}'`).join(',')})`);
      console.log('✅ Non-PP messages deleted');
    } else {
      // If no PP exchanges, delete all messages
      await supabase.from('messages').delete().neq('id', 'impossible-id');
      console.log('✅ All messages deleted (no PP exchanges)');
    }
    
    // Delete documents not associated with PP exchanges
    if (ppExchangeIds.length > 0) {
      const ppExchangeIdList = ppExchangeIds.map(e => e.id);
      await supabase
        .from('documents')
        .delete()
        .not('exchange_id', 'in', `(${ppExchangeIdList.map(id => `'${id}'`).join(',')})`);
      console.log('✅ Non-PP documents deleted');
    } else {
      await supabase.from('documents').delete().neq('id', 'impossible-id');
      console.log('✅ All documents deleted (no PP exchanges)');
    }
    
    // Final status
    console.log('\n📊 AFTER CLEANUP:');
    const { data: afterContacts } = await supabase.from('contacts').select('id, pp_contact_id, first_name, last_name');
    const { data: afterExchanges } = await supabase.from('exchanges').select('id, pp_matter_id, name');
    const { data: afterTasks } = await supabase.from('tasks').select('id, pp_task_id, title');
    const { data: afterMessages } = await supabase.from('messages').select('id');
    const { data: afterDocuments } = await supabase.from('documents').select('id');
    
    console.log('- Contacts (PP only):', afterContacts.length);
    console.log('- Exchanges (PP only):', afterExchanges.length);
    console.log('- Tasks (PP only):', afterTasks.length);
    console.log('- Messages (PP-related only):', afterMessages.length);
    console.log('- Documents (PP-related only):', afterDocuments.length);
    console.log('- Users (kept):', beforeUsers.length);
    console.log('- Organizations (kept):', beforeOrgs.length);
    
    console.log('\n🎉 CLEANUP COMPLETE!');
    console.log('✅ Database now contains ONLY real Practice Partner data');
    console.log('✅ Users and organizations preserved for access control');
    
    // Show remaining PP data
    if (afterContacts.length > 0) {
      console.log('\n👥 Remaining PP Contacts:');
      afterContacts.forEach((contact, i) => {
        console.log(`${i+1}. ${contact.first_name} ${contact.last_name} (PP ID: ${contact.pp_contact_id})`);
      });
    }
    
    if (afterExchanges.length > 0) {
      console.log('\n📄 Remaining PP Exchanges:');
      afterExchanges.forEach((exchange, i) => {
        console.log(`${i+1}. ${exchange.name || 'Unnamed'} (PP ID: ${exchange.pp_matter_id})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

cleanMockData();