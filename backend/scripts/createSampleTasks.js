/**
 * Create Sample Tasks Script
 * Generates realistic sample tasks for testing the enhanced task management system
 */

const supabaseService = require('../services/supabase');
const enhancedTaskService = require('../services/enhancedTaskService');

async function createSampleTasks() {
  console.log('🚀 Creating sample tasks for enhanced task management system...');

  try {
    // Get first few exchanges to assign tasks to
    const exchangesResult = await supabaseService.client
      .from('exchanges')
      .select('id, exchange_number, status, client_id')
      .limit(5);

    if (exchangesResult.error) {
      console.error('Error fetching exchanges:', exchangesResult.error);
      return;
    }

    const exchanges = exchangesResult.data || [];
    console.log(`📋 Found ${exchanges.length} exchanges to assign tasks to`);

    // Get users for task assignments
    const usersResult = await supabaseService.client
      .from('people')
      .select('id, first_name, last_name, role')
      .in('role', ['admin', 'coordinator', 'assistant'])
      .limit(10);

    const users = usersResult.data || [];
    console.log(`👥 Found ${users.length} users for task assignments`);

    // Sample natural language task descriptions
    const naturalLanguageTasks = [
      'Upload property identification documents for exchange EX-2024-001 by Friday',
      'Review and approve sale agreement documents, priority high, assign to coordinator',
      'Contact client about replacement property selection deadline in 3 days',
      'Schedule property inspection with qualified intermediary next week',
      'Follow up on 45-day identification deadline - exchange approaching critical date',
      'Third party coordination needed for title company and closing agent',
      'Upload signed exchange agreement documents today',
      'Review contract amendments and get client approval asap',
      'Contact client regarding property valuation discrepancies urgent',
      'Schedule closing meeting with all parties for next Tuesday',
      'Upload replacement property deed and title documentation',
      'Review insurance documents for replacement property by tomorrow',
      'Third party coordination - coordinate with tax advisor for depreciation schedule',
      'Follow up on financing approval status with client lender',
      'Upload environmental assessment report for replacement property',
      'Review and approve final settlement statement high priority',
      'Contact qualified intermediary about fund disbursement timeline',
      'Schedule final walkthrough of replacement property',
      'Upload closing disclosure documents to exchange file',
      'Review completed exchange documentation for compliance'
    ];

    // Template-based tasks
    const templateTasks = [
      {
        title: 'Upload W-9 Tax Form',
        description: 'Upload completed W-9 tax form for qualified intermediary',
        priority: 'medium',
        category: 'document',
        templateKey: 'document_upload'
      },
      {
        title: 'Review Purchase Agreement',
        description: 'Review and approve replacement property purchase agreement',
        priority: 'high',
        category: 'review',
        templateKey: 'review_document'
      },
      {
        title: 'Client Status Update Call',
        description: 'Contact client for weekly status update on exchange progress',
        priority: 'medium',
        category: 'communication',
        templateKey: 'client_contact'
      },
      {
        title: 'Property Inspection Scheduling',
        description: 'Schedule professional property inspection for replacement property',
        priority: 'high',
        category: 'property',
        templateKey: 'property_inspection'
      },
      {
        title: 'Title Company Coordination',
        description: 'Coordinate with title company for closing date and requirements',
        priority: 'medium',
        category: 'coordination',
        templateKey: 'third_party_coordination'
      }
    ];

    let createdTasks = [];
    let createdCount = 0;

    console.log('\n📝 Creating natural language tasks...');

    // Create tasks from natural language
    for (let i = 0; i < Math.min(15, naturalLanguageTasks.length); i++) {
      const task = naturalLanguageTasks[i];
      const exchange = exchanges[i % exchanges.length];
      const assignedUser = users[Math.floor(Math.random() * users.length)];

      try {
        const context = {
          userId: assignedUser.id,
          exchangeId: exchange.id,
          assignedTo: assignedUser.id
        };

        console.log(`  Creating: "${task.substring(0, 50)}..."`);
        const result = await enhancedTaskService.createTaskFromNaturalLanguage(task, context);
        
        if (result && result.task) {
          createdTasks.push(result);
          createdCount++;
          console.log(`    ✅ Created task: ${result.task.title}`);
          
          // Add some variety to status
          if (Math.random() > 0.7) {
            const randomStatus = ['in_progress', 'completed'][Math.floor(Math.random() * 2)];
            await supabaseService.client
              .from('tasks')
              .update({ status: randomStatus.toUpperCase() })
              .eq('id', result.task.id);
          }
        }

        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`    ❌ Error creating task: ${error.message}`);
      }
    }

    console.log('\n🎯 Creating template-based tasks...');

    // Create template-based tasks
    for (let i = 0; i < templateTasks.length; i++) {
      const task = templateTasks[i];
      const exchange = exchanges[i % exchanges.length];
      const assignedUser = users[Math.floor(Math.random() * users.length)];

      try {
        // Calculate due date
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 14) + 1);

        const taskData = {
          title: task.title,
          description: task.description,
          priority: task.priority.toUpperCase(),
          status: 'PENDING',
          category: task.category,
          exchange_id: exchange.id,
          assigned_to: assignedUser.id,
          due_date: dueDate.toISOString().split('T')[0],
          created_by: assignedUser.id,
          metadata: {
            template_used: task.templateKey,
            estimated_duration: '30m',
            auto_actions: task.templateKey === 'document_upload' ? ['open_upload_modal'] : []
          }
        };

        console.log(`  Creating: "${task.title}"`);
        const result = await supabaseService.client
          .from('tasks')
          .insert([taskData])
          .select()
          .single();

        if (result.data) {
          createdCount++;
          console.log(`    ✅ Created template task: ${result.data.title}`);
        }

        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (error) {
        console.error(`    ❌ Error creating template task: ${error.message}`);
      }
    }

    console.log('\n🎲 Creating additional sample tasks with various states...');

    // Create some additional tasks with different states and priorities
    const additionalTasks = [
      {
        title: 'Urgent: Client Document Missing',
        description: 'Client has not provided required identification documents for 45-day deadline',
        priority: 'CRITICAL',
        status: 'PENDING',
        category: 'document',
        overdue: true
      },
      {
        title: 'Property Inspection Completed',
        description: 'Professional property inspection has been completed with satisfactory results',
        priority: 'HIGH',
        status: 'COMPLETED',
        category: 'property'
      },
      {
        title: 'Title Search in Progress',
        description: 'Title company is conducting title search on replacement property',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        category: 'coordination'
      },
      {
        title: 'Client Communication Follow-up',
        description: 'Follow up with client on property selection preferences and timeline',
        priority: 'LOW',
        status: 'PENDING',
        category: 'communication'
      },
      {
        title: 'Exchange Documentation Review',
        description: 'Final review of all exchange documentation before closing',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        category: 'review'
      }
    ];

    for (const task of additionalTasks) {
      const exchange = exchanges[Math.floor(Math.random() * exchanges.length)];
      const assignedUser = users[Math.floor(Math.random() * users.length)];

      try {
        const dueDate = new Date();
        if (task.overdue) {
          dueDate.setDate(dueDate.getDate() - Math.floor(Math.random() * 5) - 1);
        } else {
          dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 7) + 1);
        }

        const taskData = {
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: task.status,
          category: task.category,
          exchange_id: exchange.id,
          assigned_to: assignedUser.id,
          due_date: dueDate.toISOString().split('T')[0],
          created_by: assignedUser.id,
          completed_at: task.status === 'COMPLETED' ? new Date().toISOString() : null
        };

        const result = await supabaseService.client
          .from('tasks')
          .insert([taskData])
          .select()
          .single();

        if (result.data) {
          createdCount++;
          console.log(`  ✅ Created additional task: ${result.data.title}`);
        }

      } catch (error) {
        console.error(`  ❌ Error creating additional task: ${error.message}`);
      }
    }

    // Create some AI-generated tasks with high confidence scores
    console.log('\n🤖 Creating AI-generated sample tasks...');
    
    const aiTasks = [
      'Upload closing statement documents for exchange EX-001 with high priority',
      'Schedule coordination meeting with qualified intermediary for next week',
      'Review replacement property appraisal report due tomorrow'
    ];

    for (const aiTask of aiTasks) {
      const exchange = exchanges[Math.floor(Math.random() * exchanges.length)];
      const assignedUser = users[Math.floor(Math.random() * users.length)];

      try {
        const result = await enhancedTaskService.createTaskFromNaturalLanguage(aiTask, {
          userId: assignedUser.id,
          exchangeId: exchange.id,
          assignedTo: assignedUser.id
        });

        if (result && result.task) {
          // Update with high confidence score and additional metadata
          await supabaseService.client
            .from('tasks')
            .update({
              metadata: {
                ...result.task.metadata,
                confidence_score: 0.95,
                ai_generated: true,
                sample_task: true
              }
            })
            .eq('id', result.task.id);

          createdCount++;
          console.log(`  ✅ Created AI task: ${result.task.title}`);
        }

      } catch (error) {
        console.error(`  ❌ Error creating AI task: ${error.message}`);
      }
    }

    console.log('\n✅ Sample task creation completed!');
    console.log(`📊 Total tasks created: ${createdCount}`);

    // Show summary statistics
    const statsResult = await supabaseService.client
      .from('tasks')
      .select('status, priority, category')
      .not('id', 'is', null);

    if (statsResult.data) {
      const stats = statsResult.data;
      const statusCounts = {};
      const priorityCounts = {};
      const categoryCounts = {};

      stats.forEach(task => {
        statusCounts[task.status] = (statusCounts[task.status] || 0) + 1;
        priorityCounts[task.priority] = (priorityCounts[task.priority] || 0) + 1;
        categoryCounts[task.category] = (categoryCounts[task.category] || 0) + 1;
      });

      console.log('\n📈 Task Statistics:');
      console.log('  Status:', statusCounts);
      console.log('  Priority:', priorityCounts);
      console.log('  Category:', categoryCounts);
    }

  } catch (error) {
    console.error('❌ Error creating sample tasks:', error);
  }
}

// Run the script if called directly
if (require.main === module) {
  createSampleTasks()
    .then(() => {
      console.log('🎉 Sample task creation script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Sample task creation failed:', error);
      process.exit(1);
    });
}

module.exports = { createSampleTasks };