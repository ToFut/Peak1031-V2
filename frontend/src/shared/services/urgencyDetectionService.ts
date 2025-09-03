interface MessageContent {
  subject?: string;
  body: string;
  sender: string;
  timestamp: string;
  attachments?: string[];
}

interface UrgencyAnalysis {
  isUrgent: boolean;
  urgencyScore: number; // 0-100
  reasons: string[];
  suggestedAction?: string;
  deadline?: string;
}

class UrgencyDetectionService {
  private urgentKeywords = [
    // Time-sensitive
    'urgent', 'asap', 'immediately', 'emergency', 'critical', 'time sensitive',
    'deadline', 'expires', 'expiring', 'due today', 'overdue', 'rush',
    
    // Legal/Financial urgency
    'foreclosure', 'default', 'violation', 'penalty', 'fine', 'lawsuit',
    'legal action', 'court', 'subpoena', 'cease and desist',
    
    // 1031 Exchange specific
    'exchange deadline', '180 day', '45 day', 'identification period',
    'replacement property', 'qualified intermediary', 'escrow closing',
    'title issue', 'financing problem', 'inspection failed',
    
    // Client distress indicators  
    'confused', 'worried', 'concerned', 'problem', 'issue', 'help needed',
    'not understanding', 'clarification needed', 'mistake', 'error'
  ];

  private highPriorityPhrases = [
    'need response today',
    'closing tomorrow',
    'deal falling through', 
    'client threatening',
    'lender requiring',
    'title company says',
    'attorney advises',
    'irs notification',
    'exchange failing',
    'cannot close without'
  ];

  private timePatterns = [
    /by (\d{1,2})[:\s]?(\d{2})?\s?(am|pm|today|tomorrow)/i,
    /due\s+(today|tomorrow|by\s+\w+day)/i,
    /expires?\s+(today|tomorrow|this\s+week)/i,
    /closing\s+(today|tomorrow|this\s+week)/i,
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/g, // Date patterns
    /within\s+(\d+)\s+(hour|day|week)s?/i
  ];

  analyzeUrgency(message: MessageContent): UrgencyAnalysis {
    const fullText = `${message.subject || ''} ${message.body}`.toLowerCase();
    let urgencyScore = 0;
    const reasons: string[] = [];
    let suggestedAction = '';
    let deadline = '';

    // Check for urgent keywords
    this.urgentKeywords.forEach(keyword => {
      if (fullText.includes(keyword.toLowerCase())) {
        urgencyScore += 10;
        reasons.push(`Contains urgent keyword: "${keyword}"`);
      }
    });

    // Check for high priority phrases
    this.highPriorityPhrases.forEach(phrase => {
      if (fullText.includes(phrase.toLowerCase())) {
        urgencyScore += 20;
        reasons.push(`Contains high priority phrase: "${phrase}"`);
      }
    });

    // Check for time patterns
    this.timePatterns.forEach(pattern => {
      const matches = fullText.match(pattern);
      if (matches) {
        urgencyScore += 15;
        reasons.push(`Contains time-sensitive language: "${matches[0]}"`);
        if (!deadline && matches[0]) {
          deadline = matches[0];
        }
      }
    });

    // Check for question marks (indicates need for response)
    const questionMarks = (fullText.match(/\?/g) || []).length;
    if (questionMarks > 0) {
      urgencyScore += questionMarks * 5;
      reasons.push(`Contains ${questionMarks} question(s) requiring response`);
    }

    // Check for exclamation points (indicates emotional urgency)
    const exclamationMarks = (fullText.match(/!/g) || []).length;
    if (exclamationMarks > 1) {
      urgencyScore += exclamationMarks * 3;
      reasons.push('Contains multiple exclamation points indicating urgency');
    }

    // Check for ALL CAPS (indicates shouting/urgency)
    const capsWords = fullText.match(/\b[A-Z]{3,}\b/g);
    if (capsWords && capsWords.length > 0) {
      urgencyScore += capsWords.length * 8;
      reasons.push(`Contains ${capsWords.length} words in ALL CAPS`);
    }

    // Check message timing
    const messageTime = new Date(message.timestamp);
    const now = new Date();
    const isAfterHours = messageTime.getHours() > 18 || messageTime.getHours() < 8;
    const isWeekend = messageTime.getDay() === 0 || messageTime.getDay() === 6;
    
    if (isAfterHours || isWeekend) {
      urgencyScore += 10;
      reasons.push('Sent outside business hours');
    }

    // Check for attachments (documents often urgent in 1031 exchanges)
    if (message.attachments && message.attachments.length > 0) {
      urgencyScore += 5;
      reasons.push('Contains attachments');
    }

    // Check for repeated sender (follow-up messages are often urgent)
    // This would need to be implemented with message history

    // Determine suggested action based on content
    if (fullText.includes('closing') || fullText.includes('escrow')) {
      suggestedAction = 'Review closing documents and coordinate with escrow';
    } else if (fullText.includes('title') || fullText.includes('deed')) {
      suggestedAction = 'Review title issues with title company';
    } else if (fullText.includes('financing') || fullText.includes('loan')) {
      suggestedAction = 'Coordinate with lender and client on financing';
    } else if (fullText.includes('property') || fullText.includes('inspection')) {
      suggestedAction = 'Address property or inspection concerns';
    } else if (questionMarks > 0) {
      suggestedAction = 'Provide detailed response to client questions';
    } else {
      suggestedAction = 'Review message and take appropriate action';
    }

    // Cap the score at 100
    urgencyScore = Math.min(urgencyScore, 100);

    return {
      isUrgent: urgencyScore >= 30, // Threshold for urgent classification
      urgencyScore,
      reasons,
      suggestedAction,
      deadline
    };
  }

  // Analyze multiple messages for patterns
  analyzeMessageThread(messages: MessageContent[]): UrgencyAnalysis {
    // Sort by timestamp
    const sortedMessages = messages.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    let highestUrgency: UrgencyAnalysis = {
      isUrgent: false,
      urgencyScore: 0,
      reasons: []
    };

    let threadScore = 0;
    const threadReasons: string[] = [];

    sortedMessages.forEach((message, index) => {
      const analysis = this.analyzeUrgency(message);
      
      if (analysis.urgencyScore > highestUrgency.urgencyScore) {
        highestUrgency = analysis;
      }

      threadScore += analysis.urgencyScore * 0.7; // Reduce individual scores in thread

      // Check for escalation pattern
      if (index > 0 && analysis.urgencyScore > 20) {
        threadScore += 10;
        threadReasons.push('Message thread shows escalating urgency');
      }
    });

    // Check for rapid-fire messages (multiple messages in short time)
    if (messages.length > 2) {
      const timeSpan = new Date(sortedMessages[sortedMessages.length - 1].timestamp).getTime() - 
                      new Date(sortedMessages[0].timestamp).getTime();
      const hoursBetween = timeSpan / (1000 * 60 * 60);
      
      if (hoursBetween < 4) {
        threadScore += 15;
        threadReasons.push(`${messages.length} messages in ${hoursBetween.toFixed(1)} hours`);
      }
    }

    return {
      isUrgent: Math.max(highestUrgency.urgencyScore, threadScore) >= 30,
      urgencyScore: Math.max(highestUrgency.urgencyScore, threadScore),
      reasons: [...highestUrgency.reasons, ...threadReasons],
      suggestedAction: highestUrgency.suggestedAction,
      deadline: highestUrgency.deadline
    };
  }

  // Generate urgency alert text
  generateAlertText(analysis: UrgencyAnalysis): string {
    if (!analysis.isUrgent) return '';

    let alertText = '🚨 URGENT MESSAGE DETECTED\n';
    
    if (analysis.urgencyScore >= 80) {
      alertText += 'CRITICAL - Immediate action required\n';
    } else if (analysis.urgencyScore >= 60) {
      alertText += 'HIGH PRIORITY - Response needed today\n';
    } else {
      alertText += 'MEDIUM PRIORITY - Response needed soon\n';
    }

    if (analysis.deadline) {
      alertText += `Deadline mentioned: ${analysis.deadline}\n`;
    }

    if (analysis.suggestedAction) {
      alertText += `Suggested action: ${analysis.suggestedAction}`;
    }

    return alertText;
  }
}

export const urgencyDetectionService = new UrgencyDetectionService();
export type { MessageContent, UrgencyAnalysis };