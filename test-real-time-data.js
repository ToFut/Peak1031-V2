require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not configured');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addTestData() {
  console.log('🚀 Adding test data to Supabase...');

  try {
    // 1. Add test users
    console.log('👥 Adding test users...');
    const testUsers = [
      {
        email: 'admin@peak1031.com',
        password_hash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', // password: admin123
        role: 'admin',
        first_name: 'Admin',
        last_name: 'User',
        is_active: true,
        two_fa_enabled: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        email: 'coordinator@peak1031.com',
        password_hash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', // password: admin123
        role: 'coordinator',
        first_name: 'John',
        last_name: 'Coordinator',
        is_active: true,
        two_fa_enabled: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        email: 'client@peak1031.com',
        password_hash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i', // password: admin123
        role: 'client',
        first_name: 'Jane',
        last_name: 'Client',
        is_active: true,
        two_fa_enabled: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    for (const user of testUsers) {
      try {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single();

        if (!existingUser) {
          const { data: newUser, error } = await supabase
            .from('users')
            .insert(user)
            .select()
            .single();

          if (error) {
            console.error(`❌ Error adding user ${user.email}:`, error);
          } else {
            console.log(`✅ Added user: ${user.email} (ID: ${newUser.id})`);
          }
        } else {
          console.log(`⚠️ User already exists: ${user.email}`);
        }
      } catch (error) {
        console.error(`❌ Error processing user ${user.email}:`, error);
      }
    }

    // 2. Add test contacts
    console.log('\n👤 Adding test contacts...');
    const testContacts = [
      {
        pp_contact_id: 'test-contact-1',
        first_name: 'Alice',
        last_name: 'Johnson',
        email: 'alice@example.com',
        phone: '+1-555-0101',
        company: 'Johnson Properties LLC',
        pp_data: { test: true },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        pp_contact_id: 'test-contact-2',
        first_name: 'Bob',
        last_name: 'Smith',
        email: 'bob@example.com',
        phone: '+1-555-0102',
        company: 'Smith Investments',
        pp_data: { test: true },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    for (const contact of testContacts) {
      try {
        const { data: existingContact } = await supabase
          .from('contacts')
          .select('id')
          .eq('pp_contact_id', contact.pp_contact_id)
          .single();

        if (!existingContact) {
          const { data: newContact, error } = await supabase
            .from('contacts')
            .insert(contact)
            .select()
            .single();

          if (error) {
            console.error(`❌ Error adding contact ${contact.email}:`, error);
          } else {
            console.log(`✅ Added contact: ${contact.first_name} ${contact.last_name} (ID: ${newContact.id})`);
          }
        } else {
          console.log(`⚠️ Contact already exists: ${contact.email}`);
        }
      } catch (error) {
        console.error(`❌ Error processing contact ${contact.email}:`, error);
      }
    }

    // 3. Add test exchanges
    console.log('\n🏢 Adding test exchanges...');
    
    // Get user IDs for references
    const { data: users } = await supabase.from('users').select('id, email');
    const { data: contacts } = await supabase.from('contacts').select('id, email');
    
    const adminUser = users?.find(u => u.email === 'admin@peak1031.com');
    const coordinatorUser = users?.find(u => u.email === 'coordinator@peak1031.com');
    const testContact = contacts?.[0];

    if (adminUser && testContact) {
      const testExchanges = [
        {
          name: 'Test Exchange 1 - Residential Property',
          status: 'PENDING',
          client_id: testContact.id,
          coordinator_id: adminUser.id,
          exchange_type: 'RESIDENTIAL',
          priority: 'MEDIUM',
          start_date: new Date().toISOString(),
          exchange_value: 500000,
          notes: 'Test exchange for real-time data verification',
          pp_data: { test: true },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          name: 'Test Exchange 2 - Commercial Property',
          status: 'IN_PROGRESS',
          client_id: testContact.id,
          coordinator_id: coordinatorUser?.id || adminUser.id,
          exchange_type: 'COMMERCIAL',
          priority: 'HIGH',
          start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
          exchange_value: 1200000,
          notes: 'Commercial property exchange for testing',
          pp_data: { test: true },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      for (const exchange of testExchanges) {
        try {
          const { data: existingExchange } = await supabase
            .from('exchanges')
            .select('id')
            .eq('name', exchange.name)
            .single();

          if (!existingExchange) {
            const { data: newExchange, error } = await supabase
              .from('exchanges')
              .insert(exchange)
              .select()
              .single();

            if (error) {
              console.error(`❌ Error adding exchange ${exchange.name}:`, error);
            } else {
              console.log(`✅ Added exchange: ${exchange.name} (ID: ${newExchange.id})`);
            }
          } else {
            console.log(`⚠️ Exchange already exists: ${exchange.name}`);
          }
        } catch (error) {
          console.error(`❌ Error processing exchange ${exchange.name}:`, error);
        }
      }
    }

    // 4. Add test documents
    console.log('\n📄 Adding test documents...');
    
    const { data: exchanges } = await supabase.from('exchanges').select('id, name');
    
    if (exchanges && exchanges.length > 0) {
      const testDocuments = [
        {
          filename: 'test-document-1.pdf',
          original_filename: 'Property_Assessment_Report.pdf',
          file_path: '/documents/test-document-1.pdf',
          file_size: 2048576,
          mime_type: 'application/pdf',
          exchange_id: exchanges[0].id,
          uploaded_by: adminUser?.id,
          category: 'ASSESSMENT',
          tags: ['property', 'assessment', 'report'],
          pin_required: false,
          is_template: false,
          template_data: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          filename: 'test-document-2.docx',
          original_filename: 'Exchange_Agreement.docx',
          file_path: '/documents/test-document-2.docx',
          file_size: 1048576,
          mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          exchange_id: exchanges[0].id,
          uploaded_by: adminUser?.id,
          category: 'AGREEMENT',
          tags: ['agreement', 'legal', 'contract'],
          pin_required: true,
          is_template: false,
          template_data: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      for (const document of testDocuments) {
        try {
          const { data: existingDocument } = await supabase
            .from('documents')
            .select('id')
            .eq('filename', document.filename)
            .single();

          if (!existingDocument) {
            const { data: newDocument, error } = await supabase
              .from('documents')
              .insert(document)
              .select()
              .single();

            if (error) {
              console.error(`❌ Error adding document ${document.original_filename}:`, error);
            } else {
              console.log(`✅ Added document: ${document.original_filename} (ID: ${newDocument.id})`);
            }
          } else {
            console.log(`⚠️ Document already exists: ${document.original_filename}`);
          }
        } catch (error) {
          console.error(`❌ Error processing document ${document.original_filename}:`, error);
        }
      }
    }

    console.log('\n🎉 Test data added successfully!');
    console.log('\n📊 Test Data Summary:');
    console.log('- Users: admin@peak1031.com, coordinator@peak1031.com, client@peak1031.com');
    console.log('- Contacts: Alice Johnson, Bob Smith');
    console.log('- Exchanges: Test Exchange 1, Test Exchange 2');
    console.log('- Documents: Property Assessment Report, Exchange Agreement');
    
    console.log('\n🔍 To test real-time functionality:');
    console.log('1. Start the backend: cd backend && npm start');
    console.log('2. Start the frontend: cd frontend && npm start');
    console.log('3. Login with admin@peak1031.com / admin123');
    console.log('4. Navigate to Users page and verify real-time data');
    console.log('5. Check that data updates immediately when modified in Supabase');

  } catch (error) {
    console.error('❌ Error adding test data:', error);
  }
}

// Run the script
addTestData().then(() => {
  console.log('\n✅ Test data script completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});




