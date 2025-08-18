const supabaseService = require('./services/supabase');

async function debugExchangeData() {
  try {
    console.log('🔍 Debugging exchange data structure...');
    
    // Get all exchanges to see their structure
    const { data: exchanges, error } = await supabaseService.client
      .from('exchanges')
      .select('id, name, client_id, coordinator_id')
      .limit(5);
    
    if (error) {
      console.error('Error fetching exchanges:', error);
      return;
    }
    
    console.log('\n📋 Found exchanges:');
    exchanges.forEach(ex => {
      console.log(`- ${ex.name} (ID: ${ex.id})`);
      console.log(`  Client ID: ${ex.client_id || 'None'}`);
      console.log(`  Coordinator ID: ${ex.coordinator_id || 'None'}`);
    });
    
    // Check what's in users table
    const { data: users, error: userError } = await supabaseService.client
      .from('users')
      .select('id, first_name, last_name, email, role')
      .limit(5);
      
    if (!userError && users) {
      console.log('\n👥 Sample users:');
      users.forEach(user => {
        console.log(`- ${user.first_name} ${user.last_name} (${user.role}) - ${user.email}`);
      });
    }
    
    // Check what's in contacts table
    const { data: contacts, error: contactError } = await supabaseService.client
      .from('contacts')
      .select('id, first_name, last_name, email, company')
      .limit(5);
      
    if (!contactError && contacts) {
      console.log('\n📞 Sample contacts:');
      contacts.forEach(contact => {
        console.log(`- ${contact.first_name} ${contact.last_name} (${contact.company || 'No company'}) - ${contact.email}`);
      });
    }
    
    // Try to get a specific exchange with full data
    if (exchanges.length > 0) {
      const exchangeId = exchanges[0].id;
      console.log(`\n🔍 Getting full data for exchange: ${exchanges[0].name}`);
      
      const fullExchange = await supabaseService.getExchangeById(exchangeId);
      console.log('Full exchange data:', {
        name: fullExchange.name,
        client: fullExchange.client,
        coordinator: fullExchange.coordinator,
        property_address: fullExchange.relinquished_property_address || fullExchange.property_address,
        sale_price: fullExchange.relinquished_sale_price || fullExchange.sale_price,
        closing_date: fullExchange.relinquished_closing_date || fullExchange.closing_date
      });
    }
    
  } catch (error) {
    console.error('Debug error:', error);
  }
}

debugExchangeData();