const supabaseService = require('./services/supabase');
const agencyService = require('./services/agencyService');

async function testAgenciesAPI() {
  try {
    console.log('🔍 Testing agencies API...');
    
    // Check if agency service exists
    console.log('✅ Agency service loaded');
    
    // Check for agency contacts in database
    const { data: contacts, error: contactsError } = await supabaseService.client
      .from('contacts')
      .select('*')
      .contains('contact_type', ['agency']);
    
    if (contactsError) {
      console.error('❌ Error fetching agency contacts:', contactsError);
      return;
    }
    
    console.log(`📞 Found ${contacts?.length || 0} agency contacts in database`);
    
    if (contacts && contacts.length > 0) {
      console.log('Sample agency contact:', {
        id: contacts[0].id,
        display_name: contacts[0].display_name,
        email: contacts[0].email,
        contact_type: contacts[0].contact_type
      });
    } else {
      console.log('⚠️ No agency contacts found. Creating a sample agency contact...');
      
      // Create a sample agency contact
      const { data: newContact, error: createError } = await supabaseService.client
        .from('contacts')
        .insert({
          first_name: 'Demo',
          last_name: 'Agency',
          display_name: 'Demo Agency LLC',
          email: 'demo.agency@example.com',
          company: 'Demo Agency LLC',
          contact_type: ['agency'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Failed to create agency contact:', createError);
      } else {
        console.log('✅ Created sample agency contact:', newContact.id);
      }
    }
    
    // Test the agency service
    console.log('\n📊 Testing getAllAgencies service...');
    try {
      const result = await agencyService.getAllAgencies({
        page: 1,
        limit: 10,
        includeStats: false
      });
      
      console.log('✅ Agency service result:', {
        success: result.success,
        dataLength: result.data?.length || 0,
        pagination: result.pagination
      });
      
      if (result.data && result.data.length > 0) {
        console.log('Sample agency from service:', {
          id: result.data[0].id,
          display_name: result.data[0].display_name,
          email: result.data[0].email
        });
      }
      
    } catch (serviceError) {
      console.error('❌ Agency service error:', serviceError.message);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testAgenciesAPI();