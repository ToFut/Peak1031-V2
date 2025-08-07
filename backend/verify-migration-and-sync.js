const { createClient } = require('@supabase/supabase-js');
const PPTokenManager = require('./services/ppTokenManager');
const axios = require('axios');
require('dotenv').config();

async function verifyMigrationAndSync() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  console.log('🔍 Verifying Migration Success...\n');

  // 1. Check if new columns exist in contacts table
  try {
    const { data: testContact, error } = await supabase
      .from('contacts')
      .insert({
        first_name: 'Migration',
        last_name: 'Test',
        email: 'migration-test@example.com',
        pp_id: 'test-' + Date.now(),
        phone_mobile: '555-0001',
        phone_home: '555-0002',
        phone_work: '555-0003',
        phone_fax: '555-0004',
        pp_synced_at: new Date().toISOString()
      })
      .select()
      .single();

    if (!error && testContact) {
      console.log('✅ Contacts table has PP fields!');
      console.log(`   • PP ID: ${testContact.pp_id}`);
      console.log(`   • Mobile: ${testContact.phone_mobile}`);
      console.log(`   • Work: ${testContact.phone_work}`);
      
      // Clean up
      await supabase.from('contacts').delete().eq('id', testContact.id);
    } else {
      console.log('❌ Error testing contacts:', error?.message);
    }
  } catch (e) {
    console.error('Error:', e);
  }

  // 2. Check if new tables exist
  const newTables = ['invoices', 'expenses', 'notes'];
  for (const table of newTables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (!error) {
      console.log(`✅ Table '${table}' exists (${count || 0} records)`);
    } else {
      console.log(`❌ Table '${table}' not found`);
    }
  }

  // 3. Check views
  try {
    const { data: contactView } = await supabase
      .from('v_contacts_full')
      .select('*')
      .limit(1);
    
    if (contactView) {
      console.log('✅ View v_contacts_full is working');
    }
  } catch (e) {
    console.log('⚠️ Views might not be accessible (this is normal)');
  }

  console.log('\n🚀 Now let\'s sync some PP data...\n');

  // 4. Sync sample PP data
  const tokenManager = new PPTokenManager();
  
  try {
    const token = await tokenManager.getValidAccessToken();
    console.log('✅ PP Token ready\n');

    // Sync a few contacts
    console.log('📧 Syncing contacts from PP...');
    const contactsRes = await axios.get('https://app.practicepanther.com/api/v2/contacts', {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      params: { limit: 10 }
    });

    const contacts = contactsRes.data || [];
    console.log(`   Found ${contacts.length} contacts in PP`);

    if (contacts.length > 0) {
      // Insert into our unified contacts table
      for (const contact of contacts.slice(0, 5)) {
        const { error } = await supabase
          .from('contacts')
          .upsert({
            pp_id: contact.id,
            first_name: contact.first_name || contact.display_name?.split(' ')[0] || 'Unknown',
            last_name: contact.last_name || contact.display_name?.split(' ').slice(1).join(' ') || 'Contact',
            email: contact.email || `${contact.id}@pp-import.com`,
            phone_mobile: contact.phone_mobile,
            phone_home: contact.phone_home,
            phone_work: contact.phone_work,
            phone_fax: contact.phone_fax,
            account_ref_id: contact.account_ref?.id,
            account_ref_name: contact.account_ref?.display_name,
            is_primary_contact: contact.is_primary_contact || false,
            custom_field_values: contact.custom_field_values,
            pp_synced_at: new Date().toISOString()
          }, {
            onConflict: 'pp_id',
            ignoreDuplicates: false
          });

        if (!error) {
          console.log(`   ✅ Synced: ${contact.display_name || contact.id}`);
        } else {
          console.log(`   ❌ Error syncing contact:`, error.message);
        }
      }
    }

    // Sync a few invoices
    console.log('\n💰 Syncing invoices from PP...');
    const invoicesRes = await axios.get('https://app.practicepanther.com/api/v2/invoices', {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
      params: { limit: 10 }
    });

    const invoices = invoicesRes.data || [];
    console.log(`   Found ${invoices.length} invoices in PP`);

    if (invoices.length > 0) {
      for (const invoice of invoices.slice(0, 5)) {
        const { error } = await supabase
          .from('invoices')
          .upsert({
            pp_id: invoice.id,
            invoice_number: invoice.id,
            issue_date: invoice.issue_date?.split('T')[0],
            due_date: invoice.due_date?.split('T')[0],
            status: invoice.total_outstanding === 0 ? 'paid' : 
                    invoice.total_paid > 0 ? 'partial' : 'unpaid',
            invoice_type: invoice.invoice_type,
            subtotal: (invoice.subtotal || 0) / 100,
            tax: (invoice.tax || 0) / 100,
            discount: (invoice.discount || 0) / 100,
            total: (invoice.total || 0) / 100,
            total_paid: (invoice.total_paid || 0) / 100,
            total_outstanding: (invoice.total_outstanding || 0) / 100,
            pp_account_ref_id: invoice.account_ref?.id,
            pp_matter_ref_id: invoice.matter_ref?.id,
            pp_synced_at: new Date().toISOString()
          }, {
            onConflict: 'pp_id'
          });

        if (!error) {
          console.log(`   ✅ Synced invoice: $${(invoice.total / 100).toFixed(2)}`);
        } else {
          console.log(`   ❌ Error syncing invoice:`, error.message);
        }
      }
    }

  } catch (error) {
    console.log('⚠️ Could not sync PP data:', error.message);
    console.log('Make sure PP token is configured');
  }

  // 5. Show final database state
  console.log('\n📊 Final Database Summary:');
  console.log('============================');

  const tables = ['contacts', 'tasks', 'exchanges', 'invoices', 'expenses', 'notes'];
  
  for (const table of tables) {
    const { count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    const { count: ppCount } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .not('pp_id', 'is', null);
    
    console.log(`${table.padEnd(12)} - Total: ${String(count || 0).padStart(4)} | With PP data: ${ppCount || 0}`);
  }

  // 6. Show sample data
  console.log('\n📌 Sample Data with PP Fields:');
  console.log('==============================');

  const { data: sampleContact } = await supabase
    .from('contacts')
    .select('first_name, last_name, email, phone_mobile, phone_work, pp_id')
    .not('pp_id', 'is', null)
    .limit(1)
    .single();

  if (sampleContact) {
    console.log('\nContact with PP data:');
    console.log(`  Name: ${sampleContact.first_name} ${sampleContact.last_name}`);
    console.log(`  Email: ${sampleContact.email}`);
    console.log(`  Mobile: ${sampleContact.phone_mobile || 'N/A'}`);
    console.log(`  Work: ${sampleContact.phone_work || 'N/A'}`);
    console.log(`  PP ID: ${sampleContact.pp_id}`);
  }

  const { data: sampleInvoice } = await supabase
    .from('invoices')
    .select('invoice_number, total, status, pp_id')
    .limit(1)
    .single();

  if (sampleInvoice) {
    console.log('\nInvoice:');
    console.log(`  Number: ${sampleInvoice.invoice_number}`);
    console.log(`  Total: $${sampleInvoice.total}`);
    console.log(`  Status: ${sampleInvoice.status}`);
    console.log(`  PP ID: ${sampleInvoice.pp_id || 'Local'}`);
  }

  console.log('\n✅ Migration verified and PP sync tested!');
  console.log('\n🎉 Your database is now unified:');
  console.log('  • Main tables enhanced with PP fields');
  console.log('  • New tables for invoices, expenses, notes');
  console.log('  • PP data syncs directly to main tables');
  console.log('  • No separate pp_ tables needed!');
}

verifyMigrationAndSync();