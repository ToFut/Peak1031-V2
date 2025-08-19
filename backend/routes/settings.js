const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const databaseService = require('../services/database');
const AuditService = require('../services/audit');

const router = express.Router();

/**
 * GET /api/settings
 * Get user settings and preferences
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('📋 Getting settings for user:', req.user.id);
    
    // Get user's current settings from database
    const user = await databaseService.getUserById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Build settings object from user data
    const settings = {
      // Profile settings
      firstName: user.first_name || user.firstName,
      lastName: user.last_name || user.lastName,
      email: user.email,
      phone: user.phone,
      
      // Notification preferences (defaults to true if not set)
      emailNotifications: user.email_notifications !== false,
      pushNotifications: user.push_notifications !== false,
      taskReminders: user.task_reminders !== false,
      
      // Application preferences
      theme: user.theme || 'light',
      language: user.language || 'en',
      timezone: user.timezone || 'UTC',
      
      // Security settings
      twoFactorEnabled: user.two_fa_enabled || user.twoFaEnabled || false,
      
      // Additional user preferences
      dashboardLayout: user.dashboard_layout || 'default',
      autoRefresh: user.auto_refresh !== false,
      compactMode: user.compact_mode || false
    };

    console.log('✅ Settings retrieved successfully');
    
    res.json(settings);
    
  } catch (error) {
    console.error('❌ Error getting settings:', error);
    res.status(500).json({
      error: 'Failed to get settings',
      message: error.message
    });
  }
});

/**
 * PUT /api/settings
 * Update user settings and preferences
 */
router.put('/', authenticateToken, async (req, res) => {
  try {
    console.log('📝 Updating settings for user:', req.user.id);
    
    const updates = req.body;
    
    // Validate required fields
    if (updates.email && !isValidEmail(updates.email)) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }

    // Prepare update object for database
    const updateData = {};
    
    // Profile fields
    if (updates.firstName !== undefined) updateData.first_name = updates.firstName;
    if (updates.lastName !== undefined) updateData.last_name = updates.lastName;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    
    // Notification preferences
    if (updates.emailNotifications !== undefined) updateData.email_notifications = updates.emailNotifications;
    if (updates.pushNotifications !== undefined) updateData.push_notifications = updates.pushNotifications;
    if (updates.taskReminders !== undefined) updateData.task_reminders = updates.taskReminders;
    
    // Application preferences
    if (updates.theme !== undefined) updateData.theme = updates.theme;
    if (updates.language !== undefined) updateData.language = updates.language;
    if (updates.timezone !== undefined) updateData.timezone = updates.timezone;
    
    // Additional preferences
    if (updates.dashboardLayout !== undefined) updateData.dashboard_layout = updates.dashboardLayout;
    if (updates.autoRefresh !== undefined) updateData.auto_refresh = updates.autoRefresh;
    if (updates.compactMode !== undefined) updateData.compact_mode = updates.compactMode;

    // Update user in database
    const updatedUser = await databaseService.updateUser(req.user.id, updateData);
    
    if (!updatedUser) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Log the settings update
    await AuditService.log({
      action: 'SETTINGS_UPDATED',
      userId: req.user.id,
      resourceType: 'user',
      resourceId: req.user.id,
      details: {
        updatedFields: Object.keys(updateData),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    console.log('✅ Settings updated successfully');
    
    // Return updated settings
    const settings = {
      firstName: updatedUser.first_name || updatedUser.firstName,
      lastName: updatedUser.last_name || updatedUser.lastName,
      email: updatedUser.email,
      phone: updatedUser.phone,
      emailNotifications: updatedUser.email_notifications !== false,
      pushNotifications: updatedUser.push_notifications !== false,
      taskReminders: updatedUser.task_reminders !== false,
      theme: updatedUser.theme || 'light',
      language: updatedUser.language || 'en',
      timezone: updatedUser.timezone || 'UTC',
      twoFactorEnabled: updatedUser.two_fa_enabled || updatedUser.twoFaEnabled || false,
      dashboardLayout: updatedUser.dashboard_layout || 'default',
      autoRefresh: updatedUser.auto_refresh !== false,
      compactMode: updatedUser.compact_mode || false
    };

    res.json(settings);
    
  } catch (error) {
    console.error('❌ Error updating settings:', error);
    res.status(500).json({
      error: 'Failed to update settings',
      message: error.message
    });
  }
});

/**
 * GET /api/settings/activity-logs
 * Get user's activity logs
 */
router.get('/activity-logs', authenticateToken, async (req, res) => {
  try {
    console.log('📋 Getting activity logs for user:', req.user.id);
    
    const { page = 1, limit = 20 } = req.query;
    
    // Get user's activity logs
    const logs = await AuditService.getAuditLogs({
      userId: req.user.id,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      orderBy: { column: 'created_at', ascending: false }
    });

    console.log('✅ Activity logs retrieved successfully');
    
    res.json({
      logs: logs || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: logs?.length || 0
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting activity logs:', error);
    res.status(500).json({
      error: 'Failed to get activity logs',
      message: error.message
    });
  }
});

/**
 * PUT /api/settings/password
 * Update user password
 */
router.put('/password', authenticateToken, async (req, res) => {
  try {
    console.log('🔐 Updating password for user:', req.user.id);
    
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'New password must be at least 8 characters long'
      });
    }

    // Verify current password and update to new password
    const success = await databaseService.updateUserPassword(
      req.user.id, 
      currentPassword, 
      newPassword
    );

    if (!success) {
      return res.status(400).json({
        error: 'Current password is incorrect'
      });
    }

    // Log the password change
    await AuditService.log({
      action: 'PASSWORD_CHANGED',
      userId: req.user.id,
      resourceType: 'user',
      resourceId: req.user.id,
      details: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    console.log('✅ Password updated successfully');
    
    res.json({
      message: 'Password updated successfully'
    });
    
  } catch (error) {
    console.error('❌ Error updating password:', error);
    res.status(500).json({
      error: 'Failed to update password',
      message: error.message
    });
  }
});

// Helper function to validate email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

module.exports = router;