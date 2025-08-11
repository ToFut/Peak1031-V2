/**
 * Task Parsing Service
 * Extracts task information from natural language @TASK messages
 */

class TaskParsingService {
  /**
   * Parse @TASK message and extract task details
   * @param {string} message - The message content
   * @param {string} exchangeId - The exchange ID where the message was sent
   * @param {string} userId - The user ID who created the task
   * @returns {Object|null} - Parsed task data or null if no @TASK found
   */
  parseTaskFromMessage(message, exchangeId, userId) {
    // Check if message contains @TASK
    if (!message.includes('@TASK')) {
      return null;
    }

    // Extract the task content after @TASK
    const taskMatch = message.match(/@TASK\s+(.*?)(?:\n|$)/i);
    if (!taskMatch) {
      return null;
    }

    const taskContent = taskMatch[1].trim();
    if (!taskContent) {
      return null;
    }

    // Parse the task content
    const taskData = this.parseTaskContent(taskContent);
    
    // Add metadata
    taskData.exchange_id = exchangeId;
    taskData.source = 'message';
    // Note: created_by removed due to foreign key constraint with people table
    
    return taskData;
  }

  /**
   * Parse task content and extract details
   * @param {string} content - The task content
   * @returns {Object} - Parsed task data
   */
  parseTaskContent(content) {
    const task = {
      title: '',
      description: content,
      status: 'PENDING',
      priority: 'MEDIUM',
      assigned_to: null,
      due_date: null,
      tags: []
    };

    // Extract title (first sentence or up to 100 chars)
    const sentences = content.split(/[.!?]/);
    if (sentences.length > 0) {
      task.title = sentences[0].trim().substring(0, 100);
    }
    
    if (!task.title) {
      task.title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
    }

    // Extract priority
    const priorityMatch = content.match(/(?:priority|pri):\s*(low|medium|high|urgent)/i);
    if (priorityMatch) {
      const priority = priorityMatch[1].toLowerCase();
      task.priority = priority === 'urgent' ? 'HIGH' : priority.toUpperCase();
    }

    // Extract due date patterns
    const dueDatePatterns = [
      /(?:due|deadline|by):\s*(\d{1,2}\/\d{1,2}\/\d{4})/i,
      /(?:due|deadline|by):\s*(\d{4}-\d{2}-\d{2})/i,
      /(?:due|deadline|by):\s*(today|tomorrow|next week|next month)/i,
      /(?:due|deadline|by)\s+(\w+day)/i
    ];

    for (const pattern of dueDatePatterns) {
      const match = content.match(pattern);
      if (match) {
        task.due_date = this.parseDateString(match[1]);
        break;
      }
    }

    // Extract assignment
    const assignmentPatterns = [
      /(?:assign|assigned to|for):\s*@(\w+)/i,
      /(?:assign|assigned to|for):\s*([A-Za-z\s]+?)(?:\s|$|,)/i
    ];

    for (const pattern of assignmentPatterns) {
      const match = content.match(pattern);
      if (match) {
        task.assignee_name = match[1].trim();
        break;
      }
    }

    // Extract tags
    const tagMatches = content.match(/#(\w+)/g);
    if (tagMatches) {
      task.tags = tagMatches.map(tag => tag.substring(1));
    }

    return task;
  }

  /**
   * Parse date string to ISO date
   * @param {string} dateStr - Date string
   * @returns {string|null} - ISO date string or null
   */
  parseDateString(dateStr) {
    const today = new Date();
    const lowerStr = dateStr.toLowerCase();

    try {
      // Handle relative dates
      switch (lowerStr) {
        case 'today':
          return today.toISOString().split('T')[0];
        
        case 'tomorrow':
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          return tomorrow.toISOString().split('T')[0];
        
        case 'next week':
          const nextWeek = new Date(today);
          nextWeek.setDate(nextWeek.getDate() + 7);
          return nextWeek.toISOString().split('T')[0];
        
        case 'next month':
          const nextMonth = new Date(today);
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          return nextMonth.toISOString().split('T')[0];
      }

      // Handle weekdays
      const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const weekdayIndex = weekdays.indexOf(lowerStr);
      if (weekdayIndex !== -1) {
        const targetDay = new Date(today);
        const daysUntilTarget = (weekdayIndex + 1 - today.getDay() + 7) % 7 || 7;
        targetDay.setDate(targetDay.getDate() + daysUntilTarget);
        return targetDay.toISOString().split('T')[0];
      }

      // Handle standard date formats
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }

      return null;
    } catch (error) {
      console.warn('Failed to parse date:', dateStr, error);
      return null;
    }
  }

  /**
   * Generate task examples for users
   * @returns {Array} - Array of example @TASK messages
   */
  getExamples() {
    return [
      '@TASK Review contract documents for accuracy priority: high due: tomorrow',
      '@TASK Call client about property inspection assign: @john due: Friday',
      '@TASK Update exchange timeline due: 2025-08-15 #urgent #client-communication',
      '@TASK Prepare closing documents priority: medium due: next week',
      '@TASK Follow up on financing approval assign: Sarah due: today #follow-up'
    ];
  }

  /**
   * Validate parsed task data
   * @param {Object} taskData - Parsed task data
   * @returns {Object} - Validation result with isValid and errors
   */
  validateTask(taskData) {
    const errors = [];

    if (!taskData.title || taskData.title.trim().length === 0) {
      errors.push('Task title is required');
    }

    if (taskData.title && taskData.title.length > 255) {
      errors.push('Task title must be less than 255 characters');
    }

    if (!taskData.exchange_id) {
      errors.push('Exchange ID is required');
    }

    // Removed created_by validation due to foreign key constraint with people table

    const validPriorities = ['LOW', 'MEDIUM', 'HIGH'];
    if (taskData.priority && !validPriorities.includes(taskData.priority)) {
      errors.push('Priority must be LOW, MEDIUM, or HIGH');
    }

    const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
    if (taskData.status && !validStatuses.includes(taskData.status)) {
      errors.push('Status must be PENDING, IN_PROGRESS, or COMPLETED');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = new TaskParsingService();