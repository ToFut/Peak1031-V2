const supabaseService = require('./services/supabase');

async function debugAgencyQuery() {
  try {
    console.log('🔍 Testing agency query step by step...');
    
    // Test basic query
    console.log('1. Testing basic contacts query...');
    const { data: allContacts, error: basicError } = await supabaseService.client
      .from('contacts')
      .select('*', { count: 'exact' })
      .limit(1);
    
    if (basicError) {
      console.error('❌ Basic query failed:', basicError);
      return;
    }
    console.log('✅ Basic query works, found contacts:', allContacts?.length);
    
    // Test ilike query
    console.log('2. Testing ilike query for agency...');
    const { data: agencyContacts, error: ilikeError } = await supabaseService.client
      .from('contacts')
      .select('*', { count: 'exact' })
      .ilike('contact_type', '%agency%');
    
    if (ilikeError) {
      console.error('❌ ilike query failed:', ilikeError);
      return;
    }
    console.log('✅ ilike query works, found agency contacts:', agencyContacts?.length);
    
    if (agencyContacts && agencyContacts.length > 0) {
      console.log('Sample agency contact:', {
        id: agencyContacts[0].id,
        email: agencyContacts[0].email,
        contact_type: agencyContacts[0].contact_type
      });
    }
    
    // Now test the full agency service query manually
    console.log('3. Testing full query manually...');
    
    const page = 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const sortBy = 'created_at';
    const sortOrder = 'desc';
    
    let query = supabaseService.client
      .from('contacts')
      .select('*', { count: 'exact' });
    
    console.log('  - Added select clause');
    
    query = query.ilike('contact_type', '%agency%');
    console.log('  - Added contact_type filter');
    
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    console.log('  - Added sorting');
    
    query = query.range(offset, offset + limit - 1);
    console.log('  - Added pagination');
    
    const { data: finalData, error: finalError, count } = await query;
    
    if (finalError) {
      console.error('❌ Full query failed:', finalError);
      return;
    }
    
    console.log('✅ Full query works!');
    console.log('Results:', {
      count: count,
      dataLength: finalData?.length || 0
    });
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugAgencyQuery();