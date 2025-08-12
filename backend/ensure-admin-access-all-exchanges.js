const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function ensureAdminAccessAllExchanges() {
  console.log('🔧 Ensuring admin has access to all exchanges...\n');
  
  const adminUserId = '278304de-568f-4138-b35b-6fdcfbd2f1ce';
  
  // 1. Get admin's contact record
  const { data: adminContact } = await supabase
    .from('contacts')
    .select('*')
    .eq('user_id', adminUserId)
    .single();
    
  if (!adminContact) {
    console.log('❌ Admin does not have a contact record! Creating one...');
    
    // Get admin user details
    const { data: adminUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', adminUserId)
      .single();
      
    if (!adminUser) {
      console.error('Admin user not found!');
      return;
    }
    
    // Create contact for admin
    const { data: newContact, error: createError } = await supabase
      .from('contacts')
      .insert({
        first_name: adminUser.first_name || 'Admin',
        last_name: adminUser.last_name || 'User',
        email: adminUser.email,
        phone: adminUser.phone || '',
        user_id: adminUserId,
        is_active: true,
        contact_type: 'USER'
      })
      .select()
      .single();
      
    if (createError) {
      console.error('Error creating admin contact:', createError);
      return;
    }
    
    console.log('✅ Created admin contact:', newContact.id);
    adminContact = newContact;
  } else {
    console.log('✅ Admin has contact record:', adminContact.id);
  }
  
  // 2. Get all active exchanges
  const { data: exchanges, count } = await supabase
    .from('exchanges')
    .select('id, name, coordinator_id', { count: 'exact' })
    .eq('is_active', true);
    
  console.log(`\nFound ${count} active exchanges`);
  
  // 3. For each exchange, ensure admin is either coordinator or participant
  let updatedCount = 0;
  let addedAsParticipant = 0;
  
  for (const exchange of exchanges || []) {
    // Check if admin is already coordinator
    if (exchange.coordinator_id !== adminUserId) {
      // For now, we won't change existing coordinators
      // Instead, add admin as a participant
      
      // Check if admin is already a participant
      const { data: existing } = await supabase
        .from('exchange_participants')
        .select('*')
        .eq('exchange_id', exchange.id)
        .eq('contact_id', adminContact.id)
        .single();
        
      if (!existing) {
        // Add admin as participant
        const { error: addError } = await supabase
          .from('exchange_participants')
          .insert({
            exchange_id: exchange.id,
            contact_id: adminContact.id,
            role: 'admin',
            permissions: JSON.stringify({
              view: true,
              edit: true,
              upload: true,
              message: true,
              manage: true
            }),
            assigned_by: adminUserId,
            is_active: true
          });
          
        if (addError) {
          console.error(`Error adding admin to exchange ${exchange.name}:`, addError.message);
        } else {
          addedAsParticipant++;
          console.log(`✅ Added admin as participant to: ${exchange.name}`);
        }
      }
    } else {
      updatedCount++;
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`- Admin is coordinator for ${updatedCount} exchanges`);
  console.log(`- Added admin as participant to ${addedAsParticipant} exchanges`);
  console.log(`- Total exchanges admin can access: ${count}`);
  
  // 4. Verify SEGEV DEMO specifically
  console.log('\n🔍 Checking SEGEV DEMO exchange specifically...');
  const { data: segevExchange } = await supabase
    .from('exchanges')
    .select(`
      *,
      exchange_participants (
        *
      )
    `)
    .eq('id', 'ba7865ac-da20-404a-b609-804d15cb0467')
    .single();
    
  if (segevExchange) {
    console.log('SEGEV DEMO status:');
    console.log('- Coordinator:', segevExchange.coordinator_id === adminUserId ? '✅ Admin' : '❌ Not admin');
    
    const adminParticipant = segevExchange.exchange_participants?.find(p => p.contact_id === adminContact.id);
    console.log('- Participant:', adminParticipant ? '✅ Yes' : '❌ No');
    
    if (!adminParticipant && segevExchange.coordinator_id !== adminUserId) {
      // Add admin as participant to SEGEV DEMO
      const { error } = await supabase
        .from('exchange_participants')
        .insert({
          exchange_id: segevExchange.id,
          contact_id: adminContact.id,
          role: 'admin',
          permissions: JSON.stringify({
            view: true,
            edit: true,
            upload: true,
            message: true,
            manage: true
          }),
          assigned_by: adminUserId,
          is_active: true
        });
        
      if (error) {
        console.error('Error adding admin to SEGEV DEMO:', error);
      } else {
        console.log('✅ Added admin as participant to SEGEV DEMO');
      }
    }
  }
}

ensureAdminAccessAllExchanges();