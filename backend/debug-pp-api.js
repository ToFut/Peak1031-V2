const practicePartnerService = require('./services/practicePartnerService.js');

async function debugAPI() {
  try {
    console.log('🔍 Debugging PracticePanther API response...\n');
    
    const response = await practicePartnerService.client.get('/contacts', {
      params: { 
        limit: 2,
        page: 1
      }
    });
    
    console.log('Response keys:', Object.keys(response.data));
    console.log('Total count:', response.data.total_count);
    console.log('Has items?', !!response.data.items);
    console.log('Items length:', response.data.items?.length);
    console.log('\nFirst contact structure:');
    if (response.data.items && response.data.items.length > 0) {
      console.log(JSON.stringify(response.data.items[0], null, 2));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugAPI();