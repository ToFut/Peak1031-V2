require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

async function createWorkingMockData() {
  console.log('🎭 Creating working mock data with correct schema...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // 1. Get an exchange
    const { data: exchanges } = await supabase
      .from('exchanges')
      .select('*')
      .limit(1);
    
    if (!exchanges || exchanges.length === 0) {
      console.log('❌ No exchanges found');
      return;
    }
    
    const exchange = exchanges[0];
    console.log(`📋 Using exchange: ${exchange.name || exchange.exchange_number || exchange.id}`);
    
    // 2. Get contacts (for message senders) and people (for task assignments)
    const { data: contacts } = await supabase
      .from('contacts')
      .select('*')
      .limit(10);
      
    const { data: people } = await supabase
      .from('people')
      .select('*')
      .limit(10);
    
    const { data: users } = await supabase
      .from('users')
      .select('*')
      .limit(10);
    
    console.log(`👥 Found ${contacts?.length || 0} contacts, ${people?.length || 0} people, ${users?.length || 0} users`);
    
    const firstContact = contacts?.[0];
    const firstPerson = people?.[0];
    const firstUser = users?.[0];
    
    // 3. CREATE DOCUMENTS (with required fields only)
    console.log('📄 Creating documents...');
    
    const documents = [
      {
        id: uuidv4(),
        filename: 'exchange_agreement.pdf',
        original_filename: 'Exchange Agreement - Signed.pdf',
        file_path: '/docs/exchange_agreement.pdf',
        exchange_id: exchange.id,
        uploaded_by: firstUser?.id,
        file_size: 2847392,
        mime_type: 'application/pdf',
        category: 'legal',
        tags: ['agreement', 'signed', 'legal'],
        pin_required: false,
        is_template: false
      },
      {
        id: uuidv4(),
        filename: 'property_deed.pdf',
        original_filename: 'Property Deed - 123 Main St.pdf',
        file_path: '/docs/property_deed.pdf',
        exchange_id: exchange.id,
        uploaded_by: firstUser?.id,
        file_size: 1847392,
        mime_type: 'application/pdf',
        category: 'property',
        tags: ['deed', 'property'],
        pin_required: true,
        pin_hash: '$2b$10$hashedpin123'
      },
      {
        id: uuidv4(),
        filename: 'identification_notice.pdf',
        original_filename: '45-Day Identification Notice.pdf',
        file_path: '/docs/identification_notice.pdf',
        exchange_id: exchange.id,
        uploaded_by: firstUser?.id,
        file_size: 947392,
        mime_type: 'application/pdf',
        category: 'compliance',
        tags: ['45-day', 'identification'],
        pin_required: false
      },
      {
        id: uuidv4(),
        filename: 'financial_analysis.xlsx',
        original_filename: 'Financial Analysis.xlsx',
        file_path: '/docs/financial_analysis.xlsx',
        exchange_id: exchange.id,
        uploaded_by: firstUser?.id,
        file_size: 1247392,
        mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        category: 'financial',
        tags: ['financial', 'analysis'],
        pin_required: false
      },
      {
        id: uuidv4(),
        filename: 'property_photos.zip',
        original_filename: 'Property Photos.zip',
        file_path: '/docs/property_photos.zip',
        exchange_id: exchange.id,
        uploaded_by: firstUser?.id,
        file_size: 15847392,
        mime_type: 'application/zip',
        category: 'property',
        tags: ['photos', 'property'],
        pin_required: false
      }
    ];
    
    for (const doc of documents) {
      const { error } = await supabase
        .from('documents')
        .insert([doc]);
        
      if (error) {
        console.error(`Error creating document ${doc.filename}:`, error.message);
      } else {
        console.log(`✅ Created document: ${doc.filename}`);
      }
    }
    
    // 4. CREATE TASKS (using people table for assignments)
    console.log('📋 Creating tasks...');
    
    if (firstPerson) {
      const tasks = [
        {
          id: uuidv4(),
          title: 'Review Exchange Agreement',
          description: 'Review and approve the 1031 exchange agreement documents',
          exchange_id: exchange.id,
          assigned_to: firstPerson.id,
          created_by: firstUser?.id,
          status: 'COMPLETED',
          priority: 'HIGH',
          due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          completed_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          category: 'legal'
        },
        {
          id: uuidv4(),
          title: 'Submit 45-Day Notice',
          description: 'Prepare and submit 45-day identification notice',
          exchange_id: exchange.id,
          assigned_to: firstPerson.id,
          created_by: firstUser?.id,
          status: 'COMPLETED',
          priority: 'URGENT',
          due_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          completed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          category: 'compliance'
        },
        {
          id: uuidv4(),
          title: 'Coordinate Property Inspections',
          description: 'Schedule inspections for replacement properties',
          exchange_id: exchange.id,
          assigned_to: firstPerson.id,
          created_by: firstUser?.id,
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          category: 'property'
        },
        {
          id: uuidv4(),
          title: 'Finalize Property Selection',
          description: 'Make final decision on replacement properties',
          exchange_id: exchange.id,
          assigned_to: firstPerson.id,
          created_by: firstUser?.id,
          status: 'PENDING',
          priority: 'URGENT',
          due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          category: 'decision'
        },
        {
          id: uuidv4(),
          title: 'Prepare Purchase Agreements',
          description: 'Draft purchase agreements for selected properties',
          exchange_id: exchange.id,
          assigned_to: firstPerson.id,
          created_by: firstUser?.id,
          status: 'PENDING',
          priority: 'HIGH',
          due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          category: 'legal'
        },
        {
          id: uuidv4(),
          title: 'Update Financial Analysis',
          description: 'Update financial projections with latest data',
          exchange_id: exchange.id,
          assigned_to: firstPerson.id,
          created_by: firstUser?.id,
          status: 'IN_PROGRESS',
          priority: 'MEDIUM',
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          category: 'financial'
        }
      ];
      
      for (const task of tasks) {
        const { error } = await supabase
          .from('tasks')
          .insert([task]);
          
        if (error) {
          console.error(`Error creating task ${task.title}:`, error.message);
        } else {
          console.log(`✅ Created task: ${task.title}`);
        }
      }
    } else {
      console.log('⚠️ No people found for task assignments');
    }
    
    // 5. CREATE MESSAGES (using contacts table for senders)
    console.log('💬 Creating messages...');
    
    if (firstContact) {
      const messages = [
        {
          id: uuidv4(),
          content: 'Welcome to your 1031 exchange! I will be coordinating this process with you.',
          sender_id: firstContact.id,
          exchange_id: exchange.id,
          created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: uuidv4(),
          content: 'Thank you! I am excited to get started with this exchange.',
          sender_id: firstContact.id,
          exchange_id: exchange.id,
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: uuidv4(),
          content: 'I have uploaded the signed exchange agreement for your review.',
          sender_id: firstContact.id,
          exchange_id: exchange.id,
          created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: uuidv4(),
          content: 'The agreement looks good. I have also uploaded the property deed.',
          sender_id: firstContact.id,
          exchange_id: exchange.id,
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: uuidv4(),
          content: 'Great progress on the identification notice! Next step is property inspections.',
          sender_id: firstContact.id,
          exchange_id: exchange.id,
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: uuidv4(),
          content: 'I have updated the financial analysis with the latest property values.',
          sender_id: firstContact.id,
          exchange_id: exchange.id,
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: uuidv4(),
          content: 'Could we schedule a call this week to discuss the financing options?',
          sender_id: firstContact.id,
          exchange_id: exchange.id,
          created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
        },
        {
          id: uuidv4(),
          content: 'Absolutely! I have availability Thursday at 2 PM or Friday at 10 AM.',
          sender_id: firstContact.id,
          exchange_id: exchange.id,
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
        },
        {
          id: uuidv4(),
          content: 'Thursday at 2 PM works perfectly! Looking forward to our discussion.',
          sender_id: firstContact.id,
          exchange_id: exchange.id,
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        }
      ];
      
      for (const message of messages) {
        const { error } = await supabase
          .from('messages')
          .insert([message]);
          
        if (error) {
          console.error(`Error creating message:`, error.message);
        } else {
          console.log(`✅ Created message`);
        }
      }
    } else {
      console.log('⚠️ No contacts found for message senders');
    }
    
    // 6. UPDATE EXCHANGE with better details
    console.log('🏢 Updating exchange details...');
    
    const { error: exchangeUpdateError } = await supabase
      .from('exchanges')
      .update({
        name: exchange.name || 'Premium Commercial 1031 Exchange',
        relinquished_property_value: 1250000.00,
        replacement_property_value: 1450000.00,
        cash_boot: 25000.00,
        financing_amount: 950000.00,
        sale_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        identification_deadline: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
        exchange_deadline: new Date(Date.now() + 170 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        priority: 'high',
        completion_percentage: 35,
        notes: 'High-value commercial exchange with experienced investor client.',
        updated_at: new Date().toISOString()
      })
      .eq('id', exchange.id);
    
    if (exchangeUpdateError) {
      console.error('Error updating exchange:', exchangeUpdateError.message);
    } else {
      console.log('✅ Updated exchange details');
    }
    
    console.log('\n🎉 WORKING MOCK DATA CREATION COMPLETE!');
    console.log('\n📊 Summary:');
    console.log(`   🏢 Exchange: ${exchange.name || exchange.exchange_number || exchange.id}`);
    console.log(`   📄 Documents: ${documents.length} created`);
    console.log(`   📋 Tasks: ${firstPerson ? 6 : 0} created`);
    console.log(`   💬 Messages: ${firstContact ? 9 : 0} created`);
    console.log('\n✨ Your exchange should now show rich data in all tabs!');
    console.log('🔄 Please refresh the exchange detail page to see the new content.');
    
  } catch (error) {
    console.error('❌ Error creating working mock data:', error);
  }
}

// Run the working mock data creation
if (require.main === module) {
  createWorkingMockData().catch(console.error);
}

module.exports = createWorkingMockData;