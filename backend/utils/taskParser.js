const { createClient } = require('@supabase/supabase-js');
// Import your existing GPT-OSS service
const gptQueryService = require('../services/gptQueryService');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class TaskParser {
  /**
   * Parse chat message for @mentions and @TASK commands
   * @param {string} message - The chat message
   * @param {string} exchangeId - The exchange ID
   * @param {object} sender - The user sending the message
   * @returns {object} Parsed task data or null
   */
  static async parseMessage(message, exchangeId, sender) {
    // Check if message contains @TASK
    if (!message.includes('@TASK')) {
      return null;
    }

    // Extract mentioned users
    const mentionPattern = /@(\w+(?:\.\w+)?(?:@[\w.-]+)?)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionPattern.exec(message)) !== null) {
      if (match[1] !== 'TASK') {
        mentions.push(match[1]);
      }
    }

    // Extract task content after @TASK
    const taskMatch = message.match(/@TASK\s+(.+)/i);
    if (!taskMatch) {
      return null;
    }

    const taskContent = taskMatch[1];

    // Use AI to extract task details
    const taskDetails = await this.extractTaskDetailsWithAI(taskContent, mentions);

    return {
      ...taskDetails,
      exchangeId,
      createdBy: sender.id,
      mentions
    };
  }

  /**
   * Use AI to intelligently extract task details from natural language
   */
  static async extractTaskDetailsWithAI(taskContent, mentions) {
    try {
      const systemPrompt = "You are a task extraction assistant. Extract structured task data from natural language and return valid JSON.";
      
      const userPrompt = `
        Extract task details from this message. Return JSON with these fields:
        - title: Brief task title (max 100 chars)
        - description: Detailed task description
        - dueDate: Extract date if mentioned (ISO format) or null
        - priority: high/medium/low (default: medium)
        - category: document_review/signature/follow_up/general
        - assignedTo: First mentioned user or null
        
        Message: "${taskContent}"
        Mentioned users: ${mentions.join(', ')}
      `;

      // Use your existing GPT-OSS service
      const response = await gptQueryService.processNaturalLanguageQuery(
        userPrompt,
        'task_extraction',
        {
          systemPrompt,
          expectedFormat: 'json',
          maxTokens: 500
        }
      );

      // Parse the response
      let extracted;
      if (typeof response === 'string') {
        // Try to extract JSON from the response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extracted = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } else {
        extracted = response;
      }

      // Set defaults and validate
      return {
        title: extracted.title || taskContent.substring(0, 100),
        description: extracted.description || taskContent,
        dueDate: extracted.dueDate || this.getDefaultDueDate(),
        priority: extracted.priority || 'medium',
        category: extracted.category || 'general',
        assignedTo: extracted.assignedTo || mentions[0] || null
      };
    } catch (error) {
      console.error('AI extraction failed, using fallback:', error);
      
      // Fallback to simple extraction
      return this.fallbackExtraction(taskContent, mentions);
    }
  }

  /**
   * Fallback task extraction without AI
   */
  static fallbackExtraction(taskContent, mentions) {
    // Simple regex patterns for common task elements
    const dueDateMatch = taskContent.match(/(?:by|due|before)\s+(\d{1,2}\/\d{1,2}\/\d{4}|\w+ \d{1,2})/i);
    const priorityMatch = taskContent.match(/(?:priority:|priority)\s*(high|medium|low)/i);
    
    // Extract title (first sentence or line)
    const titleMatch = taskContent.match(/^([^.!?\n]+)/);
    const title = titleMatch ? titleMatch[1].trim() : taskContent.substring(0, 100);

    return {
      title,
      description: taskContent,
      dueDate: dueDateMatch ? this.parseDateString(dueDateMatch[1]) : this.getDefaultDueDate(),
      priority: priorityMatch ? priorityMatch[1].toLowerCase() : 'medium',
      category: this.detectCategory(taskContent),
      assignedTo: mentions[0] || null
    };
  }

  /**
   * Detect task category from content
   */
  static detectCategory(content) {
    const contentLower = content.toLowerCase();
    
    if (contentLower.includes('review') || contentLower.includes('check')) {
      return 'document_review';
    } else if (contentLower.includes('sign') || contentLower.includes('signature')) {
      return 'signature';
    } else if (contentLower.includes('follow up') || contentLower.includes('follow-up')) {
      return 'follow_up';
    }
    
    return 'general';
  }

  /**
   * Parse date string to ISO format
   */
  static parseDateString(dateStr) {
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch (e) {
      // Invalid date
    }
    return this.getDefaultDueDate();
  }

  /**
   * Get default due date (3 days from now)
   */
  static getDefaultDueDate() {
    const date = new Date();
    date.setDate(date.getDate() + 3);
    return date.toISOString();
  }

  /**
   * Find user by mention (email or name)
   */
  static async findUserByMention(mention, exchangeId = null) {
    // If exchangeId is provided, limit search to exchange participants for security
    if (exchangeId) {
      // Get exchange participants first
      const { data: participants } = await supabase
        .from('exchange_participants')
        .select(`
          user_id,
          users:user_id (
            id, email, first_name, last_name
          )
        `)
        .eq('exchange_id', exchangeId)
        .not('user_id', 'is', null);

      if (participants && participants.length > 0) {
        const participantUsers = participants
          .filter(p => p.users)
          .map(p => p.users);

        // Search within participants only
        for (const user of participantUsers) {
          // Exact email match
          if (user.email === mention) return user;
          
          // Email without domain
          if (mention.includes('@')) {
            const username = mention.split('@')[0];
            if (user.email.startsWith(username + '@')) return user;
          }
          
          // First or last name match (case insensitive)
          if (user.first_name?.toLowerCase() === mention.toLowerCase() ||
              user.last_name?.toLowerCase() === mention.toLowerCase()) {
            return user;
          }
        }
      }
      
      // If no match in participants, return null for security
      return null;
    }

    // Fallback to global search if no exchangeId provided (for compatibility)
    // First try exact email match
    const { data: emailMatch } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('email', mention)
      .single();

    if (emailMatch) return emailMatch;

    // Try email without domain
    if (mention.includes('@')) {
      const username = mention.split('@')[0];
      const { data: usernameMatch } = await supabase
        .from('users')
        .select('id, email, first_name, last_name')
        .ilike('email', `${username}@%`)
        .single();
      
      if (usernameMatch) return usernameMatch;
    }

    // Try first name or last name match
    const { data: nameMatch } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .or(`first_name.ilike.${mention},last_name.ilike.${mention}`)
      .single();

    return nameMatch;
  }
}

module.exports = TaskParser;