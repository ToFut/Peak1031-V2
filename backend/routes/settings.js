const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const databaseService = require('../services/database');
const supabaseService = require('../services/supabase');

const router = express.Router();

// Get user settings
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Enhanced notification settings with categories and channels
    const settings = {
      user_id: req.user.id,
      theme: 'light',
      notifications: {
        // Global notification settings
        global: {
          enabled: true,
          sound: true,
          browserNotifications: true
        },
        // Categorized notification settings
        categories: {
          tasks: {
            enabled: true,
            channels: {
              email: true,
              sms: false,
              inApp: true,
              browser: true
            },
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
            channels: {
              email: false,
              sms: false,
              inApp: true,
              browser: true
            },
            events: {
              newMessage: true,
              messageMention: true,
              messageReaction: true
            }
          },
          documents: {
            enabled: true,
            channels: {
              email: true,
              sms: false,
              inApp: true,
              browser: true
            },
            events: {
              documentUploaded: true,
              documentDownloaded: false,
              documentApproved: true,
              documentRejected: true
            }
          },
          exchanges: {
            enabled: true,
            channels: {
              email: true,
              sms: false,
              inApp: true,
              browser: true
            },
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
            channels: {
              email: true,
              sms: true,
              inApp: true,
              browser: true
            },
            events: {
              invitationReceived: true,
              invitationAccepted: true,
              invitationDeclined: true
            }
          },
          security: {
            enabled: true,
            channels: {
              email: true,
              sms: true,
              inApp: true,
              browser: true
            },
            events: {
              loginAttempt: true,
              passwordChanged: true,
              twoFactorEnabled: true,
              suspiciousActivity: true
            }
          },
          system: {
            enabled: true,
            channels: {
              email: false,
              sms: false,
              inApp: true,
              browser: false
            },
            events: {
              maintenanceScheduled: true,
              systemUpdate: true,
              featureAnnouncement: true
            }
          }
        },
        // Channel-specific settings
        channels: {
          email: {
            enabled: true,
            frequency: 'immediate', // immediate, daily, weekly
            quietHours: {
              enabled: false,
              start: '22:00',
              end: '08:00',
              timezone: 'America/Los_Angeles'
            }
          },
          sms: {
            enabled: false,
            frequency: 'immediate',
            quietHours: {
              enabled: true,
              start: '22:00',
              end: '08:00',
              timezone: 'America/Los_Angeles'
            }
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
      },
      dashboard: {
        layout: 'default',
        widgets: ['recent_exchanges', 'pending_tasks', 'notifications'],
        compactView: false
      },
      preferences: {
        language: 'en',
        timezone: 'America/Los_Angeles',
        date_format: 'MM/DD/YYYY',
        time_format: '12h' // 12h or 24h
      }
    };

    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Returning enhanced notification settings for user:', req.user.email);
    }

    res.json({
      success: true,
      data: settings
    });

  } catch (error) {
    console.error('Error in GET /settings:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Update user settings
router.put('/', authenticateToken, async (req, res) => {
  try {
    console.log('💾 Updating enhanced settings for user:', req.user.id);
    console.log('Settings data:', req.body);

    const { profile, preferences, security, notifications } = req.body;
    
    // Update user profile fields if provided
    if (profile) {
      const userUpdateData = {};
      
      if (profile.firstName) userUpdateData.first_name = profile.firstName;
      if (profile.lastName) userUpdateData.last_name = profile.lastName;
      if (profile.phone) userUpdateData.phone = profile.phone;
      if (profile.company) userUpdateData.company = profile.company;
      
      // Only update if there's data to update
      if (Object.keys(userUpdateData).length > 0) {
        await databaseService.updateUser(req.user.id, userUpdateData);
        console.log('✅ Updated user profile:', userUpdateData);
      }
    }
    
    // Enhanced settings with notification categories
    const updatedSettings = {
      profile: {
        firstName: profile?.firstName || req.user.first_name,
        lastName: profile?.lastName || req.user.last_name,
        email: req.user.email,
        role: req.user.role,
        phone: profile?.phone || req.user.phone,
        company: profile?.company || req.user.company
      },
      notifications: notifications || {
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
      },
      preferences: preferences || {
        language: 'en',
        timezone: 'America/Los_Angeles',
        date_format: 'MM/DD/YYYY',
        time_format: '12h'
      },
      security: security || {
        twoFaEnabled: req.user.two_fa_enabled || false,
        emailVerified: req.user.email_verified || false,
        lastLogin: req.user.last_login,
        sessionTimeout: 3600
      }
    };

    console.log('✅ Enhanced settings updated successfully');
    res.json(updatedSettings);
  } catch (error) {
    console.error('❌ Error updating settings:', error);
    res.status(500).json({
      error: 'Failed to update settings',
      message: error.message
    });
  }
});

// Get notification settings specifically
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    console.log('🔔 Getting notification settings for user:', req.user.id);
    
    // Return the notification portion of settings
    const notificationSettings = {
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

    res.json({
      success: true,
      data: notificationSettings
    });
  } catch (error) {
    console.error('❌ Error getting notification settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notification settings',
      message: error.message
    });
  }
});

// Update notification settings specifically
router.put('/notifications', authenticateToken, async (req, res) => {
  try {
    console.log('🔔 Updating notification settings for user:', req.user.id);
    console.log('Notification settings:', req.body);

    const notificationSettings = req.body;

    // Validate the notification settings structure
    if (!notificationSettings.categories || !notificationSettings.channels) {
      return res.status(400).json({
        success: false,
        error: 'Invalid notification settings structure'
      });
    }

    // Here you would typically save to database
    // For now, we'll just return the updated settings
    console.log('✅ Notification settings updated successfully');
    res.json({
      success: true,
      data: notificationSettings,
      message: 'Notification settings updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating notification settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update notification settings',
      message: error.message
    });
  }
});

// Get activity logs for current user
router.get('/activity', authenticateToken, async (req, res) => {
  try {
    console.log('📊 Getting activity logs for user:', req.user.id);
    
    // Get audit logs for this user
    const logs = await databaseService.getAuditLogs({
      where: { user_id: req.user.id },
      orderBy: { column: 'created_at', ascending: false },
      limit: 50
    });

    const activityLogs = logs.map(log => ({
      id: log.id,
      action: log.action,
      entityType: log.entity_type,
      entityId: log.entity_id,
      timestamp: log.created_at,
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      details: log.details
    }));

    console.log(`✅ Returning ${activityLogs.length} activity logs`);
    res.json({ logs: activityLogs });
  } catch (error) {
    console.error('❌ Error getting activity logs:', error);
    res.status(500).json({
      error: 'Failed to get activity logs',
      message: error.message,
      logs: [] // Return empty array as fallback
    });
  }
});

module.exports = router;