/**
 * Enhanced Task Service with Natural Language Processing
 * Integrates with OSS LLM for smart task creation, auto-completion, and chat integration
 */

const supabaseService = require('./supabase');
const gptQueryService = require('./gptQueryService');

class EnhancedTaskService {
  constructor() {
    this.taskTemplates = {
      'document_upload': {
        title: 'Upload Document',
        description: 'Upload required document for exchange',
        category: 'document',
        estimatedDuration: '15m',
        requiredFields: ['document_type', 'exchange_id'],
        autoActions: ['open_upload_modal'],
        instructions: 'Please upload the following document type: {document_type} for exchange {exchange_number}'
      },
      'review_document': {
        title: 'Review Document',
        description: 'Review and approve uploaded document',
        category: 'review',
        estimatedDuration: '30m',
        requiredFields: ['document_id', 'reviewer_id'],
        autoActions: ['open_document_viewer'],
        instructions: 'Please review the document and provide approval or feedback'
      },
      'client_contact': {
        title: 'Contact Client',
        description: 'Make contact with client for information or updates',
        category: 'communication',
        estimatedDuration: '20m',
        requiredFields: ['client_id', 'contact_reason'],
        autoActions: ['open_message_modal'],
        instructions: 'Contact client regarding: {contact_reason}'
      },
      'property_inspection': {
        title: 'Schedule Property Inspection',
        description: 'Schedule inspection for replacement property',
        category: 'property',
        estimatedDuration: '60m',
        requiredFields: ['property_address', 'inspector_id'],
        autoActions: ['open_calendar_modal'],
        instructions: 'Schedule property inspection at: {property_address}'
      },
      'deadline_follow_up': {
        title: 'Deadline Follow-up',
        description: 'Follow up on approaching deadlines',
        category: 'deadline',
        estimatedDuration: '30m',
        requiredFields: ['deadline_type', 'days_remaining'],
        autoActions: ['highlight_deadline'],
        instructions: 'Follow up on {deadline_type} deadline - {days_remaining} days remaining'
      },
      'third_party_coordination': {
        title: 'Third Party Coordination',
        description: 'Coordinate with third party service providers',
        category: 'coordination',
        estimatedDuration: '45m',
        requiredFields: ['third_party_type', 'coordination_reason'],
        autoActions: ['open_contact_list'],
        instructions: 'Coordinate with {third_party_type} regarding: {coordination_reason}'
      }
    };

    this.taskPriorities = {
      'critical': { level: 1, color: 'red', label: 'Critical' },
      'high': { level: 2, color: 'orange', label: 'High' },
      'medium': { level: 3, color: 'yellow', label: 'Medium' },
      'low': { level: 4, color: 'green', label: 'Low' }
    };

    this.taskStatuses = {
      'pending': { label: 'Pending', color: 'gray' },
      'in_progress': { label: 'In Progress', color: 'blue' },
      'completed': { label: 'Completed', color: 'green' },
      'cancelled': { label: 'Cancelled', color: 'red' }
    };
  }

  /**
   * Parse natural language to create tasks
   */
  async parseNaturalLanguageTask(naturalText, context = {}) {
    try {
      console.log(`🤖 Parsing natural language task: "${naturalText}"`);
      
      // Get available users and exchanges for better parsing
      const { data: users } = await supabaseService.client
        .from('people')
        .select('id, first_name, last_name, email, role')
        .not('email', 'is', null);
      
      const { data: exchanges } = await supabaseService.client
        .from('exchanges')
        .select('id, exchange_number, status, client_id')
        .limit(50);

      const lowerText = naturalText.toLowerCase();
      const parsedTask = {
        originalText: naturalText,
        title: '',
        description: '',
        category: 'general',
        priority: 'medium',
        templateKey: null,
        extractedData: {
          availableUsers: users || [],
          availableExchanges: exchanges || [],
          needsUserSelection: false,
          needsExchangeSelection: false
        },
        suggestedAssignee: null,
        suggestedDueDate: null,
        autoActions: [],
        confidence: 0
      };

      // Extract exchange information
      const exchangeMatches = naturalText.match(/(exchange|ex|exch)\s*#?(\w+)/i);
      if (exchangeMatches) {
        parsedTask.extractedData.exchange_number = exchangeMatches[2];
      }

      // Extract user assignments
      const assignMatches = naturalText.match(/assign(?:ed)?\s+to\s+(\w+)/i);
      if (assignMatches) {
        parsedTask.suggestedAssignee = assignMatches[1];
      }

      // Extract due dates
      const dueDateMatches = naturalText.match(/(?:due|by|before)\s+(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}-\d{1,2}-\d{2,4}|today|tomorrow|next week)/i);
      if (dueDateMatches) {
        parsedTask.suggestedDueDate = this.parseDateString(dueDateMatches[1]);
      }

      // Extract priority
      if (lowerText.includes('urgent') || lowerText.includes('asap') || lowerText.includes('critical')) {
        parsedTask.priority = 'critical';
      } else if (lowerText.includes('high priority') || lowerText.includes('important')) {
        parsedTask.priority = 'high';
      } else if (lowerText.includes('low priority') || lowerText.includes('when possible')) {
        parsedTask.priority = 'low';
      }

      // Template matching
      if (lowerText.includes('upload') && lowerText.includes('document')) {
        parsedTask.templateKey = 'document_upload';
        parsedTask.category = 'document';
        parsedTask.title = 'Upload Document';
        parsedTask.confidence = 0.9;
        
        // Extract document type
        const docTypeMatches = naturalText.match(/upload\s+(\w+\s+\w+|\w+)\s+(?:document|doc)/i);
        if (docTypeMatches) {
          parsedTask.extractedData.document_type = docTypeMatches[1];
        }
      }
      
      else if (lowerText.includes('review') && lowerText.includes('document')) {
        parsedTask.templateKey = 'review_document';
        parsedTask.category = 'review';
        parsedTask.title = 'Review Document';
        parsedTask.confidence = 0.85;
      }
      
      else if (lowerText.includes('contact') && lowerText.includes('client')) {
        parsedTask.templateKey = 'client_contact';
        parsedTask.category = 'communication';
        parsedTask.title = 'Contact Client';
        parsedTask.confidence = 0.8;
        
        // Extract contact reason
        const reasonMatches = naturalText.match(/(?:about|regarding|for)\s+(.+?)(?:\s+(?:by|due|assign)|$)/i);
        if (reasonMatches) {
          parsedTask.extractedData.contact_reason = reasonMatches[1].trim();
        }
      }
      
      else if (lowerText.includes('inspect') || lowerText.includes('schedule') && lowerText.includes('property')) {
        parsedTask.templateKey = 'property_inspection';
        parsedTask.category = 'property';
        parsedTask.title = 'Schedule Property Inspection';
        parsedTask.confidence = 0.8;
      }
      
      else if (lowerText.includes('deadline') || lowerText.includes('follow up')) {
        parsedTask.templateKey = 'deadline_follow_up';
        parsedTask.category = 'deadline';
        parsedTask.title = 'Deadline Follow-up';
        parsedTask.confidence = 0.75;
      }
      
      else if (lowerText.includes('third party') || lowerText.includes('coordinate')) {
        parsedTask.templateKey = 'third_party_coordination';
        parsedTask.category = 'coordination';
        parsedTask.title = 'Third Party Coordination';
        parsedTask.confidence = 0.7;
      }
      
      else {
        // Generic task creation
        parsedTask.title = naturalText.substring(0, 50) + (naturalText.length > 50 ? '...' : '');
        parsedTask.description = naturalText;
        parsedTask.confidence = 0.5;
      }

      // Enhanced user assignment parsing
      const userPatterns = [
        /(?:assign to|assigned to|for|to user|to client|for user|for client)\s+([a-zA-Z\s@\.\-]+)/i,
        /(?:user|client|person)[:,\s]+([a-zA-Z@\.\-]+)/i,
        /([a-zA-Z]+@[a-zA-Z\.\-]+)/i, // Email patterns
        /@ADD\s+([\w\s@\.\-]+)/i // Special @ADD command
      ];

      let foundUser = null;
      for (const pattern of userPatterns) {
        const matches = naturalText.match(pattern);
        if (matches) {
          const userInfo = matches[1].trim();
          
          // Try to find user by email first
          if (userInfo.includes('@')) {
            foundUser = parsedTask.extractedData.availableUsers?.find(u => 
              u.email?.toLowerCase().includes(userInfo.toLowerCase())
            );
            if (foundUser) {
              parsedTask.suggestedAssignee = foundUser.id;
              parsedTask.extractedData.assigneeInfo = {
                id: foundUser.id,
                name: `${foundUser.first_name} ${foundUser.last_name}`.trim() || foundUser.email,
                email: foundUser.email,
                role: foundUser.role
              };
              parsedTask.confidence += 0.3;
              break;
            }
          }
          
          // Try to find by name
          const nameParts = userInfo.split(/\s+/);
          foundUser = parsedTask.extractedData.availableUsers?.find(u => {
            const fullName = `${u.first_name} ${u.last_name}`.toLowerCase();
            return nameParts.some(part => fullName.includes(part.toLowerCase()));
          });
          
          if (foundUser) {
            parsedTask.suggestedAssignee = foundUser.id;
            parsedTask.extractedData.assigneeInfo = {
              id: foundUser.id,
              name: `${foundUser.first_name} ${foundUser.last_name}`.trim() || foundUser.email,
              email: foundUser.email,
              role: foundUser.role
            };
            parsedTask.confidence += 0.3;
            break;
          } else {
            // Mark that we need user selection
            parsedTask.extractedData.needsUserSelection = true;
            parsedTask.extractedData.userSearchTerm = userInfo;
            parsedTask.confidence -= 0.1;
          }
        }
      }

      // Enhanced exchange detection and lifecycle context
      let foundExchange = null;
      const exchangePatterns = [
        /(exchange|ex|exch)[\s#]*([a-zA-Z0-9\-]+)/i,
        /EX-(\d{4}-\d{3})/i,
        /EX-(\d+)/i
      ];

      for (const pattern of exchangePatterns) {
        const matches = naturalText.match(pattern);
        if (matches) {
          const exchangeRef = matches[2] || matches[1];
          foundExchange = parsedTask.extractedData.availableExchanges?.find(ex => 
            ex.exchange_number?.toLowerCase().includes(exchangeRef.toLowerCase()) ||
            ex.id === exchangeRef
          );
          
          if (foundExchange) {
            parsedTask.extractedData.exchangeInfo = {
              id: foundExchange.id,
              number: foundExchange.exchange_number,
              status: foundExchange.status,
              lifecycle_stage: this.getExchangeLifecycleStage(foundExchange)
            };
            parsedTask.confidence += 0.2;
            
            // Add lifecycle-specific suggestions
            if (foundExchange.status === 'active') {
              parsedTask.extractedData.lifecycleSuggestions = this.getLifecycleSuggestions(foundExchange.status);
            }
            break;
          } else {
            parsedTask.extractedData.needsExchangeSelection = true;
            parsedTask.extractedData.exchangeSearchTerm = exchangeRef;
          }
        }
      }

      // Apply template if found
      if (parsedTask.templateKey && this.taskTemplates[parsedTask.templateKey]) {
        const template = this.taskTemplates[parsedTask.templateKey];
        parsedTask.description = template.description;
        parsedTask.autoActions = template.autoActions;
        parsedTask.estimatedDuration = template.estimatedDuration;
        parsedTask.instructions = this.fillTemplate(template.instructions, parsedTask.extractedData);
      }

      // Enhance title based on parsed information
      if (!parsedTask.title || parsedTask.title.includes('...')) {
        parsedTask.title = this.generateSmartTitle(parsedTask);
      }

      return parsedTask;

    } catch (error) {
      console.error('Natural language parsing error:', error);
      throw new Error(`Failed to parse natural language task: ${error.message}`);
    }
  }

  /**
   * Create task from parsed natural language
   */
  async createTaskFromNaturalLanguage(naturalText, context = {}) {
    try {
      const parsedTask = await this.parseNaturalLanguageTask(naturalText, context);
      
      // Validate and get exchange ID if exchange number provided
      let exchangeId = context.exchangeId;
      if (parsedTask.extractedData.exchange_number && !exchangeId) {
        const exchange = await this.findExchangeByNumber(parsedTask.extractedData.exchange_number);
        if (exchange) {
          exchangeId = exchange.id;
        }
      }

      // Get assignee ID if suggested
      let assignedTo = context.assignedTo;
      if (parsedTask.suggestedAssignee && !assignedTo) {
        const user = await this.findUserByName(parsedTask.suggestedAssignee);
        if (user) {
          assignedTo = user.id;
        }
      }

      // Create the task
      const taskData = {
        title: parsedTask.title,
        description: parsedTask.description,
        priority: parsedTask.priority,
        status: 'pending',
        category: parsedTask.category,
        exchange_id: exchangeId,
        assigned_to: assignedTo,
        due_date: parsedTask.suggestedDueDate,
        created_by: context.userId,
        metadata: {
          natural_language_source: naturalText,
          parsed_data: parsedTask.extractedData,
          template_used: parsedTask.templateKey,
          confidence_score: parsedTask.confidence,
          auto_actions: parsedTask.autoActions,
          estimated_duration: parsedTask.estimatedDuration
        }
      };

      const result = await supabaseService.client
        .from('tasks')
        .insert([taskData])
        .select()
        .single();

      if (result.error) {
        throw new Error(`Failed to create task: ${result.error.message}`);
      }

      console.log('✅ Task created from natural language:', result.data);
      return {
        task: result.data,
        parsedData: parsedTask,
        autoActions: parsedTask.autoActions
      };

    } catch (error) {
      console.error('Task creation from natural language error:', error);
      throw error;
    }
  }

  /**
   * Generate task suggestions based on context
   */
  async generateTaskSuggestions(context = {}) {
    try {
      const suggestions = [];

      // Get exchange context if provided
      if (context.exchangeId) {
        const exchange = await this.getExchangeById(context.exchangeId);
        if (exchange) {
          // Suggest deadline-based tasks
          const now = new Date();
          const identificationDeadline = new Date(exchange.identification_deadline);
          const exchangeDeadline = new Date(exchange.exchange_deadline);

          if (identificationDeadline > now) {
            const daysToId = Math.ceil((identificationDeadline - now) / (1000 * 60 * 60 * 24));
            if (daysToId <= 30) {
              suggestions.push({
                title: `Follow up on 45-day deadline`,
                description: `Exchange ${exchange.exchange_number} has ${daysToId} days until identification deadline`,
                priority: daysToId <= 7 ? 'critical' : 'high',
                category: 'deadline',
                templateKey: 'deadline_follow_up'
              });
            }
          }

          if (exchangeDeadline > now) {
            const daysToEx = Math.ceil((exchangeDeadline - now) / (1000 * 60 * 60 * 24));
            if (daysToEx <= 60) {
              suggestions.push({
                title: `Follow up on 180-day deadline`,
                description: `Exchange ${exchange.exchange_number} has ${daysToEx} days until exchange deadline`,
                priority: daysToEx <= 30 ? 'critical' : 'high',
                category: 'deadline',
                templateKey: 'deadline_follow_up'
              });
            }
          }

          // Suggest document upload tasks based on exchange status
          if (exchange.status === 'active' || exchange.status === '45D') {
            suggestions.push({
              title: 'Upload identification documents',
              description: `Upload property identification documents for exchange ${exchange.exchange_number}`,
              priority: 'high',
              category: 'document',
              templateKey: 'document_upload'
            });
          }
        }
      }

      // Add general suggestions
      suggestions.push(
        {
          title: 'Upload exchange agreement',
          description: 'Upload signed exchange agreement document',
          priority: 'medium',
          category: 'document',
          templateKey: 'document_upload'
        },
        {
          title: 'Contact client for update',
          description: 'Reach out to client for status update',
          priority: 'medium',
          category: 'communication',
          templateKey: 'client_contact'
        },
        {
          title: 'Schedule property inspection',
          description: 'Coordinate property inspection with qualified intermediary',
          priority: 'medium',
          category: 'property',
          templateKey: 'property_inspection'
        }
      );

      return suggestions;

    } catch (error) {
      console.error('Task suggestions generation error:', error);
      return [];
    }
  }

  /**
   * Get auto-complete actions for task
   */
  getAutoCompleteActions(task) {
    const actions = [];

    if (task.metadata?.auto_actions) {
      for (const actionType of task.metadata.auto_actions) {
        switch (actionType) {
          case 'open_upload_modal':
            actions.push({
              type: 'modal',
              component: 'DocumentUploadModal',
              props: {
                exchange_id: task.exchange_id,
                document_type: task.metadata?.parsed_data?.document_type,
                auto_prefill: true
              }
            });
            break;

          case 'open_document_viewer':
            actions.push({
              type: 'modal',
              component: 'DocumentViewerModal',
              props: {
                document_id: task.metadata?.parsed_data?.document_id,
                review_mode: true
              }
            });
            break;

          case 'open_message_modal':
            actions.push({
              type: 'modal',
              component: 'MessageModal',
              props: {
                recipient_id: task.metadata?.parsed_data?.client_id,
                preset_message: task.metadata?.parsed_data?.contact_reason,
                exchange_id: task.exchange_id
              }
            });
            break;

          case 'open_calendar_modal':
            actions.push({
              type: 'modal',
              component: 'CalendarModal',
              props: {
                event_type: 'property_inspection',
                suggested_duration: task.metadata?.estimated_duration
              }
            });
            break;

          case 'highlight_deadline':
            actions.push({
              type: 'highlight',
              component: 'DeadlineHighlight',
              props: {
                exchange_id: task.exchange_id,
                deadline_type: task.metadata?.parsed_data?.deadline_type
              }
            });
            break;

          case 'open_contact_list':
            actions.push({
              type: 'modal',
              component: 'ContactListModal',
              props: {
                filter_type: task.metadata?.parsed_data?.third_party_type,
                exchange_id: task.exchange_id
              }
            });
            break;
        }
      }
    }

    return actions;
  }

  /**
   * Bulk task operations
   */
  async bulkCreateTasks(tasksData, context = {}) {
    try {
      const results = [];
      
      for (const taskData of tasksData) {
        if (typeof taskData === 'string') {
          // Natural language task
          const result = await this.createTaskFromNaturalLanguage(taskData, context);
          results.push(result);
        } else {
          // Structured task data
          const result = await supabaseService.client
            .from('tasks')
            .insert([{ ...taskData, created_by: context.userId }])
            .select()
            .single();

          if (result.error) {
            console.error('Bulk task creation error:', result.error);
          } else {
            results.push({ task: result.data });
          }
        }
      }

      return results;

    } catch (error) {
      console.error('Bulk task creation error:', error);
      throw error;
    }
  }

  // Helper methods
  parseDateString(dateStr) {
    const today = new Date();
    const lowerStr = dateStr.toLowerCase();

    if (lowerStr === 'today') {
      return today.toISOString().split('T')[0];
    } else if (lowerStr === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    } else if (lowerStr === 'next week') {
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      return nextWeek.toISOString().split('T')[0];
    } else {
      // Try to parse date formats
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0];
    }
  }

  fillTemplate(template, data) {
    let filled = template;
    for (const [key, value] of Object.entries(data)) {
      filled = filled.replace(new RegExp(`{${key}}`, 'g'), value);
    }
    return filled;
  }

  async findExchangeByNumber(exchangeNumber) {
    const result = await supabaseService.client
      .from('exchanges')
      .select('id, exchange_number')
      .ilike('exchange_number', `%${exchangeNumber}%`)
      .limit(1)
      .single();

    return result.data;
  }

  async findUserByName(name) {
    const result = await supabaseService.client
      .from('users')
      .select('id, first_name, last_name')
      .or(`first_name.ilike.%${name}%,last_name.ilike.%${name}%`)
      .limit(1)
      .single();

    return result.data;
  }

  async getExchangeById(exchangeId) {
    const result = await supabaseService.client
      .from('exchanges')
      .select('*')
      .eq('id', exchangeId)
      .single();

    return result.data;
  }

  /**
   * Get task templates
   */
  getTaskTemplates() {
    return this.taskTemplates;
  }

  /**
   * Process chat message for task extraction
   */
  async extractTasksFromChatMessage(message, context = {}) {
    try {
      const taskKeywords = [
        'need to', 'should', 'must', 'have to', 'remember to',
        'upload', 'review', 'contact', 'schedule', 'follow up',
        'task:', 'todo:', 'action:', 'remind me'
      ];

      const lowerMessage = message.toLowerCase();
      const containsTaskKeywords = taskKeywords.some(keyword => lowerMessage.includes(keyword));

      if (!containsTaskKeywords) {
        return null;
      }

      console.log(`🔍 Extracting task from chat message: "${message}"`);

      // Extract potential tasks from message
      const sentences = message.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const potentialTasks = [];

      for (const sentence of sentences) {
        const trimmed = sentence.trim();
        if (taskKeywords.some(keyword => trimmed.toLowerCase().includes(keyword))) {
          potentialTasks.push(trimmed);
        }
      }

      const results = [];
      for (const taskText of potentialTasks) {
        try {
          const result = await this.createTaskFromNaturalLanguage(taskText, context);
          results.push(result);
        } catch (error) {
          console.error('Error creating task from chat message:', error);
        }
      }

      return results.length > 0 ? results : null;

    } catch (error) {
      console.error('Chat message task extraction error:', error);
      return null;
    }
  }

  /**
   * Get exchange lifecycle stage for context
   */
  getExchangeLifecycleStage(exchange) {
    const stages = {
      'active': 'In Progress',
      'completed': 'Completed', 
      'pending': 'Pending Start',
      'cancelled': 'Cancelled'
    };
    return stages[exchange.status] || 'Unknown';
  }

  /**
   * Get lifecycle-specific task suggestions
   */
  getLifecycleSuggestions(status) {
    const suggestions = {
      'active': [
        'Upload property identification documents',
        'Review and approve contracts',
        'Schedule property inspections',
        'Coordinate with qualified intermediary',
        'Follow up on financing approvals'
      ],
      'pending': [
        'Gather initial client documentation',
        'Set up exchange timeline', 
        'Assign team members',
        'Schedule kickoff meeting'
      ],
      'completed': [
        'Archive exchange documents',
        'Send completion confirmation',
        'Schedule follow-up meeting'
      ]
    };
    return suggestions[status] || [];
  }

  /**
   * Generate smart title based on parsed information
   */
  generateSmartTitle(parsedTask) {
    const { originalText, extractedData } = parsedTask;
    
    // If we have specific user and exchange info
    if (extractedData.assigneeInfo && extractedData.exchangeInfo) {
      const action = this.extractAction(originalText);
      return `${action} for ${extractedData.exchangeInfo.number} (${extractedData.assigneeInfo.name})`;
    }
    
    // If we have user info
    if (extractedData.assigneeInfo) {
      const action = this.extractAction(originalText);
      return `${action} - Assigned to ${extractedData.assigneeInfo.name}`;
    }
    
    // If we have exchange info
    if (extractedData.exchangeInfo) {
      const action = this.extractAction(originalText);
      return `${action} for ${extractedData.exchangeInfo.number}`;
    }
    
    // Default: clean up the original text
    return this.extractAction(originalText);
  }

  /**
   * Extract action from natural language text
   */
  extractAction(text) {
    // Remove common prefixes and suffixes
    let cleaned = text
      .replace(/@ADD\s+[\w\s@\.\-]+/gi, '') // Remove @ADD commands
      .replace(/assign to\s+[\w\s@\.\-]+/gi, '') // Remove assignment parts
      .replace(/for\s+[\w\s@\.\-]+@[\w\.\-]+/gi, '') // Remove email assignments
      .replace(/priority:\s*\w+/gi, '') // Remove priority mentions
      .replace(/due:\s*[\w\s]+/gi, '') // Remove due date mentions
      .trim();
    
    // Capitalize first letter
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    
    // Truncate if too long
    if (cleaned.length > 60) {
      cleaned = cleaned.substring(0, 57) + '...';
    }
    
    return cleaned || 'New Task';
  }
}

module.exports = new EnhancedTaskService();