/**
 * Notification Filter Service
 * Filters notifications based on user preferences and categories
 */

class NotificationFilterService {
  constructor() {
    this.defaultSettings = this.getDefaultSettings();
  }

  /**
   * Get default notification settings
   */
  getDefaultSettings() {
    return {
      global: {
        enabled: true,
        sound: true,
        browserNotifications: true
      },
      categories: {
        tasks: {
          enabled: true,
          channels: { email: true, sms: false, inApp: true, browser: true },
          events: {
            taskAssigned: true,
            taskCompleted: true,
            taskOverdue: true,
            taskUpdated: true,
            taskDeleted: true
          }
        },
        messages: {
          enabled: true,
          channels: { email: false, sms: false, inApp: true, browser: true },
          events: {
            newMessage: true,
            messageMention: true,
            messageReaction: true
          }
        },
        documents: {
          enabled: true,
          channels: { email: true, sms: false, inApp: true, browser: true },
          events: {
            documentUploaded: true,
            documentDownloaded: false,
            documentApproved: true,
            documentRejected: true
          }
        },
        exchanges: {
          enabled: true,
          channels: { email: true, sms: false, inApp: true, browser: true },
          events: {
            exchangeCreated: true,
            exchangeUpdated: true,
            exchangeStatusChanged: true,
            participantAdded: true,
            participantRemoved: true
          }
        },
        invitations: {
          enabled: true,
          channels: { email: true, sms: true, inApp: true, browser: true },
          events: {
            invitationReceived: true,
            invitationAccepted: true,
            invitationDeclined: true
          }
        },
        security: {
          enabled: true,
          channels: { email: true, sms: true, inApp: true, browser: true },
          events: {
            loginAttempt: true,
            passwordChanged: true,
            twoFactorEnabled: true,
            suspiciousActivity: true
          }
        },
        system: {
          enabled: true,
          channels: { email: false, sms: false, inApp: true, browser: false },
          events: {
            maintenanceScheduled: true,
            systemUpdate: true,
            featureAnnouncement: true
          }
        }
      },
      channels: {
        email: {
          enabled: true,
          frequency: 'immediate',
          quietHours: { enabled: false, start: '22:00', end: '08:00', timezone: 'America/Los_Angeles' }
        },
        sms: {
          enabled: false,
          frequency: 'immediate',
          quietHours: { enabled: true, start: '22:00', end: '08:00', timezone: 'America/Los_Angeles' }
        },
        inApp: {
          enabled: true,
          sound: true,
          vibration: false,
          autoClose: 5000
        },
        browser: {
          enabled: true,
          requireInteraction: false,
          autoClose: 5000
        }
      }
    };
  }

  /**
   * Map audit log actions to notification categories and events
   */
  mapActionToCategory(action) {
    const actionMap = {
      // Task actions
      'TASK_ASSIGNED': { category: 'tasks', event: 'taskAssigned' },
      'TASK_COMPLETED': { category: 'tasks', event: 'taskCompleted' },
      'TASK_UPDATED': { category: 'tasks', event: 'taskUpdated' },
      'TASK_DELETED': { category: 'tasks', event: 'taskDeleted' },
      'TASK_OVERDUE': { category: 'tasks', event: 'taskOverdue' },

      // Message actions
      'MESSAGE_SENT': { category: 'messages', event: 'newMessage' },
      'MESSAGE_MENTION': { category: 'messages', event: 'messageMention' },
      'MESSAGE_REACTION': { category: 'messages', event: 'messageReaction' },

      // Document actions
      'DOCUMENT_UPLOADED': { category: 'documents', event: 'documentUploaded' },
      'DOCUMENT_DOWNLOADED': { category: 'documents', event: 'documentDownloaded' },
      'DOCUMENT_APPROVED': { category: 'documents', event: 'documentApproved' },
      'DOCUMENT_REJECTED': { category: 'documents', event: 'documentRejected' },

      // Exchange actions
      'EXCHANGE_CREATED': { category: 'exchanges', event: 'exchangeCreated' },
      'EXCHANGE_UPDATED': { category: 'exchanges', event: 'exchangeUpdated' },
      'EXCHANGE_STATUS_CHANGED': { category: 'exchanges', event: 'exchangeStatusChanged' },
      'USER_INVITED_TO_EXCHANGE': { category: 'invitations', event: 'invitationReceived' },
      'USER_JOINED_EXCHANGE': { category: 'exchanges', event: 'participantAdded' },
      'USER_LEFT_EXCHANGE': { category: 'exchanges', event: 'participantRemoved' },

      // Security actions
      'USER_LOGIN': { category: 'security', event: 'loginAttempt' },
      'PASSWORD_CHANGED': { category: 'security', event: 'passwordChanged' },
      'TWO_FACTOR_ENABLED': { category: 'security', event: 'twoFactorEnabled' },
      'SUSPICIOUS_ACTIVITY': { category: 'security', event: 'suspiciousActivity' },

      // System actions
      'MAINTENANCE_SCHEDULED': { category: 'system', event: 'maintenanceScheduled' },
      'SYSTEM_UPDATE': { category: 'system', event: 'systemUpdate' },
      'FEATURE_ANNOUNCEMENT': { category: 'system', event: 'featureAnnouncement' }
    };

    return actionMap[action] || { category: 'system', event: 'systemUpdate' };
  }

  /**
   * Check if notification should be sent based on user preferences
   */
  shouldSendNotification(userSettings, action, channel = 'inApp') {
    try {
      // Use default settings if user settings are not available
      const settings = userSettings || this.defaultSettings;

      // Check if global notifications are enabled
      if (!settings.global?.enabled) {
        return false;
      }

      // Map action to category and event
      const { category, event } = this.mapActionToCategory(action);

      // Check if category is enabled
      const categorySettings = settings.categories?.[category];
      if (!categorySettings?.enabled) {
        return false;
      }

      // Check if specific event is enabled
      if (!categorySettings.events?.[event]) {
        return false;
      }

      // Check if channel is enabled for this category
      if (!categorySettings.channels?.[channel]) {
        return false;
      }

      // Check if channel is globally enabled
      const channelSettings = settings.channels?.[channel];
      if (!channelSettings?.enabled) {
        return false;
      }

      // Check quiet hours for email and SMS
      if ((channel === 'email' || channel === 'sms') && this.isInQuietHours(channelSettings)) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking notification preferences:', error);
      return true; // Default to sending if there's an error
    }
  }

  /**
   * Check if current time is in quiet hours
   */
  isInQuietHours(channelSettings) {
    try {
      const quietHours = channelSettings.quietHours;
      if (!quietHours?.enabled) {
        return false;
      }

      const now = new Date();
      const userTimezone = quietHours.timezone || 'America/Los_Angeles';
      
      // Convert to user's timezone
      const userTime = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
      const currentHour = userTime.getHours();
      const currentMinute = userTime.getMinutes();
      const currentTime = currentHour * 60 + currentMinute;

      // Parse quiet hours
      const [startHour, startMinute] = quietHours.start.split(':').map(Number);
      const [endHour, endMinute] = quietHours.end.split(':').map(Number);
      const startTime = startHour * 60 + startMinute;
      const endTime = endHour * 60 + endMinute;

      // Handle overnight quiet hours (e.g., 22:00 to 08:00)
      if (startTime > endTime) {
        return currentTime >= startTime || currentTime <= endTime;
      } else {
        return currentTime >= startTime && currentTime <= endTime;
      }
    } catch (error) {
      console.error('Error checking quiet hours:', error);
      return false;
    }
  }

  /**
   * Get enabled channels for a specific notification
   */
  getEnabledChannels(userSettings, action) {
    try {
      const settings = userSettings || this.defaultSettings;
      const { category, event } = this.mapActionToCategory(action);
      
      const categorySettings = settings.categories?.[category];
      if (!categorySettings?.enabled || !categorySettings.events?.[event]) {
        return [];
      }

      const enabledChannels = [];
      
      // Check each channel
      ['email', 'sms', 'inApp', 'browser'].forEach(channel => {
        if (categorySettings.channels?.[channel] && 
            settings.channels?.[channel]?.enabled &&
            !this.isInQuietHours(settings.channels[channel])) {
          enabledChannels.push(channel);
        }
      });

      return enabledChannels;
    } catch (error) {
      console.error('Error getting enabled channels:', error);
      return ['inApp']; // Default to in-app notifications
    }
  }

  /**
   * Filter notifications for a user based on their preferences
   */
  filterNotificationsForUser(userSettings, notifications) {
    try {
      const settings = userSettings || this.defaultSettings;
      
      return notifications.filter(notification => {
        const { category, event } = this.mapActionToCategory(notification.action);
        
        // Check if category and event are enabled
        const categorySettings = settings.categories?.[category];
        if (!categorySettings?.enabled || !categorySettings.events?.[event]) {
          return false;
        }

        return true;
      });
    } catch (error) {
      console.error('Error filtering notifications:', error);
      return notifications; // Return all notifications if there's an error
    }
  }

  /**
   * Get notification priority based on category and event
   */
  getNotificationPriority(action) {
    const priorityMap = {
      // High priority
      'TASK_OVERDUE': 'high',
      'SUSPICIOUS_ACTIVITY': 'high',
      'USER_INVITED_TO_EXCHANGE': 'high',
      'TASK_ASSIGNED': 'high',

      // Medium priority
      'TASK_COMPLETED': 'medium',
      'DOCUMENT_UPLOADED': 'medium',
      'EXCHANGE_STATUS_CHANGED': 'medium',
      'MESSAGE_MENTION': 'medium',

      // Low priority
      'MESSAGE_SENT': 'low',
      'DOCUMENT_DOWNLOADED': 'low',
      'USER_LOGIN': 'low',
      'TASK_UPDATED': 'low'
    };

    return priorityMap[action] || 'medium';
  }

  /**
   * Validate notification settings structure
   */
  validateSettings(settings) {
    const requiredFields = ['global', 'categories', 'channels'];
    
    for (const field of requiredFields) {
      if (!settings[field]) {
        return { valid: false, error: `Missing required field: ${field}` };
      }
    }

    // Validate categories
    const requiredCategories = ['tasks', 'messages', 'documents', 'exchanges', 'invitations', 'security', 'system'];
    for (const category of requiredCategories) {
      if (!settings.categories[category]) {
        return { valid: false, error: `Missing required category: ${category}` };
      }
    }

    // Validate channels
    const requiredChannels = ['email', 'sms', 'inApp', 'browser'];
    for (const channel of requiredChannels) {
      if (!settings.channels[channel]) {
        return { valid: false, error: `Missing required channel: ${channel}` };
      }
    }

    return { valid: true };
  }
}

module.exports = new NotificationFilterService();



























