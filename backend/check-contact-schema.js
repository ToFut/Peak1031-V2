const supabaseService = require('./services/supabase');

async function checkContactSchema() {
  try {
    console.log('🔍 Checking contact schema and data...');
    
    // Get a few sample contacts to see the structure
    const { data: contacts, error } = await supabaseService.client
      .from('contacts')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('❌ Error fetching contacts:', error);
      return;
    }
    
    console.log(`📞 Found ${contacts?.length || 0} contacts`);
    
    if (contacts && contacts.length > 0) {
      console.log('\nSample contact structure:');
      const sample = contacts[0];
      Object.keys(sample).forEach(key => {
        console.log(`  ${key}: ${typeof sample[key]} = ${JSON.stringify(sample[key])}`);
      });
      
      // Check contact_type values
      console.log('\nContact types found:');
      contacts.forEach((contact, i) => {
        console.log(`  Contact ${i + 1}: contact_type = ${JSON.stringify(contact.contact_type)} (${typeof contact.contact_type})`);
      });
    }
    
    // Try to find any agency-related contacts
    console.log('\n🔍 Searching for agency-related contacts...');
    
    // Try different query approaches
    const queries = [
      { name: 'like agency', query: () => supabaseService.client.from('contacts').select('*').ilike('contact_type', '%agency%') },
      { name: 'equals agency', query: () => supabaseService.client.from('contacts').select('*').eq('contact_type', 'agency') },
      { name: 'contact_type contains person', query: () => supabaseService.client.from('contacts').select('*').eq('contact_type', 'person') }
    ];
    
    for (const test of queries) {
      try {
        const { data, error } = await test.query();
        if (!error) {
          console.log(`✅ ${test.name}: found ${data?.length || 0} contacts`);
        } else {
          console.log(`❌ ${test.name}: ${error.message}`);
        }
      } catch (e) {
        console.log(`❌ ${test.name}: ${e.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkContactSchema();