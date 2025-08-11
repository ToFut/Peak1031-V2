require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

async function createSegevDemoExchange() {
  console.log('🚀 Creating SEGEV DEMO - Ultimate Exchange Experience...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // 1. CREATE THE ULTIMATE DEMO EXCHANGE
    console.log('🏢 Creating SEGEV DEMO Exchange...');
    
    const exchangeId = uuidv4();
    const demoExchange = {
      id: exchangeId,
      exchange_number: 'SEGEV-DEMO-2025-001',
      name: 'SEGEV DEMO - Ultimate 1031 Exchange Experience',
      exchange_type: 'simultaneous',
      relinquished_property_value: 2500000.00, // $2.5M
      replacement_property_value: 3200000.00, // $3.2M
      cash_boot: 150000.00, // $150K
      financing_amount: 1800000.00, // $1.8M
      sale_date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(), // 12 days ago
      identification_deadline: new Date(Date.now() + 33 * 24 * 60 * 60 * 1000).toISOString(), // 33 days left
      exchange_deadline: new Date(Date.now() + 168 * 24 * 60 * 60 * 1000).toISOString(), // 168 days left
      status: 'active',
      priority: 'urgent',
      completion_percentage: 42,
      tags: JSON.stringify(['demo', 'ultimate', 'high-value', 'segev', 'tech-showcase']),
      notes: 'ULTIMATE DEMO EXCHANGE showcasing all platform capabilities: Real-time collaboration, AI-powered tasks, document management, smart notifications, and comprehensive 1031 workflow automation. This demo represents the pinnacle of exchange management technology.',
      relinquished_properties: JSON.stringify([
        {
          id: uuidv4(),
          address: '100 Silicon Valley Blvd, Palo Alto, CA 94301',
          propertyType: 'Class A Office Building',
          value: 2500000,
          sqft: 15000,
          yearBuilt: 2018,
          status: 'sold',
          saleDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
          description: 'Modern tech campus with Google, Apple, and Meta as neighbors'
        }
      ]),
      replacement_properties: JSON.stringify([
        {
          id: uuidv4(),
          address: '200 Innovation Drive, San Francisco, CA 94105',
          propertyType: 'Mixed Use Development',
          value: 1800000,
          sqft: 12000,
          yearBuilt: 2022,
          status: 'identified',
          description: 'Brand new mixed-use development in SOMA district'
        },
        {
          id: uuidv4(),
          address: '300 Tech Center Way, San Jose, CA 95110',
          propertyType: 'Industrial/Warehouse',
          value: 1400000,
          sqft: 25000,
          yearBuilt: 2021,
          status: 'under_contract',
          description: 'State-of-the-art logistics facility near major highways'
        }
      ]),
      property_types: ['office', 'mixed_use', 'industrial'],
      compliance_checklist: JSON.stringify({
        'exchange_agreement_signed': true,
        'qualified_intermediary_retained': true,
        'relinquished_property_sold': true,
        '45_day_identification_submitted': true,
        'replacement_properties_identified': true,
        'financing_secured': false,
        'title_insurance_ordered': false,
        'final_walkthrough_scheduled': false
      }),
      created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { error: exchangeError } = await supabase
      .from('exchanges')
      .insert([demoExchange]);
    
    if (exchangeError) {
      console.error('Error creating demo exchange:', exchangeError);
      return;
    }
    
    console.log('✅ SEGEV DEMO Exchange created!');
    
    // 2. GET REAL USERS FOR THE DEMO
    console.log('👥 Setting up demo team members...');
    
    const { data: allUsers } = await supabase
      .from('users')
      .select('*')
      .limit(10);
    
    const { data: allContacts } = await supabase
      .from('contacts')
      .select('*')
      .limit(10);
    
    if (!allUsers || allUsers.length === 0) {
      console.log('⚠️ No users found for demo');
      return;
    }
    
    // 3. CREATE REALISTIC TASKS WITH CRITICAL 45-DAY DEADLINE
    console.log('📋 Creating ultimate task management experience...');
    
    const demoTasks = [
      {
        id: uuidv4(),
        title: '🚨 URGENT: Submit Final Property Selection (45-Day Deadline)',
        description: 'CRITICAL DEADLINE APPROACHING! Must finalize and submit the official property selection to comply with 1031 exchange requirements. Only 33 days remaining before the 45-day identification deadline expires.',
        exchange_id: exchangeId,
        assigned_to: allUsers.find(u => u.role === 'client')?.id || allUsers[0]?.id,
        created_by: allUsers.find(u => u.role === 'coordinator')?.id || allUsers[1]?.id,
        status: 'IN_PROGRESS',
        priority: 'URGENT',
        due_date: new Date(Date.now() + 33 * 24 * 60 * 60 * 1000).toISOString(), // 33 days left
        start_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        title: '📄 Upload Required Documents: Property Appraisals & Inspections',
        description: 'Upload the professional appraisal reports and inspection documentation for both replacement properties. These documents are required before we can proceed with the final contracts.',
        exchange_id: exchangeId,
        assigned_to: allUsers.find(u => u.role === 'coordinator')?.id || allUsers[1]?.id,
        created_by: allUsers.find(u => u.role === 'admin')?.id || allUsers[0]?.id,
        status: 'PENDING',
        priority: 'HIGH',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        title: '💰 Secure Financing for Replacement Properties',
        description: 'Finalize financing arrangements for the $1.8M loan needed for the replacement properties. Current pre-approval expires in 10 days.',
        exchange_id: exchangeId,
        assigned_to: allUsers.find(u => u.role === 'client')?.id || allUsers[0]?.id,
        created_by: allUsers.find(u => u.role === 'coordinator')?.id || allUsers[1]?.id,
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days
        start_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        title: '🔍 Schedule Final Property Walkthrough',
        description: 'Coordinate final walkthrough of both replacement properties with client, inspector, and title company representative.',
        exchange_id: exchangeId,
        assigned_to: allUsers.find(u => u.role === 'coordinator')?.id || allUsers[1]?.id,
        created_by: allUsers.find(u => u.role === 'coordinator')?.id || allUsers[1]?.id,
        status: 'PENDING',
        priority: 'MEDIUM',
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        title: '📋 Prepare Closing Documentation Package',
        description: 'Compile all necessary documents for the closing: contracts, title insurance, loan documents, 1031 exchange forms, and wire transfer instructions.',
        exchange_id: exchangeId,
        assigned_to: allUsers.find(u => u.role === 'coordinator')?.id || allUsers[1]?.id,
        created_by: allUsers.find(u => u.role === 'admin')?.id || allUsers[0]?.id,
        status: 'PENDING',
        priority: 'MEDIUM',
        due_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), // 21 days
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        title: '✅ Quality Control Review - Exchange Compliance',
        description: 'Final compliance review to ensure all 1031 exchange requirements are met before closing. This includes verification of timelines, documentation, and fund transfers.',
        exchange_id: exchangeId,
        assigned_to: allUsers.find(u => u.role === 'admin')?.id || allUsers[0]?.id,
        created_by: allUsers.find(u => u.role === 'admin')?.id || allUsers[0]?.id,
        status: 'PENDING',
        priority: 'HIGH',
        due_date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(), // 28 days
        created_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        title: '🎯 Demo Task: Test @TASK AI Integration',
        description: 'This is a demo task to showcase the @TASK AI integration feature. Users can create tasks by typing @TASK in the chat, and AI will help structure and prioritize them.',
        exchange_id: exchangeId,
        assigned_to: allUsers[0]?.id,
        created_by: allUsers.find(u => u.role === 'admin')?.id || allUsers[0]?.id,
        status: 'PENDING',
        priority: 'LOW',
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    let createdTasks = 0;
    for (const task of demoTasks) {
      const { error: taskError } = await supabase
        .from('tasks')
        .insert([task]);
      
      if (taskError) {
        console.error(`Error creating task "${task.title}":`, taskError.message);
      } else {
        createdTasks++;
      }
    }
    
    console.log(`✅ Created ${createdTasks} demo tasks with realistic deadlines`);
    
    // 4. CREATE COMPREHENSIVE MESSAGE HISTORY WITH @TASK EXAMPLES
    console.log('💬 Creating ultimate chat experience with AI examples...');
    
    const demoMessages = [
      {
        id: uuidv4(),
        content: '🎉 Welcome to the SEGEV DEMO - Ultimate 1031 Exchange Experience! This demo showcases our platform\'s most advanced features including real-time collaboration, AI-powered task management, and intelligent document processing.',
        sender_id: allContacts[0]?.id,
        exchange_id: exchangeId,
        created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        content: 'This is incredible! I can see the real-time updates and the interface is so intuitive. The $2.5M → $3.2M exchange looks very promising.',
        sender_id: allContacts[1]?.id || allContacts[0]?.id,
        exchange_id: exchangeId,
        created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        content: '📊 MILESTONE ACHIEVED: Relinquished property (100 Silicon Valley Blvd) has been successfully sold for $2.5M! We are now officially in the 45-day identification period with 33 days remaining.',
        sender_id: allContacts[0]?.id,
        exchange_id: exchangeId,
        created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        content: 'Excellent! I love how the platform automatically updated the timeline and created the urgent tasks. The visual countdown is very helpful.',
        sender_id: allContacts[1]?.id || allContacts[0]?.id,
        exchange_id: exchangeId,
        created_at: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        content: '@TASK Create reminder to upload property appraisal for 200 Innovation Drive by Friday. This is needed for the loan approval process.',
        sender_id: allContacts[1]?.id || allContacts[0]?.id,
        exchange_id: exchangeId,
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        content: '🤖 AI ASSISTANT: Task created successfully! I\'ve added "Upload Property Appraisal - 200 Innovation Drive" to your task list with HIGH priority and Friday deadline. I also noticed this relates to your loan approval - would you like me to create a follow-up task for loan document submission?',
        sender_id: allContacts[0]?.id, // System/AI message
        exchange_id: exchangeId,
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        content: 'Yes, that would be great! The AI integration is amazing - it understands the context and suggests related tasks.',
        sender_id: allContacts[1]?.id || allContacts[0]?.id,
        exchange_id: exchangeId,
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        content: '🎯 PROGRESS UPDATE: I\'ve completed 75% of the property selection task. Both replacement properties look excellent - the San Francisco mixed-use and San Jose industrial properties complement each other perfectly.',
        sender_id: allContacts[1]?.id || allContacts[0]?.id,
        exchange_id: exchangeId,
        created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        content: 'Fantastic progress! I can see the task status updated automatically in the dashboard. The smart notifications are keeping everyone informed in real-time.',
        sender_id: allContacts[0]?.id,
        exchange_id: exchangeId,
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        content: '💰 FINANCING UPDATE: Great news! I\'ve secured pre-approval for $1.8M at 6.2% interest rate - better than our initial projections. The lender loves the property selections.',
        sender_id: allContacts[1]?.id || allContacts[0]?.id,
        exchange_id: exchangeId,
        created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        content: 'Outstanding! The financial projections just updated automatically. I love how the platform calculates the ROI and cash flow in real-time.',
        sender_id: allContacts[0]?.id,
        exchange_id: exchangeId,
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        content: '@TASK Schedule walkthrough for both properties next week. Invite title company rep and building inspector. Critical for due diligence.',
        sender_id: allContacts[0]?.id,
        exchange_id: exchangeId,
        created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        content: '🤖 AI ASSISTANT: Perfect! I\'ve created "Schedule Final Property Walkthrough" task with MEDIUM priority due in 14 days. I\'ve also added coordination details for title company and inspector. The AI automatically identified this as a critical due diligence milestone.',
        sender_id: allContacts[1]?.id || allContacts[0]?.id,
        exchange_id: exchangeId,
        created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 2 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        content: '📄 DOCUMENT ALERT: The inspection reports are ready for upload. Using the new drag-and-drop interface makes document management so much easier!',
        sender_id: allContacts[1]?.id || allContacts[0]?.id,
        exchange_id: exchangeId,
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        content: 'Perfect timing! I can see the document upload progress in real-time. The PIN protection and automatic categorization features are excellent for compliance.',
        sender_id: allContacts[0]?.id,
        exchange_id: exchangeId,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        content: '🚨 TIMELINE REMINDER: Only 33 days left for the 45-day deadline! But we\'re in great shape - all major milestones are on track and the AI is proactively suggesting optimizations.',
        sender_id: allContacts[0]?.id,
        exchange_id: exchangeId,
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        content: 'This SEGEV DEMO truly showcases what\'s possible with modern 1031 exchange management. Real-time collaboration, intelligent automation, and seamless user experience!',
        sender_id: allContacts[1]?.id || allContacts[0]?.id,
        exchange_id: exchangeId,
        created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        content: '🎯 Next up: Let\'s test the document upload and see how other team members can join this exchange in real-time. The multi-user collaboration is the crown jewel!',
        sender_id: allContacts[0]?.id,
        exchange_id: exchangeId,
        created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        content: '@TASK Test document upload functionality and demonstrate to other users. Show PIN protection and automatic categorization features.',
        sender_id: allContacts[1]?.id || allContacts[0]?.id,
        exchange_id: exchangeId,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        content: '🤖 AI ASSISTANT: Demo task created! I\'ve added this to showcase our document management capabilities. Would you like me to also create tasks for multi-user testing and real-time collaboration demonstration?',
        sender_id: allContacts[0]?.id,
        exchange_id: exchangeId,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000 + 30 * 1000).toISOString()
      }
    ];
    
    let createdMessages = 0;
    for (const message of demoMessages) {
      const { error: messageError } = await supabase
        .from('messages')
        .insert([message]);
      
      if (messageError) {
        console.error(`Error creating message:`, messageError.message);
      } else {
        createdMessages++;
      }
    }
    
    console.log(`✅ Created ${createdMessages} demo messages with @TASK examples and AI responses`);
    
    // 5. CREATE EXCHANGE PARTICIPANTS (Team Members)
    console.log('👥 Adding team members to demonstrate collaboration...');
    
    if (allUsers.length >= 3) {
      const participants = [
        {
          id: uuidv4(),
          exchange_id: exchangeId,
          user_id: allUsers[0]?.id,
          role: 'admin',
          is_primary: true,
          is_decision_maker: true,
          permission_level: 'full_access',
          can_view_documents: true,
          can_upload_documents: true,
          can_comment: true,
          can_create_tasks: true,
          can_view_financial: true,
          receive_notifications: true,
          can_access_chat: true,
          chat_channels: JSON.stringify(['exchange_general', 'exchange_documents', 'exchange_tasks', 'exchange_financial']),
          joined_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: true,
          last_activity_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          responsiveness_score: 98,
          engagement_score: 95,
          created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          id: uuidv4(),
          exchange_id: exchangeId,
          user_id: allUsers[1]?.id,
          role: 'coordinator',
          is_primary: false,
          is_decision_maker: true,
          permission_level: 'edit_documents',
          can_view_documents: true,
          can_upload_documents: true,
          can_comment: true,
          can_create_tasks: true,
          can_view_financial: true,
          receive_notifications: true,
          can_access_chat: true,
          chat_channels: JSON.stringify(['exchange_general', 'exchange_documents', 'exchange_tasks']),
          joined_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: true,
          last_activity_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          responsiveness_score: 92,
          engagement_score: 88,
          created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
        },
        {
          id: uuidv4(),
          exchange_id: exchangeId,
          user_id: allUsers[2]?.id,
          role: 'client',
          is_primary: true,
          is_decision_maker: true,
          permission_level: 'comment',
          can_view_documents: true,
          can_upload_documents: true,
          can_comment: true,
          can_create_tasks: false,
          can_view_financial: true,
          receive_notifications: true,
          can_access_chat: true,
          chat_channels: JSON.stringify(['exchange_general', 'exchange_documents']),
          joined_at: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: true,
          last_activity_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          responsiveness_score: 85,
          engagement_score: 90,
          created_at: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
        }
      ];
      
      let createdParticipants = 0;
      for (const participant of participants) {
        const { error: participantError } = await supabase
          .from('exchange_participants')
          .insert([participant]);
        
        if (participantError) {
          console.error(`Error creating participant:`, participantError.message);
        } else {
          createdParticipants++;
        }
      }
      
      console.log(`✅ Added ${createdParticipants} team members for real-time collaboration`);
    }
    
    console.log('\n🎉 SEGEV DEMO EXCHANGE CREATION COMPLETE!');
    console.log('\n🚀 ULTIMATE EXCHANGE FEATURES READY:');
    console.log(`   🏢 Exchange: "${demoExchange.name}"`);
    console.log(`   💰 Value: $2.5M → $3.2M (+$700K appreciation)`);
    console.log(`   ⏰ Timeline: 33 days left (45-day period)`);
    console.log(`   📋 Tasks: ${createdTasks} realistic tasks with deadlines`);
    console.log(`   💬 Messages: ${createdMessages} with @TASK AI examples`);
    console.log(`   👥 Team: Multi-user collaboration enabled`);
    console.log(`   🤖 AI: @TASK command integration demonstrated`);
    console.log(`   📊 Progress: 42% completion with smart tracking`);
    
    console.log('\n✨ DEMO HIGHLIGHTS:');
    console.log('   • Real-time collaboration between users');
    console.log('   • AI-powered task creation via @TASK commands');
    console.log('   • Critical 45-day deadline countdown');
    console.log('   • Comprehensive document management');
    console.log('   • Smart financial projections');
    console.log('   • Intelligent notification system');
    console.log('   • Professional 1031 exchange workflow');
    
    console.log('\n🔄 Next Steps:');
    console.log('   1. Navigate to the SEGEV DEMO exchange');
    console.log('   2. Test @TASK commands in chat');
    console.log('   3. Upload documents with PIN protection');
    console.log('   4. Invite other users to collaborate');
    console.log('   5. Experience real-time updates');
    
    return { exchangeId, demoExchange };
    
  } catch (error) {
    console.error('❌ Error creating SEGEV DEMO:', error);
    throw error;
  }
}

// Run the SEGEV DEMO creation
if (require.main === module) {
  createSegevDemoExchange().catch(console.error);
}

module.exports = createSegevDemoExchange;