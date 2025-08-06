const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testDocumentGeneration() {
  console.log('🧪 Testing Document Generation System\n');
  console.log('=' .repeat(50));

  try {
    // 1. Check if generated_documents table exists
    console.log('\n1️⃣ Checking generated_documents table...');
    const { data: genDocs, error: genError } = await supabase
      .from('generated_documents')
      .select('count')
      .limit(1);

    if (genError) {
      console.log('❌ Table does not exist:', genError.message);
      console.log('   → Please run SETUP_GENERATED_DOCS_SIMPLE.sql in Supabase');
      return;
    } else {
      console.log('✅ Table exists!');
    }

    // 2. Check if stage_triggers column exists
    console.log('\n2️⃣ Checking stage_triggers column...');
    const { data: templates, error: templateError } = await supabase
      .from('document_templates')
      .select('id, name, stage_triggers')
      .limit(1);

    if (templateError) {
      if (templateError.message.includes('stage_triggers')) {
        console.log('❌ Column stage_triggers missing');
        console.log('   → Please run the ALTER TABLE command from the SQL file');
      } else {
        console.log('⚠️ Other error:', templateError.message);
      }
    } else {
      console.log('✅ Column exists!');
      if (templates && templates.length > 0) {
        console.log('   Sample template:', templates[0].name);
        console.log('   Stage triggers:', templates[0].stage_triggers || 'None set');
      }
    }

    // 3. Check for any existing generated documents
    console.log('\n3️⃣ Checking for existing generated documents...');
    const { data: existingDocs, error: existingError } = await supabase
      .from('generated_documents')
      .select('id, name, exchange_id, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!existingError && existingDocs) {
      if (existingDocs.length > 0) {
        console.log(`✅ Found ${existingDocs.length} generated documents:`);
        existingDocs.forEach(doc => {
          console.log(`   - ${doc.name} (${new Date(doc.created_at).toLocaleDateString()})`);
        });
      } else {
        console.log('📋 No generated documents yet (table is empty but ready)');
      }
    }

    // 4. Test placeholder replacement data
    console.log('\n4️⃣ Testing placeholder replacement fields...');
    const testExchange = {
      id: 'test-123',
      exchangeNumber: 'EX-2024-001',
      exchangeName: 'Test Exchange',
      status: 'PENDING',
      exchangeType: 'DELAYED',
      exchangeValue: 500000,
      relinquishedPropertyAddress: '123 Main St, City, ST 12345',
      client: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-1234'
      }
    };

    const placeholders = {
      '#Exchange.Number#': testExchange.exchangeNumber,
      '#Client.Name#': `${testExchange.client.firstName} ${testExchange.client.lastName}`,
      '#Property.Address#': testExchange.relinquishedPropertyAddress,
      '#Exchange.Value#': `$${testExchange.exchangeValue.toLocaleString()}`
    };

    console.log('✅ Placeholder replacements would be:');
    Object.entries(placeholders).forEach(([key, value]) => {
      console.log(`   ${key} → "${value}"`);
    });

    // 5. Check if templates exist for testing
    console.log('\n5️⃣ Checking available templates...');
    const { data: allTemplates, error: allTemplatesError } = await supabase
      .from('document_templates')
      .select('id, name, category, auto_generate')
      .order('created_at', { ascending: false });

    if (!allTemplatesError && allTemplates) {
      console.log(`✅ Found ${allTemplates.length} templates:`);
      allTemplates.slice(0, 5).forEach(t => {
        console.log(`   - ${t.name} (${t.category}) ${t.auto_generate ? '[Auto-Gen]' : ''}`);
      });
    } else {
      console.log('⚠️ No templates found or error:', allTemplatesError?.message);
    }

    // 6. Check exchanges for testing
    console.log('\n6️⃣ Checking available exchanges...');
    const { data: exchanges, error: exchangesError } = await supabase
      .from('exchanges')
      .select('id, exchange_name, name, status')
      .limit(3);

    if (!exchangesError && exchanges && exchanges.length > 0) {
      console.log(`✅ Found ${exchanges.length} exchanges for testing:`);
      exchanges.forEach(e => {
        console.log(`   - ${e.exchange_name || e.name || e.id} (${e.status})`);
      });
    } else {
      console.log('⚠️ No exchanges found for testing');
    }

    console.log('\n' + '=' .repeat(50));
    console.log('📊 SYSTEM STATUS:');
    
    if (!genError && !templateError) {
      console.log('✅ Document generation system is READY!');
      console.log('\n📝 Next steps:');
      console.log('1. Upload a template with placeholders (#Client.Name#, etc.)');
      console.log('2. Select a template and exchange to generate a document');
      console.log('3. The placeholders will be replaced with actual data');
    } else {
      console.log('⚠️ System needs setup - run the SQL migration first');
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

testDocumentGeneration();