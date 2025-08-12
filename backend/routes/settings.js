const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const databaseService = require('../services/database');
const supabaseService = require('../services/supabase');

const router = express.Router();

// Get user settings
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Return default settings since user_settings table doesn't exist yet
    // TODO: Implement proper user_settings table and query it here
    const settings = {
      user_id: req.user.id,
      theme: 'light',
      notifications: {
        email: true,
        push: true,
        sms: false,
        deadlineAlerts: true,
        taskAssignments: true,
        exchangeUpdates: true
      },
      dashboard: {
        layout: 'default',
        widgets: ['recent_exchanges', 'pending_tasks', 'notifications'],
        compactView: false
      },
      preferences: {
        language: 'en',
        timezone: 'UTC',
        date_format: 'MM/DD/YYYY'
      }
    };

    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Returning default settings for user:', req.user.email);
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
    console.log('💾 Updating settings for user:', req.user.id);
    console.log('Settings data:', req.body);

    const { profile, preferences, security } = req.body;
    
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
    
    // For now, preferences and security settings are stored in memory
    // In a production system, you'd want to store these in a settings table
    
    const updatedSettings = {
      profile: {
        firstName: profile?.firstName || req.user.first_name,
        lastName: profile?.lastName || req.user.last_name,
        email: req.user.email,
        role: req.user.role,
        phone: profile?.phone || req.user.phone,
        company: profile?.company || req.user.company
      },
      preferences: preferences || {
        notifications: {
          email: true,
          sms: false,
          deadlineAlerts: true,
          taskAssignments: true,
          exchangeUpdates: true
        },
        dashboard: {
          theme: 'light',
          language: 'en',
          timezone: 'America/Los_Angeles'
        }
      },
      security: security || {
        twoFaEnabled: req.user.two_fa_enabled || false,
        emailVerified: req.user.email_verified || false,
        lastLogin: req.user.last_login,
        sessionTimeout: 3600
      }
    };

    console.log('✅ Settings updated successfully');
    res.json(updatedSettings);
  } catch (error) {
    console.error('❌ Error updating settings:', error);
    res.status(500).json({
      error: 'Failed to update settings',
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