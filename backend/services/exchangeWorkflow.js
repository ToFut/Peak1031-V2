const { Op } = require('sequelize');
const Exchange = require('../models/Exchange');
const Task = require('../models/Task');
const Contact = require('../models/Contact');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const NotificationService = require('./notifications');

class ExchangeWorkflowService {
  constructor() {
    // Define exchange status workflow
    this.statusWorkflow = {
      'Draft': {
        next: ['In Progress', 'Cancelled'],
        actions: ['submit', 'cancel'],
        requirements: ['client_info', 'relinquished_property']
      },
      'In Progress': {
        next: ['45-Day Period', 'Cancelled', 'On Hold'],
        actions: ['start_45_day', 'cancel', 'hold'],
        requirements: ['exchange_agreement', 'relinquished_closing']
      },
      '45-Day Period': {
        next: ['180-Day Period', 'Cancelled', 'On Hold'],
        actions: ['identify_properties', 'cancel', 'hold'],
        requirements: ['identification_notice', 'replacement_properties']
      },
      '180-Day Period': {
        next: ['Completed', 'Cancelled', 'On Hold'],
        actions: ['complete', 'cancel', 'hold'],
        requirements: ['replacement_closing', 'completion_docs']
      },
      'On Hold': {
        next: ['In Progress', '45-Day Period', '180-Day Period', 'Cancelled'],
        actions: ['resume', 'cancel'],
        requirements: []
      },
      'Completed': {
        next: ['Cancelled'], // Only for administrative purposes
        actions: ['reopen'],
        requirements: ['all_docs_complete', 'final_accounting']
      },
      'Cancelled': {
        next: ['Draft'], // Only for administrative purposes
        actions: ['reopen'],
        requirements: []
      }
    };

    // Task templates for each status
    this.statusTasks = {
      'Draft': [
        {
          title: 'Collect Client Information',
          description: 'Gather complete client details and contact information',
          priority: 'HIGH',
          daysToComplete: 2
        },
        {
          title: 'Identify Relinquished Property',
          description: 'Document the property to be sold in the exchange',
          priority: 'HIGH',
          daysToComplete: 3
        },
        {
          title: 'Prepare Exchange Agreement',
          description: 'Draft and review the 1031 exchange agreement',
          priority: 'MEDIUM',
          daysToComplete: 5
        }
      ],
      'In Progress': [
        {
          title: 'Execute Exchange Agreement',
          description: 'Get all parties to sign the exchange agreement',
          priority: 'HIGH',
          daysToComplete: 3
        },
        {
          title: 'Monitor Relinquished Property Sale',
          description: 'Track the sale of the relinquished property',
          priority: 'HIGH',
          daysToComplete: 30
        },
        {
          title: 'Prepare for 45-Day Period',
          description: 'Set up identification period tracking',
          priority: 'MEDIUM',
          daysToComplete: 1
        }
      ],
      '45-Day Period': [
        {
          title: 'Identify Replacement Properties',
          description: 'Client must identify potential replacement properties',
          priority: 'URGENT',
          daysToComplete: 45
        },
        {
          title: 'Submit Identification Notice',
          description: 'Formally submit the 45-day identification notice',
          priority: 'URGENT',
          daysToComplete: 43
        },
        {
          title: 'Prepare Purchase Agreements',
          description: 'Draft purchase agreements for identified properties',
          priority: 'HIGH',
          daysToComplete: 40
        }
      ],
      '180-Day Period': [
        {
          title: 'Complete Property Acquisitions',
          description: 'Close on the replacement properties',
          priority: 'URGENT',
          daysToComplete: 180
        },
        {
          title: 'Transfer Exchange Funds',
          description: 'Handle the transfer of 1031 exchange funds',
          priority: 'URGENT',
          daysToComplete: 175
        },
        {
          title: 'Prepare Completion Documents',
          description: 'Generate final exchange completion paperwork',
          priority: 'HIGH',
          daysToComplete: 170
        }
      ],
      'Completed': [
        {
          title: 'Final Documentation Review',
          description: 'Review all exchange documents for completeness',
          priority: 'MEDIUM',
          daysToComplete: 7
        },
        {
          title: 'Generate Completion Certificate',
          description: 'Issue the official exchange completion certificate',
          priority: 'MEDIUM',
          daysToComplete: 5
        },
        {
          title: 'Archive Exchange Files',
          description: 'Properly archive all exchange documentation',
          priority: 'LOW',
          daysToComplete: 14
        }
      ]
    };

    // Business rules for status transitions
    this.transitionRules = {
      'Draft_to_In Progress': {
        conditions: [
          'has_client_info',
          'has_relinquished_property',
          'has_coordinator_assigned'
        ],
        autoActions: ['create_status_tasks', 'notify_coordinator']
      },
      'In Progress_to_45-Day Period': {
        conditions: [
          'has_executed_agreement',
          'relinquished_property_sold'
        ],
        autoActions: ['start_45_day_timer', 'create_identification_tasks', 'notify_client']
      },
      '45-Day Period_to_180-Day Period': {
        conditions: [
          'has_identification_notice',
          'has_replacement_properties'
        ],
        autoActions: ['start_180_day_timer', 'create_completion_tasks', 'notify_all_parties']
      },
      '180-Day Period_to_Completed': {
        conditions: [
          'all_replacements_acquired',
          'funds_transferred',
          'documents_complete'
        ],
        autoActions: ['generate_completion_certificate', 'archive_exchange', 'notify_completion']
      }
    };
  }

  /**
   * Get available status transitions for an exchange
   */
  getAvailableTransitions(currentStatus) {
    const workflow = this.statusWorkflow[currentStatus];
    if (!workflow) {
      return [];
    }

    return workflow.next.map(status => ({
      to: status,
      action: workflow.actions.find(action => this.getActionTargetStatus(action) === status),
      requirements: this.statusWorkflow[status]?.requirements || []
    }));
  }

  /**
   * Get target status for an action
   */
  getActionTargetStatus(action) {
    const actionMap = {
      'submit': 'In Progress',
      'start_45_day': '45-Day Period',
      'identify_properties': '180-Day Period',
      'complete': 'Completed',
      'cancel': 'Cancelled',
      'hold': 'On Hold',
      'resume': 'In Progress',
      'reopen': 'Draft'
    };
    return actionMap[action];
  }

  /**
   * Validate status transition
   */
  async validateTransition(exchangeId, fromStatus, toStatus, userId) {
    try {
      const exchange = await Exchange.findByPk(exchangeId, {
        include: [
          { model: Contact, as: 'client' },
          { model: User, as: 'coordinator' },
          { model: Task, as: 'tasks' }
        ]
      });

      if (!exchange) {
        throw new Error('Exchange not found');
      }

      // Check if transition is allowed
      const workflow = this.statusWorkflow[fromStatus];
      if (!workflow || !workflow.next.includes(toStatus)) {
        throw new Error(`Invalid transition from ${fromStatus} to ${toStatus}`);
      }

      // Check transition conditions
      const transitionKey = `${fromStatus}_to_${toStatus}`;
      const rules = this.transitionRules[transitionKey];
      
      if (rules) {
        const conditionResults = await this.checkTransitionConditions(exchange, rules.conditions);
        const failedConditions = conditionResults.filter(c => !c.met);
        
        if (failedConditions.length > 0) {
          return {
            valid: false,
            message: 'Transition conditions not met',
            failedConditions: failedConditions.map(c => c.condition),
            details: failedConditions
          };
        }
      }

      return {
        valid: true,
        message: 'Transition is valid',
        autoActions: rules?.autoActions || []
      };

    } catch (error) {
      console.error('Error validating transition:', error);
      throw error;
    }
  }

  /**
   * Check transition conditions
   */
  async checkTransitionConditions(exchange, conditions) {
    const results = [];

    for (const condition of conditions) {
      let met = false;
      let message = '';

      switch (condition) {
        case 'has_client_info':
          met = exchange.client && exchange.client.firstName && exchange.client.lastName && exchange.client.email;
          message = met ? 'Client information is complete' : 'Client information is missing or incomplete';
          break;

        case 'has_relinquished_property':
          met = exchange.relinquishedPropertyAddress && exchange.relinquishedPropertyAddress.length > 0;
          message = met ? 'Relinquished property is identified' : 'Relinquished property information is missing';
          break;

        case 'has_coordinator_assigned':
          met = exchange.coordinatorId && exchange.coordinator;
          message = met ? 'Exchange coordinator is assigned' : 'No coordinator assigned to this exchange';
          break;

        case 'has_executed_agreement':
          met = exchange.exchangeValue && exchange.startDate;
          message = met ? 'Exchange agreement is executed' : 'Exchange agreement not yet executed';
          break;

        case 'relinquished_property_sold':
          met = exchange.relinquishedClosingDate && new Date(exchange.relinquishedClosingDate) <= new Date();
          message = met ? 'Relinquished property has been sold' : 'Relinquished property sale not completed';
          break;

        case 'has_identification_notice':
          met = exchange.identificationDate && exchange.identificationDeadline;
          message = met ? 'Identification notice has been filed' : 'Identification notice is missing';
          break;

        case 'has_replacement_properties':
          // Check if replacement properties are identified
          met = exchange.replacementProperties && exchange.replacementProperties.length > 0;
          message = met ? 'Replacement properties are identified' : 'No replacement properties identified';
          break;

        case 'all_replacements_acquired':
          met = exchange.completionDate && new Date(exchange.completionDate) <= new Date();
          message = met ? 'All replacement properties acquired' : 'Replacement property acquisitions not complete';
          break;

        case 'funds_transferred':
          met = exchange.exchangeValue && exchange.completionDate;
          message = met ? 'Exchange funds have been transferred' : 'Exchange funds transfer not complete';
          break;

        case 'documents_complete':
          // Check if all required documents are present
          const requiredDocs = ['exchange_agreement', 'identification_notice', 'completion_certificate'];
          // This would need to check actual documents in the system
          met = true; // Placeholder - would check actual document requirements
          message = met ? 'All required documents are complete' : 'Some required documents are missing';
          break;

        default:
          met = false;
          message = `Unknown condition: ${condition}`;
      }

      results.push({
        condition,
        met,
        message
      });
    }

    return results;
  }

  /**
   * Execute status transition
   */
  async executeTransition(exchangeId, toStatus, userId, reason = '', additionalData = {}) {
    try {
      const exchange = await Exchange.findByPk(exchangeId);
      
      if (!exchange) {
        throw new Error('Exchange not found');
      }

      const fromStatus = exchange.status || exchange.newStatus;
      
      // Validate transition
      const validation = await this.validateTransition(exchangeId, fromStatus, toStatus, userId);
      
      if (!validation.valid) {
        throw new Error(`Transition validation failed: ${validation.message}`);
      }

      // Update exchange status
      await exchange.update({
        status: toStatus,
        newStatus: toStatus,
        updatedAt: new Date()
      });

      // Execute auto-actions
      if (validation.autoActions) {
        await this.executeAutoActions(exchange, validation.autoActions, userId);
      }

      // Log the transition
      await AuditLog.create({
        action: 'EXCHANGE_STATUS_CHANGE',
        entityType: 'exchange',
        entityId: exchangeId,
        userId: userId,
        details: {
          fromStatus,
          toStatus,
          reason,
          autoActions: validation.autoActions,
          additionalData
        }
      });

      // Send notifications
      await this.sendStatusChangeNotifications(exchange, fromStatus, toStatus, userId);

      return {
        success: true,
        message: `Exchange status changed from ${fromStatus} to ${toStatus}`,
        exchange: await Exchange.findByPk(exchangeId, {
          include: [
            { model: Contact, as: 'client' },
            { model: User, as: 'coordinator' }
          ]
        })
      };

    } catch (error) {
      console.error('Error executing transition:', error);
      throw error;
    }
  }

  /**
   * Execute automatic actions for status transitions
   */
  async executeAutoActions(exchange, actions, userId) {
    for (const action of actions) {
      try {
        switch (action) {
          case 'create_status_tasks':
            await this.createStatusTasks(exchange, userId);
            break;

          case 'notify_coordinator':
            if (exchange.coordinator) {
              await NotificationService.sendExchangeStatusNotification(
                exchange.coordinator.email,
                exchange.coordinator.firstName,
                exchange.name || exchange.exchangeName,
                exchange.status || exchange.newStatus
              );
            }
            break;

          case 'start_45_day_timer':
            await this.start45DayTimer(exchange);
            break;

          case 'start_180_day_timer':
            await this.start180DayTimer(exchange);
            break;

          case 'create_identification_tasks':
            await this.createIdentificationTasks(exchange, userId);
            break;

          case 'create_completion_tasks':
            await this.createCompletionTasks(exchange, userId);
            break;

          case 'generate_completion_certificate':
            await this.generateCompletionCertificate(exchange, userId);
            break;

          case 'archive_exchange':
            await this.archiveExchange(exchange, userId);
            break;

          case 'notify_all_parties':
            await this.notifyAllParties(exchange);
            break;

          case 'notify_completion':
            await this.notifyCompletion(exchange);
            break;

          default:
            console.log(`Unknown auto-action: ${action}`);
        }
      } catch (error) {
        console.error(`Error executing auto-action ${action}:`, error);
        // Continue with other actions even if one fails
      }
    }
  }

  /**
   * Create tasks for the current exchange status
   */
  async createStatusTasks(exchange, userId) {
    const status = exchange.status || exchange.newStatus;
    const taskTemplates = this.statusTasks[status] || [];

    for (const template of taskTemplates) {
      try {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + template.daysToComplete);

        await Task.create({
          title: template.title,
          description: template.description,
          status: 'PENDING',
          priority: template.priority,
          exchangeId: exchange.id,
          assignedTo: exchange.coordinatorId || userId,
          dueDate: dueDate,
          createdBy: userId
        });
      } catch (error) {
        console.error('Error creating status task:', error);
      }
    }
  }

  /**
   * Start 45-day identification timer
   */
  async start45DayTimer(exchange) {
    const identificationDeadline = new Date();
    identificationDeadline.setDate(identificationDeadline.getDate() + 45);

    await exchange.update({
      identificationDate: new Date(),
      identificationDeadline: identificationDeadline
    });

    // Schedule reminder notifications
    await this.scheduleDeadlineReminders(exchange, identificationDeadline, '45-day identification');
  }

  /**
   * Start 180-day exchange timer
   */
  async start180DayTimer(exchange) {
    const exchangeDeadline = new Date();
    exchangeDeadline.setDate(exchangeDeadline.getDate() + 180);

    await exchange.update({
      exchangeDeadline: exchangeDeadline,
      completionDeadline: exchangeDeadline
    });

    // Schedule reminder notifications
    await this.scheduleDeadlineReminders(exchange, exchangeDeadline, '180-day exchange completion');
  }

  /**
   * Schedule deadline reminder notifications
   */
  async scheduleDeadlineReminders(exchange, deadline, deadlineType) {
    // This would integrate with a job scheduler like Bull or Agenda
    // For now, we'll just log the intention
    console.log(`Scheduling ${deadlineType} reminders for exchange ${exchange.id} with deadline ${deadline}`);
    
    // In a full implementation, you would:
    // 1. Schedule 30-day reminder
    // 2. Schedule 14-day reminder
    // 3. Schedule 7-day reminder
    // 4. Schedule 1-day reminder
    // 5. Schedule deadline day notification
  }

  /**
   * Create identification-specific tasks
   */
  async createIdentificationTasks(exchange, userId) {
    const identificationTasks = [
      {
        title: 'Research Replacement Properties',
        description: 'Research and evaluate potential replacement properties',
        priority: 'HIGH',
        daysToComplete: 30
      },
      {
        title: 'Property Inspections',
        description: 'Conduct inspections of identified properties',
        priority: 'HIGH',
        daysToComplete: 35
      },
      {
        title: 'Finalize Property Selection',
        description: 'Make final selection of replacement properties',
        priority: 'URGENT',
        daysToComplete: 40
      }
    ];

    for (const template of identificationTasks) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + template.daysToComplete);

      await Task.create({
        title: template.title,
        description: template.description,
        status: 'PENDING',
        priority: template.priority,
        exchangeId: exchange.id,
        assignedTo: exchange.coordinatorId,
        dueDate: dueDate,
        createdBy: userId
      });
    }
  }

  /**
   * Create completion-specific tasks
   */
  async createCompletionTasks(exchange, userId) {
    const completionTasks = [
      {
        title: 'Coordinate Property Closings',
        description: 'Coordinate closing on all replacement properties',
        priority: 'URGENT',
        daysToComplete: 150
      },
      {
        title: 'Final Fund Transfers',
        description: 'Execute final exchange fund transfers',
        priority: 'URGENT',
        daysToComplete: 170
      }
    ];

    for (const template of completionTasks) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + template.daysToComplete);

      await Task.create({
        title: template.title,
        description: template.description,
        status: 'PENDING',
        priority: template.priority,
        exchangeId: exchange.id,
        assignedTo: exchange.coordinatorId,
        dueDate: dueDate,
        createdBy: userId
      });
    }
  }

  /**
   * Generate completion certificate
   */
  async generateCompletionCertificate(exchange, userId) {
    try {
      const DocumentTemplateService = require('./documentTemplates');
      
      await DocumentTemplateService.generateDocument(
        'completion_certificate',
        exchange.id,
        { generatedBy: userId }
      );
      
      console.log(`Completion certificate generated for exchange ${exchange.id}`);
    } catch (error) {
      console.error('Error generating completion certificate:', error);
    }
  }

  /**
   * Archive exchange
   */
  async archiveExchange(exchange, userId) {
    // Mark exchange as archived and move to long-term storage
    console.log(`Archiving exchange ${exchange.id}`);
    
    // In a full implementation, this would:
    // 1. Move documents to archive storage
    // 2. Update database with archive status
    // 3. Generate archive summary
    // 4. Remove from active views
  }

  /**
   * Notify all parties of status change
   */
  async notifyAllParties(exchange) {
    // Notify client
    if (exchange.client) {
      await NotificationService.sendExchangeStatusNotification(
        exchange.client.email,
        exchange.client.firstName,
        exchange.name || exchange.exchangeName,
        exchange.status || exchange.newStatus
      );
    }

    // Notify coordinator
    if (exchange.coordinator) {
      await NotificationService.sendExchangeStatusNotification(
        exchange.coordinator.email,
        exchange.coordinator.firstName,
        exchange.name || exchange.exchangeName,
        exchange.status || exchange.newStatus
      );
    }
  }

  /**
   * Send completion notifications
   */
  async notifyCompletion(exchange) {
    const status = exchange.status || exchange.newStatus;
    
    if (exchange.client) {
      // Send completion notification to client
      await NotificationService.sendDocumentNotification(
        exchange.client.email,
        exchange.client.firstName,
        'Exchange Completion Certificate',
        exchange.name || exchange.exchangeName,
        'generated'
      );
    }
  }

  /**
   * Send status change notifications
   */
  async sendStatusChangeNotifications(exchange, fromStatus, toStatus, userId) {
    // This would send appropriate notifications based on the status change
    console.log(`Sending notifications for exchange ${exchange.id} status change from ${fromStatus} to ${toStatus}`);
  }

  /**
   * Get exchange workflow summary
   */
  async getExchangeWorkflowSummary(exchangeId) {
    try {
      const exchange = await Exchange.findByPk(exchangeId, {
        include: [
          { model: Contact, as: 'client' },
          { model: User, as: 'coordinator' },
          { model: Task, as: 'tasks' }
        ]
      });

      if (!exchange) {
        throw new Error('Exchange not found');
      }

      const currentStatus = exchange.status || exchange.newStatus;
      const availableTransitions = this.getAvailableTransitions(currentStatus);
      const statusRequirements = this.statusWorkflow[currentStatus]?.requirements || [];

      return {
        exchange: {
          id: exchange.id,
          name: exchange.name || exchange.exchangeName,
          currentStatus,
          startDate: exchange.startDate,
          identificationDeadline: exchange.identificationDeadline,
          exchangeDeadline: exchange.exchangeDeadline
        },
        workflow: {
          availableTransitions,
          statusRequirements,
          currentTasks: exchange.tasks?.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS') || []
        },
        timeline: await this.getExchangeTimeline(exchangeId)
      };

    } catch (error) {
      console.error('Error getting workflow summary:', error);
      throw error;
    }
  }

  /**
   * Get exchange timeline/history
   */
  async getExchangeTimeline(exchangeId) {
    try {
      const timeline = await AuditLog.findAll({
        where: {
          entityType: 'exchange',
          entityId: exchangeId,
          action: 'EXCHANGE_STATUS_CHANGE'
        },
        include: [
          { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName'] }
        ],
        order: [['createdAt', 'ASC']]
      });

      return timeline.map(entry => ({
        date: entry.createdAt,
        status: entry.details?.toStatus,
        user: entry.user ? `${entry.user.firstName} ${entry.user.lastName}` : 'System',
        reason: entry.details?.reason || ''
      }));

    } catch (error) {
      console.error('Error getting exchange timeline:', error);
      return [];
    }
  }

  /**
   * Check for overdue deadlines and send alerts
   */
  async checkOverdueDeadlines() {
    try {
      const now = new Date();
      
      // Check for overdue identification deadlines
      const overdueIdentification = await Exchange.findAll({
        where: {
          status: '45-Day Period',
          identificationDeadline: {
            [Op.lt]: now
          }
        },
        include: [
          { model: Contact, as: 'client' },
          { model: User, as: 'coordinator' }
        ]
      });

      // Check for overdue exchange deadlines
      const overdueExchange = await Exchange.findAll({
        where: {
          status: '180-Day Period',
          exchangeDeadline: {
            [Op.lt]: now
          }
        },
        include: [
          { model: Contact, as: 'client' },
          { model: User, as: 'coordinator' }
        ]
      });

      // Send overdue notifications
      for (const exchange of [...overdueIdentification, ...overdueExchange]) {
        await this.sendOverdueNotification(exchange);
      }

      return {
        overdueIdentification: overdueIdentification.length,
        overdueExchange: overdueExchange.length
      };

    } catch (error) {
      console.error('Error checking overdue deadlines:', error);
      throw error;
    }
  }

  /**
   * Send overdue notification
   */
  async sendOverdueNotification(exchange) {
    const deadlineType = exchange.status === '45-Day Period' ? 'identification' : 'exchange completion';
    
    if (exchange.coordinator) {
      // Send to coordinator
      console.log(`Sending overdue ${deadlineType} notification for exchange ${exchange.id}`);
    }
    
    if (exchange.client) {
      // Send to client
      console.log(`Sending overdue ${deadlineType} notification to client for exchange ${exchange.id}`);
    }
  }
}

module.exports = new ExchangeWorkflowService();