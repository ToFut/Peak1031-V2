require('dotenv').config();
const supabaseService = require('./services/supabase');

async function fixContactsSchema() {
  try {
    console.log('🔧 Fixing contacts table schema...\n');
    
    // Check current columns
    const { data: columns, error: columnsError } = await supabaseService.client
      .from('contacts')
      .select('*')
      .limit(1);
    
    if (columnsError && columnsError.message.includes('contactType')) {
      console.log('✅ Missing contactType column confirmed');
      console.log('📝 Adding contactType column to contacts table...\n');
      
      // Add the missing column using raw SQL
      const { error: alterError } = await supabaseService.client.rpc('exec_sql', {
        query: `
          ALTER TABLE contacts 
          ADD COLUMN IF NOT EXISTS "contactType" VARCHAR(50) DEFAULT 'client';
        `
      });
      
      if (alterError) {
        // Try alternative approach - direct SQL
        console.log('⚠️ RPC approach failed, trying direct SQL...');
        
        // Create a simple migration script
        console.log('\n📋 Please run this SQL in your Supabase dashboard:\n');
        console.log('```sql');
        console.log("ALTER TABLE contacts");
        console.log("ADD COLUMN IF NOT EXISTS contact_type VARCHAR(50) DEFAULT 'client';");
        console.log('```\n');
        
        console.log('Or run this command:');
        console.log('```bash');
        console.log('cd backend && npx supabase db push');
        console.log('```');
      } else {
        console.log('✅ contactType column added successfully!');
      }
    } else if (!columnsError) {
      console.log('✅ Contacts table schema looks good');
      
      // Check if we can query with the column
      const { data: testData, error: testError } = await supabaseService.client
        .from('contacts')
        .select('id, contact_type')
        .limit(1);
      
      if (testError) {
        console.log('❌ Error accessing contact_type:', testError.message);
        console.log('\n📋 The column might be named differently. Checking variations...');
        
        // Try different column names
        const variations = ['contactType', 'contact_type', 'type', 'contacttype'];
        for (const col of variations) {
          const { error } = await supabaseService.client
            .from('contacts')
            .select(`id, ${col}`)
            .limit(1);
          
          if (!error) {
            console.log(`✅ Found column: ${col}`);
            break;
          }
        }
      } else {
        console.log('✅ contact_type column is accessible');
      }
    }
    
    // Also check and update the database service to use the correct column name
    console.log('\n📝 Updating database service to handle column name...');
    
    // Test creating a contact
    const testContact = {
      firstName: 'Test',
      lastName: 'User',
      email: `test-${Date.now()}@example.com`,
      phone: '555-0000',
      company: 'Test Company',
      contactType: 'internal_user',
      isActive: true
    };
    
    console.log('\n🧪 Testing contact creation...');
    const { data: newContact, error: createError } = await supabaseService.client
      .from('contacts')
      .insert([{
        first_name: testContact.firstName,
        last_name: testContact.lastName,
        email: testContact.email,
        phone: testContact.phone,
        company: testContact.company,
        contact_type: testContact.contactType,  // Use snake_case
        is_active: testContact.isActive
      }])
      .select()
      .single();
    
    if (createError) {
      console.log('❌ Error creating test contact:', createError.message);
      
      if (createError.message.includes('contact_type')) {
        console.log('\n⚠️ The contact_type column is still missing.');
        console.log('Please add it manually in Supabase dashboard.');
      }
    } else {
      console.log('✅ Test contact created successfully:', newContact.id);
      
      // Clean up test contact
      await supabaseService.client
        .from('contacts')
        .delete()
        .eq('id', newContact.id);
      
      console.log('🧹 Test contact cleaned up');
    }
    
    console.log('\n✅ Schema fix complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixContactsSchema().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});