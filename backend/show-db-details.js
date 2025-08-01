require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function showDatabaseDetails() {
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    
    console.log('🔍 DETAILED DATABASE STRUCTURE\n');
    
    // CONTACTS DETAILS
    console.log('👥 CONTACTS TABLE:');
    const { data: contacts } = await supabase.from('contacts').select('*').limit(3);
    if (contacts.length > 0) {
      console.log('Sample contact structure:');
      console.log(JSON.stringify(contacts[0], null, 2));
      console.log('\nAll contacts:');
      contacts.forEach((contact, i) => {
        console.log(`${i+1}. ${contact.first_name} ${contact.last_name}`);
        console.log(`   Email: ${contact.email || 'none'}`);
        console.log(`   Phone: ${contact.phone || 'none'}`);
        console.log(`   Company: ${contact.company || 'none'}`);
        console.log(`   PP ID: ${contact.pp_contact_id || 'none'}`);
        console.log('');
      });
    }
    
    console.log('\n📄 EXCHANGES TABLE:');
    const { data: exchanges } = await supabase.from('exchanges').select('*').limit(3);
    if (exchanges.length > 0) {
      console.log('Sample exchange structure:');
      console.log(JSON.stringify(exchanges[0], null, 2));
      console.log('\nAll exchanges:');
      exchanges.forEach((exchange, i) => {
        console.log(`${i+1}. ${exchange.title}`);
        console.log(`   Status: ${exchange.status}`);
        console.log(`   Description: ${exchange.description || 'none'}`);
        console.log(`   PP Matter ID: ${exchange.pp_matter_id || 'none'}`);
        console.log(`   Created: ${exchange.created_at}`);
        console.log('');
      });
    }
    
    console.log('\n✅ TASKS TABLE:');
    const { data: tasks } = await supabase.from('tasks').select('*').limit(5);
    if (tasks.length > 0) {
      console.log('Sample task structure:');
      console.log(JSON.stringify(tasks[0], null, 2));
      console.log('\nAll tasks:');
      tasks.forEach((task, i) => {
        console.log(`${i+1}. ${task.title}`);
        console.log(`   Status: ${task.status}`);
        console.log(`   Priority: ${task.priority || 'none'}`);
        console.log(`   Assigned to: ${task.assigned_to || 'none'}`);
        console.log(`   Due: ${task.due_date || 'none'}`);
        console.log('');
      });
    }
    
    console.log('\n👤 USERS TABLE:');
    const { data: users } = await supabase.from('users').select('*').limit(3);
    if (users && users.length > 0) {
      console.log('Sample user structure:');
      console.log(JSON.stringify(users[0], null, 2));
      console.log('\nAll users:');
      users.forEach((user, i) => {
        console.log(`${i+1}. ${user.first_name} ${user.last_name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Organization: ${user.organization_id || 'none'}`);
        console.log('');
      });
    } else {
      console.log('No users found or table empty');
    }
    
    console.log('\n🏢 ORGANIZATIONS TABLE:');
    const { data: organizations } = await supabase.from('organizations').select('*').limit(3);
    if (organizations && organizations.length > 0) {
      console.log('Sample organization structure:');
      console.log(JSON.stringify(organizations[0], null, 2));
      console.log('\nAll organizations:');
      organizations.forEach((org, i) => {
        console.log(`${i+1}. ${org.name}`);
        console.log(`   Type: ${org.type || 'none'}`);
        console.log(`   Status: ${org.status || 'none'}`);
        console.log('');
      });
    } else {
      console.log('No organizations found or table empty');
    }
    
    console.log('\n💬 MESSAGES TABLE:');
    const { data: messages } = await supabase.from('messages').select('*').limit(3);
    if (messages && messages.length > 0) {
      console.log('Sample message structure:');
      console.log(JSON.stringify(messages[0], null, 2));
      console.log('\nRecent messages:');
      messages.forEach((msg, i) => {
        console.log(`${i+1}. From: ${msg.sender_id || 'unknown'}`);
        console.log(`   Content: ${msg.content ? msg.content.substring(0, 50) + '...' : 'none'}`);
        console.log(`   Exchange: ${msg.exchange_id || 'none'}`);
        console.log(`   Created: ${msg.created_at}`);
        console.log('');
      });
    } else {
      console.log('No messages found or table empty');
    }
    
    console.log('\n📋 DOCUMENTS TABLE:');
    const { data: documents } = await supabase.from('documents').select('*').limit(3);
    if (documents && documents.length > 0) {
      console.log('Sample document structure:');
      console.log(JSON.stringify(documents[0], null, 2));
      console.log('\nAll documents:');
      documents.forEach((doc, i) => {
        console.log(`${i+1}. ${doc.title || doc.name}`);
        console.log(`   Type: ${doc.type || 'none'}`);
        console.log(`   Size: ${doc.size || 'unknown'}`);
        console.log(`   Exchange: ${doc.exchange_id || 'none'}`);
        console.log('');
      });
    } else {
      console.log('No documents found or table empty');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

showDatabaseDetails();