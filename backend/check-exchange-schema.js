const supabaseService = require('./services/supabase');

async function checkExchangeSchema() {
  try {
    console.log('🔍 Checking exchange table schema...');
    
    // Get the first exchange to see what fields are available
    const { data: exchanges, error } = await supabaseService.client
      .from('exchanges')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error fetching exchanges:', error);
      return;
    }
    
    if (exchanges && exchanges.length > 0) {
      const exchange = exchanges[0];
      console.log('\n📋 Available fields in exchanges table:');
      Object.keys(exchange).forEach(key => {
        const value = exchange[key];
        console.log(`- ${key}: ${value} (${typeof value})`);
      });
      
      console.log('\n🔍 Looking for property-related fields:');
      const propertyFields = Object.keys(exchange).filter(key => 
        key.includes('property') || 
        key.includes('address') || 
        key.includes('sale') || 
        key.includes('price') || 
        key.includes('closing')
      );
      
      propertyFields.forEach(field => {
        console.log(`- ${field}: ${exchange[field]}`);
      });
    }
    
  } catch (error) {
    console.error('Schema check error:', error);
  }
}

checkExchangeSchema();