const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function showGeneratedDocs() {
  console.log('📄 Fetching all generated documents...\n');
  console.log('=' .repeat(60));

  const { data: docs, error } = await supabase
    .from('generated_documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching documents:', error.message);
    return;
  }

  if (!docs || docs.length === 0) {
    console.log('📭 No generated documents found');
    return;
  }

  console.log(`✅ Found ${docs.length} generated document(s):\n`);

  docs.forEach((doc, index) => {
    console.log(`${index + 1}. ${doc.name}`);
    console.log('   ID:', doc.id);
    console.log('   Exchange ID:', doc.exchange_id);
    console.log('   Status:', doc.status);
    console.log('   Created:', new Date(doc.created_at).toLocaleString());
    
    if (doc.file_url) {
      console.log('   📥 Download URL:');
      console.log('   ', doc.file_url);
    }
    
    console.log('   ' + '-'.repeat(56));
  });

  // Also check which exchanges have generated documents
  const exchangeIds = [...new Set(docs.map(d => d.exchange_id))];
  console.log(`\n📊 Documents are associated with ${exchangeIds.length} exchange(s)`);
  
  for (const exchangeId of exchangeIds) {
    const { data: exchange } = await supabase
      .from('exchanges')
      .select('id, exchange_name, status')
      .eq('id', exchangeId)
      .single();
    
    if (exchange) {
      const docCount = docs.filter(d => d.exchange_id === exchangeId).length;
      console.log(`   - ${exchange.exchange_name || 'Unknown'} (${docCount} document${docCount > 1 ? 's' : ''})`);
    }
  }
}

showGeneratedDocs();