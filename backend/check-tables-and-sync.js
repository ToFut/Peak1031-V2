const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkTablesAndSync() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  console.log('🔍 Checking table structure...\n');

  // Check if contacts table has PP fields
  try {
    const { data: contactSample, error } = await supabase
      .from('contacts')
      .insert({
        first_name: 'Test',
        last_name: 'PPSync',
        email: 'test-pp-sync@example.com',
        pp_id: 'test-' + Date.now(),
        phone_mobile: '555-1234',
        phone_work: '555-5678',
        pp_synced_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.log('❌ Error inserting contact:', error.message);
      console.log('This might mean PP fields don\'t exist in contacts table');
    } else {
      console.log('✅ Contact inserted successfully with PP fields');
      console.log('  ID:', contactSample.id);
      console.log('  PP ID:', contactSample.pp_id);
      console.log('  Mobile:', contactSample.phone_mobile);
      
      // Clean up test record
      await supabase.from('contacts').delete().eq('id', contactSample.id);
    }
  } catch (e) {
    console.error('Error:', e);
  }

  // Check invoices table
  try {
    const { data: invoiceTest, error } = await supabase
      .from('invoices')
      .insert({
        pp_id: 'test-inv-' + Date.now(),
        invoice_number: 'TEST-001',
        total: 100.00,
        status: 'unpaid',
        pp_synced_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.log('\n❌ Error inserting invoice:', error.message);
      console.log('Invoices table might not exist');
    } else {
      console.log('\n✅ Invoice inserted successfully');
      console.log('  ID:', invoiceTest.id);
      console.log('  PP ID:', invoiceTest.pp_id);
      
      // Clean up
      await supabase.from('invoices').delete().eq('id', invoiceTest.id);
    }
  } catch (e) {
    console.error('Error:', e);
  }

  // Check expenses table
  try {
    const { data: expenseTest, error } = await supabase
      .from('expenses')
      .insert({
        pp_id: 'test-exp-' + Date.now(),
        description: 'Test Expense',
        amount: 50.00,
        pp_synced_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.log('\n❌ Error inserting expense:', error.message);
      console.log('Expenses table might not exist');
    } else {
      console.log('\n✅ Expense inserted successfully');
      console.log('  ID:', expenseTest.id);
      
      // Clean up
      await supabase.from('expenses').delete().eq('id', expenseTest.id);
    }
  } catch (e) {
    console.error('Error:', e);
  }

  // Check existing data counts
  console.log('\n📊 Current data counts:');
  
  const { count: contactCount } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true });
  
  const { count: taskCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true });
  
  const { count: invoiceCount } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true });
  
  const { count: expenseCount } = await supabase
    .from('expenses')
    .select('*', { count: 'exact', head: true });

  console.log('  • Total contacts:', contactCount);
  console.log('  • Total tasks:', taskCount);
  console.log('  • Total invoices:', invoiceCount);
  console.log('  • Total expenses:', expenseCount);

  console.log('\n📌 Summary:');
  if (contactCount === null || contactCount === 0) {
    console.log('⚠️ Tables exist but might not have the PP fields added');
    console.log('Run the migration to add PP fields to existing tables');
  } else {
    console.log('✅ Tables are ready for PP data sync');
  }
}

checkTablesAndSync();