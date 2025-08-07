const PPTokenManager = require('./services/ppTokenManager');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

async function quickPPSyncSample() {
  console.log('🚀 Quick PP Sync (Sample Data Only)...\n');
  
  const tokenManager = new PPTokenManager();
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  
  try {
    const token = await tokenManager.getValidAccessToken();
    console.log('✅ Token ready\n');
    
    // 1. Sync first 100 contacts
    console.log('📧 Syncing sample contacts...');
    const contactsRes = await axios.get('https://app.practicepanther.com/api/v2/contacts', {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      params: { limit: 100 }
    });
    
    const contacts = contactsRes.data?.slice(0, 100) || [];
    console.log(`  Found ${contacts.length} contacts`);
    
    if (contacts.length > 0) {
      const contactsToInsert = contacts.map(c => ({
        pp_id: c.id,
        first_name: c.first_name || c.display_name?.split(' ')[0],
        last_name: c.last_name || c.display_name?.split(' ').slice(1).join(' '),
        email: c.email,
        phone_mobile: c.phone_mobile,
        phone_home: c.phone_home,
        phone_work: c.phone_work,
        phone_fax: c.phone_fax,
        account_ref_id: c.account_ref?.id,
        account_ref_name: c.account_ref?.display_name,
        is_primary_contact: c.is_primary_contact || false,
        custom_field_values: c.custom_field_values,
        pp_synced_at: new Date().toISOString()
      }));
      
      const { error } = await supabase
        .from('contacts')
        .upsert(contactsToInsert, { onConflict: 'pp_id' });
      
      if (!error) console.log(`  ✅ Saved ${contacts.length} contacts`);
    }
    
    // 2. Sync first 50 tasks
    console.log('\n📋 Syncing sample tasks...');
    const tasksRes = await axios.get('https://app.practicepanther.com/api/v2/tasks', {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      params: { limit: 50, status: 'NotCompleted' }
    });
    
    const tasks = tasksRes.data?.slice(0, 50) || [];
    console.log(`  Found ${tasks.length} tasks`);
    
    if (tasks.length > 0) {
      const tasksToInsert = tasks.map(t => ({
        pp_id: t.id,
        title: t.subject,
        description: t.notes,
        status: t.status === 'Completed' ? 'completed' : 'pending',
        priority: (t.priority || 'normal').toLowerCase(),
        due_date: t.due_date,
        matter_ref_id: t.matter_ref?.id,
        matter_ref_name: t.matter_ref?.display_name,
        assigned_to_users: t.assigned_to_users,
        assigned_to_contacts: t.assigned_to_contacts,
        tags: t.tags,
        pp_synced_at: new Date().toISOString()
      }));
      
      const { error } = await supabase
        .from('tasks')
        .upsert(tasksToInsert, { onConflict: 'pp_id' });
      
      if (!error) console.log(`  ✅ Saved ${tasks.length} tasks`);
    }
    
    // 3. Sync first 50 invoices
    console.log('\n💰 Syncing sample invoices...');
    const invoicesRes = await axios.get('https://app.practicepanther.com/api/v2/invoices', {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      params: { limit: 50 }
    });
    
    const invoices = invoicesRes.data?.slice(0, 50) || [];
    console.log(`  Found ${invoices.length} invoices`);
    
    if (invoices.length > 0) {
      const invoicesToInsert = invoices.map(i => ({
        pp_id: i.id,
        invoice_number: i.id,
        issue_date: i.issue_date?.split('T')[0],
        due_date: i.due_date?.split('T')[0],
        status: i.total_outstanding === 0 ? 'paid' : i.total_paid > 0 ? 'partial' : 'unpaid',
        invoice_type: i.invoice_type,
        subtotal: (i.subtotal || 0) / 100,
        tax: (i.tax || 0) / 100,
        discount: (i.discount || 0) / 100,
        total: (i.total || 0) / 100,
        total_paid: (i.total_paid || 0) / 100,
        total_outstanding: (i.total_outstanding || 0) / 100,
        items_time_entries: i.items_time_entries,
        items_expenses: i.items_expenses,
        items_flat_fees: i.items_flat_fees,
        pp_account_ref_id: i.account_ref?.id,
        pp_matter_ref_id: i.matter_ref?.id,
        pp_synced_at: new Date().toISOString()
      }));
      
      const { error } = await supabase
        .from('invoices')
        .upsert(invoicesToInsert, { onConflict: 'pp_id' });
      
      if (!error) console.log(`  ✅ Saved ${invoices.length} invoices`);
    }
    
    // 4. Sync first 25 expenses
    console.log('\n💵 Syncing sample expenses...');
    const expensesRes = await axios.get('https://app.practicepanther.com/api/v2/expenses', {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      params: { limit: 25 }
    });
    
    const expenses = expensesRes.data?.slice(0, 25) || [];
    console.log(`  Found ${expenses.length} expenses`);
    
    if (expenses.length > 0) {
      const expensesToInsert = expenses.map(e => ({
        pp_id: e.id,
        description: e.description,
        expense_date: e.date?.split('T')[0],
        quantity: e.qty || 1,
        price: (e.price || 0) / 100,
        amount: (e.amount || 0) / 100,
        is_billable: e.is_billable || false,
        is_billed: e.is_billed || false,
        private_notes: e.private_notes,
        pp_matter_ref_id: e.matter_ref?.id,
        pp_account_ref_id: e.account_ref?.id,
        pp_synced_at: new Date().toISOString()
      }));
      
      const { error } = await supabase
        .from('expenses')
        .upsert(expensesToInsert, { onConflict: 'pp_id' });
      
      if (!error) console.log(`  ✅ Saved ${expenses.length} expenses`);
    }
    
    // 5. Update users with PP data
    console.log('\n👥 Updating users with PP data...');
    const usersRes = await axios.get('https://app.practicepanther.com/api/v2/users', {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      params: { limit: 10 }
    });
    
    const ppUsers = usersRes.data || [];
    console.log(`  Found ${ppUsers.length} PP users`);
    
    let updatedCount = 0;
    for (const ppUser of ppUsers) {
      if (!ppUser.email) continue;
      
      const { error } = await supabase
        .from('users')
        .update({
          pp_user_id: ppUser.id,
          pp_display_name: ppUser.display_name,
          pp_is_active: ppUser.is_active,
          pp_synced_at: new Date().toISOString()
        })
        .ilike('email', ppUser.email);
      
      if (!error) updatedCount++;
    }
    console.log(`  ✅ Updated ${updatedCount} users`);
    
    // Show summary
    console.log('\n📊 Database Summary:');
    
    const { count: contactCount } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .not('pp_id', 'is', null);
    
    const { count: taskCount } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .not('pp_id', 'is', null);
    
    const { count: invoiceCount } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true });
    
    const { count: expenseCount } = await supabase
      .from('expenses')
      .select('*', { count: 'exact', head: true });
    
    console.log(`  • Contacts with PP data: ${contactCount}`);
    console.log(`  • Tasks with PP data: ${taskCount}`);
    console.log(`  • Invoices: ${invoiceCount}`);
    console.log(`  • Expenses: ${expenseCount}`);
    
    // Show sample data
    console.log('\n📌 Sample Data Preview:');
    
    const { data: sampleContact } = await supabase
      .from('contacts')
      .select('first_name, last_name, email, phone_mobile, phone_work')
      .not('pp_id', 'is', null)
      .limit(1)
      .single();
    
    if (sampleContact) {
      console.log('\nSample Contact:');
      console.log(`  Name: ${sampleContact.first_name} ${sampleContact.last_name}`);
      console.log(`  Email: ${sampleContact.email}`);
      console.log(`  Mobile: ${sampleContact.phone_mobile || 'N/A'}`);
      console.log(`  Work: ${sampleContact.phone_work || 'N/A'}`);
    }
    
    const { data: sampleInvoice } = await supabase
      .from('invoices')
      .select('invoice_number, total, total_outstanding, status')
      .limit(1)
      .single();
    
    if (sampleInvoice) {
      console.log('\nSample Invoice:');
      console.log(`  Number: ${sampleInvoice.invoice_number}`);
      console.log(`  Total: $${sampleInvoice.total}`);
      console.log(`  Outstanding: $${sampleInvoice.total_outstanding}`);
      console.log(`  Status: ${sampleInvoice.status}`);
    }
    
    console.log('\n✅ Quick sync completed! Your database now has PP data in MAIN tables');
    
  } catch (error) {
    console.error('❌ Sync error:', error.message);
  }
}

quickPPSyncSample();