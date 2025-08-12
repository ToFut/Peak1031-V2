const agencyService = require('./services/agencyService');

async function testFullAgencyService() {
  try {
    console.log('🔍 Testing full agency service...');
    
    // Test getAllAgencies with default options
    console.log('1. Testing getAllAgencies with defaults...');
    
    const result = await agencyService.getAllAgencies();
    
    console.log('✅ getAllAgencies completed');
    console.log('Result structure:', {
      success: result.success,
      hasData: !!result.data,
      dataLength: result.data?.length || 0,
      hasPagination: !!result.pagination,
      pagination: result.pagination
    });
    
    if (result.data && result.data.length > 0) {
      console.log('Sample agency:', {
        id: result.data[0].id,
        display_name: result.data[0].display_name,
        email: result.data[0].email,
        contact_type: result.data[0].contact_type
      });
    }
    
  } catch (error) {
    console.error('❌ Agency service error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testFullAgencyService();