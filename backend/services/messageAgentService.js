/**
 * Message Agent Service
 * Handles special message commands like @TASK and @ADD
 */

const taskParsingService = require('./taskParsingService');
const databaseService = require('./database');

class MessageAgentService {
  
  /**
   * Process message for special commands
   * @param {string} content - Message content
   * @param {string} exchangeId - Exchange ID
   * @param {string} userId - User ID who sent the message
   * @param {Object} messageRecord - Created message record
   * @returns {Object} - Processing results
   */
  async processMessage(content, exchangeId, userId, messageRecord) {
    const results = {
      taskCreated: null,
      contactAdded: null,
      errors: []
    };

    // Handle @TASK commands
    if (content.includes('@TASK')) {
      try {
        console.log('🤖 @TASK detected, processing...');
        const taskResult = await this.handleTaskCommand(content, exchangeId, userId, messageRecord);
        results.taskCreated = taskResult;
      } catch (error) {
        console.error('❌ Error processing @TASK:', error);
        results.errors.push(`@TASK error: ${error.message}`);
      }
    }

    // Handle @ADD commands for mobile numbers
    if (content.includes('@ADD')) {
      try {
        console.log('📱 @ADD detected, processing...');
        const addResult = await this.handleAddCommand(content, exchangeId, userId, messageRecord);
        results.contactAdded = addResult;
      } catch (error) {
        console.error('❌ Error processing @ADD:', error);
        results.errors.push(`@ADD error: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Handle @TASK command
   * @param {string} content - Message content
   * @param {string} exchangeId - Exchange ID
   * @param {string} userId - User ID
   * @param {Object} messageRecord - Message record
   * @returns {Object|null} - Created task or null
   */
  async handleTaskCommand(content, exchangeId, userId, messageRecord) {
    const taskData = taskParsingService.parseTaskFromMessage(content, exchangeId, userId);
    
    if (!taskData) {
      console.log('⚠️ No valid task data parsed from @TASK command');
      return null;
    }

    const validation = taskParsingService.validateTask(taskData);
    if (!validation.isValid) {
      console.warn('⚠️ Invalid task data:', validation.errors);
      return null;
    }

    // Prepare task for database (without created_by to avoid foreign key issues)
    const taskForDb = {
      title: taskData.title,
      description: taskData.description,
      status: taskData.status,
      priority: taskData.priority,
      exchange_id: taskData.exchange_id,
      assigned_to: taskData.assigned_to,
      due_date: taskData.due_date
      // Skip created_by to avoid foreign key constraint issues
    };

    const createdTask = await databaseService.createTask(taskForDb);
    console.log('✅ Task auto-created from @TASK:', createdTask.id);
    
    return createdTask;
  }

  /**
   * Handle @ADD command for mobile numbers
   * @param {string} content - Message content
   * @param {string} exchangeId - Exchange ID
   * @param {string} userId - User ID
   * @param {Object} messageRecord - Message record
   * @returns {Object|null} - Created/updated contact or null
   */
  async handleAddCommand(content, exchangeId, userId, messageRecord) {
    const addData = this.parseAddCommand(content);
    
    if (!addData) {
      console.log('⚠️ No valid contact data parsed from @ADD command');
      return null;
    }

    // Get exchange to find client/contacts to update
    const exchange = await databaseService.getExchangeById(exchangeId);
    if (!exchange) {
      throw new Error('Exchange not found');
    }

    let contactResult = null;

    // If mobile number is provided, either create new contact or update existing one
    if (addData.mobile) {
      // Try to find existing contact by mobile number
      const existingContacts = await databaseService.getContacts({
        where: { phone: addData.mobile }
      });

      if (existingContacts && existingContacts.length > 0) {
        // Update existing contact
        const contact = existingContacts[0];
        const updatedContact = await databaseService.updateContact(contact.id, {
          phone: addData.mobile,
          phone_mobile: addData.mobile,
          updated_at: new Date().toISOString()
        });
        
        contactResult = {
          action: 'updated',
          contact: updatedContact,
          mobile: addData.mobile
        };
        
        console.log('✅ Contact updated with mobile number:', updatedContact.id);
      } else {
        // Create new contact
        const newContactData = {
          first_name: addData.name || 'Mobile Contact',
          last_name: '',
          phone: addData.mobile,
          phone_mobile: addData.mobile,
          email: addData.email || '',
          company: addData.company || '',
          contact_type: 'client',
          is_active: true
        };

        const newContact = await databaseService.createContact(newContactData);
        contactResult = {
          action: 'created',
          contact: newContact,
          mobile: addData.mobile
        };
        
        console.log('✅ New contact created with mobile number:', newContact.id);
      }
    }

    return contactResult;
  }

  /**
   * Parse @ADD command to extract contact information
   * @param {string} content - Message content
   * @returns {Object|null} - Parsed contact data or null
   */
  parseAddCommand(content) {
    // Extract @ADD command content
    const addMatch = content.match(/@ADD\s+(.*?)(?:\n|$)/i);
    if (!addMatch) {
      return null;
    }

    const addContent = addMatch[1].trim();
    if (!addContent) {
      return null;
    }

    const contactData = {};

    // Extract mobile number patterns
    const mobilePatterns = [
      /(?:mobile|mob|phone|tel):\s*([+\d\s\-\(\)]+)/i,
      /([+]?[\d\s\-\(\)]{10,15})/g  // General phone number pattern
    ];

    for (const pattern of mobilePatterns) {
      const match = addContent.match(pattern);
      if (match) {
        contactData.mobile = this.cleanPhoneNumber(match[1]);
        break;
      }
    }

    // Extract name
    const nameMatch = addContent.match(/(?:name|for):\s*([A-Za-z\s]+?)(?:\s|$|,)/i);
    if (nameMatch) {
      contactData.name = nameMatch[1].trim();
    }

    // Extract email
    const emailMatch = addContent.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) {
      contactData.email = emailMatch[1];
    }

    // Extract company
    const companyMatch = addContent.match(/(?:company|org):\s*([A-Za-z\s]+?)(?:\s|$|,)/i);
    if (companyMatch) {
      contactData.company = companyMatch[1].trim();
    }

    // Must have at least a mobile number
    return contactData.mobile ? contactData : null;
  }

  /**
   * Clean and format phone number
   * @param {string} phone - Raw phone number
   * @returns {string} - Cleaned phone number
   */
  cleanPhoneNumber(phone) {
    // Remove all non-digit characters except + at the start
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // Ensure + is only at the beginning
    if (cleaned.includes('+')) {
      cleaned = '+' + cleaned.replace(/\+/g, '');
    }
    
    return cleaned;
  }

  /**
   * Get usage examples for both commands
   * @returns {Object} - Examples for @TASK and @ADD
   */
  getExamples() {
    return {
      task: [
        '@TASK Review contract documents priority: high due: tomorrow',
        '@TASK Call client about property inspection assign: @john due: Friday',
        '@TASK Update exchange timeline due: 2025-08-15 #urgent #client-communication',
        '@TASK Prepare closing documents priority: medium due: next week',
        '@TASK Follow up on financing approval assign: Sarah due: today #follow-up'
      ],
      add: [
        '@ADD mobile: +1-555-123-4567 name: John Smith',
        '@ADD phone: (555) 987-6543 for: Jane Doe company: ABC Corp',
        '@ADD +15551234567 john.smith@email.com',
        '@ADD tel: 555.123.4567 name: Mike Johnson',
        '@ADD mobile: +1 (555) 456-7890 for: Sarah Wilson company: XYZ Inc'
      ]
    };
  }
}

module.exports = new MessageAgentService();