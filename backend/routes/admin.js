const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const User = require('../models/User');
const Contact = require('../models/Contact');
const AuditLog = require('../models/AuditLog');
const Exchange = require('../models/Exchange');
const Task = require('../models/Task');
const Document = require('../models/Document');
const Message = require('../models/Message');
const { Op } = require('sequelize');
const supabaseService = require('../services/supabase');

const router = express.Router();

// Get system statistics
router.get('/stats', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    let userCount = 0;
    
    // Try to get user count from Supabase first
    if (supabaseService.client) {
      try {
        const users = await supabaseService.getUsers();
        userCount = users.length;
      } catch (supabaseError) {
        console.log('⚠️ Could not get user count:', supabaseError.message);
        userCount = 0;
      }
    } else {
      userCount = 0;
    }
    
    // Get exchange count from Supabase
    let exchangeCount = 0;
    if (supabaseService.client) {
      try {
        const { count } = await supabaseService.client
          .from('exchanges')
          .select('*', { count: 'exact', head: true });
        exchangeCount = count || 0;
      } catch (supabaseError) {
        console.log('⚠️ Could not get exchange count:', supabaseError.message);
        exchangeCount = 0;
      }
    } else {
      exchangeCount = 0;
    }
    
    // Get other counts from Supabase
    let documentCount = 0;
    let taskCount = 0;
    let messageCount = 0;
    
    if (supabaseService.client) {
      try {
        const { count: docCount } = await supabaseService.client
          .from('documents')
          .select('*', { count: 'exact', head: true });
        documentCount = docCount || 0;
      } catch (err) {
        console.log('Documents table not found:', err.message);
      }
      
      try {
        const { count: tCount } = await supabaseService.client
          .from('tasks')
          .select('*', { count: 'exact', head: true });
        taskCount = tCount || 0;
      } catch (err) {
        console.log('Tasks table not found:', err.message);
      }
      
      try {
        const { count: mCount } = await supabaseService.client
          .from('messages')
          .select('*', { count: 'exact', head: true });
        messageCount = mCount || 0;
      } catch (err) {
        console.log('Messages table not found:', err.message);
      }
    }
    
    const stats = {
      users: userCount,
      exchanges: exchangeCount,
      documents: documentCount,
      tasks: taskCount,
      messages: messageCount
    };

    res.json({ data: stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get dashboard statistics (alias for /stats)
router.get('/dashboard-stats', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    let userCount = 0;
    
    // Try to get user count from Supabase first
    if (supabaseService.client) {
      try {
        const users = await supabaseService.getUsers();
        userCount = users.length;
      } catch (supabaseError) {
        console.log('⚠️ Could not get user count:', supabaseError.message);
        userCount = 0;
      }
    } else {
      userCount = 0;
    }
    
    // Get exchange count from Supabase
    let exchangeCount = 0;
    if (supabaseService.client) {
      try {
        const { count } = await supabaseService.client
          .from('exchanges')
          .select('*', { count: 'exact', head: true });
        exchangeCount = count || 0;
      } catch (supabaseError) {
        console.log('⚠️ Could not get exchange count:', supabaseError.message);
        exchangeCount = 0;
      }
    } else {
      exchangeCount = 0;
    }
    
    // Get other counts from Supabase
    let documentCount = 0;
    let taskCount = 0;
    let messageCount = 0;
    
    if (supabaseService.client) {
      try {
        const { count: docCount } = await supabaseService.client
          .from('documents')
          .select('*', { count: 'exact', head: true });
        documentCount = docCount || 0;
      } catch (err) {
        console.log('Documents table not found:', err.message);
      }
      
      try {
        const { count: tCount } = await supabaseService.client
          .from('tasks')
          .select('*', { count: 'exact', head: true });
        taskCount = tCount || 0;
      } catch (err) {
        console.log('Tasks table not found:', err.message);
      }
      
      try {
        const { count: mCount } = await supabaseService.client
          .from('messages')
          .select('*', { count: 'exact', head: true });
        messageCount = mCount || 0;
      } catch (err) {
        console.log('Messages table not found:', err.message);
      }
    }
    
    const stats = {
      users: userCount,
      exchanges: exchangeCount,
      documents: documentCount,
      tasks: taskCount,
      messages: messageCount
    };

    res.json({ data: stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users (admin only)
router.get('/users', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    // Admin gets all users by default (limit 1000)
    const { page = 1, limit = 1000, search, role, status } = req.query;
    
    // Try to get users from Supabase first - use 'people' table
    if (supabaseService.client) {
      try {
        const options = {
          orderBy: { column: 'created_at', ascending: false },
          limit: parseInt(limit),
          offset: (parseInt(page) - 1) * parseInt(limit)
        };

        // Add filters if provided
        if (role || status) {
          options.where = {};
          if (role) options.where.role = role;
          if (status) options.where.is_active = status === 'active';
        }

        // Get users from both 'people' table and 'users' table
        const [peopleUsers, systemUsers] = await Promise.all([
          supabaseService.select('people', options),
          supabaseService.select('users', options)
        ]);
        
        // Combine both sets of users
        const users = [...peopleUsers, ...systemUsers];
        
        // Debug: Log user structure to understand the issue
        console.log('🔍 Debug: Users structure:', {
          peopleUsersCount: peopleUsers.length,
          systemUsersCount: systemUsers.length,
          totalUsers: users.length,
          sampleUser: users[0] ? {
            id: users[0].id,
            idType: typeof users[0].id,
            hasId: !!users[0].id
          } : 'No users found'
        });
        
        // Get contacts for each user (where user_id matches)
        const contactsMap = {};
        if (users.length > 0) {
          try {
            // UUID validation function
            const isValidUUID = (uuid) => {
              const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
              return typeof uuid === 'string' && uuidRegex.test(uuid);
            };
            
            // Filter out users with invalid IDs and ensure we have valid UUIDs
            const validUserIds = users
              .filter(u => u && u.id && isValidUUID(u.id))
              .map(u => u.id);
            
            // Debug: Log invalid IDs that were filtered out
            const invalidUsers = users.filter(u => u && u.id && !isValidUUID(u.id));
            if (invalidUsers.length > 0) {
              console.log('⚠️ Found users with invalid UUIDs:', invalidUsers.map(u => ({
                id: u.id,
                idType: typeof u.id,
                email: u.email
              })));
            }
            
            if (validUserIds.length > 0) {
              const contacts = await supabaseService.select('contacts', {
                where: {
                  id: { in: validUserIds }
                }
              });
            
            // Group contacts by id (not user_id since contacts table uses id field)
            contacts.forEach(contact => {
              if (!contactsMap[contact.id]) {
                contactsMap[contact.id] = [];
              }
              contactsMap[contact.id].push(contact);
            });
            } else {
              console.log('⚠️ No valid user IDs found for contact lookup');
            }
          } catch (contactError) {
            console.log('⚠️ Could not fetch contacts:', contactError.message);
          }
        }
        
        // Merge user and contact data, prioritizing contact email over placeholder
        const usersWithContacts = users.map(user => {
          const contacts = contactsMap[user.id] || [];
          const primaryContact = contacts.find(c => c.is_primary) || contacts[0] || null;
          
          return {
            ...user,
            // Use contact email if user email is placeholder
            email: (user.email && !user.email.includes('@imported.com')) 
              ? user.email 
              : (primaryContact?.email || user.email),
            // Use contact name if available
            first_name: primaryContact?.firstName || user.first_name,
            last_name: primaryContact?.lastName || user.last_name,
            phone: primaryContact?.phone || user.phone,
            contacts: contacts,
            primaryContact: primaryContact
          };
        });
        
        // Apply search filter on the results if needed
        let filteredUsers = usersWithContacts;
        if (search) {
          const searchLower = search.toLowerCase();
          filteredUsers = usersWithContacts.filter(user => 
            user.first_name?.toLowerCase().includes(searchLower) ||
            user.last_name?.toLowerCase().includes(searchLower) ||
            user.email?.toLowerCase().includes(searchLower) ||
            user.primaryContact?.company?.toLowerCase().includes(searchLower) ||
            user.primaryContact?.contact_type?.toLowerCase().includes(searchLower)
          );
        }

        res.json({
          data: filteredUsers,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: filteredUsers.length,
            totalPages: Math.ceil(filteredUsers.length / parseInt(limit))
          }
        });
        return;
      } catch (supabaseError) {
        console.log('⚠️ Falling back to local database:', supabaseError.message);
      }
    }

    // Fallback to local database
    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (role) {
      whereClause.role = role;
    }
    
    if (status) {
      whereClause.isActive = status === 'active';
    }

    const users = await User.findAndCountAll({
      where: whereClause,
      include: [{
        model: Contact,
        as: 'contacts',
        required: false, // LEFT JOIN to include users without contacts
        attributes: [
          'id', 'firstName', 'lastName', 'email', 'phone', 'company', 
          'position', 'contactType', 'addressStreet', 'addressCity', 
          'addressState', 'addressZip', 'source', 'tags', 'notes', 
          'preferredContactMethod', 'isPrimary', 'ppData', 'relatedExchanges'
        ]
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (page - 1) * limit
    });

    // Transform data to match frontend expectations
    const transformedUsers = users.rows.map(user => {
      const userData = user.toJSON();
      const contacts = userData.contacts || [];
      const primaryContact = contacts.find(c => c.isPrimary) || contacts[0] || null;
      
      return {
        ...userData,
        // Use contact email if user email is placeholder
        email: (userData.email && !userData.email.includes('@imported.com')) 
          ? userData.email 
          : (primaryContact?.email || userData.email),
        // Use contact name if available  
        first_name: primaryContact?.firstName || userData.firstName,
        last_name: primaryContact?.lastName || userData.lastName,
        phone: primaryContact?.phone || userData.phone,
        contacts: contacts,
        primaryContact: primaryContact
      };
    });

    res.json({
      data: transformedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: users.count,
        totalPages: Math.ceil(users.count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new user (admin only)
router.post('/users', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, phone } = req.body;
    
    // Try to create user in Supabase first
    if (supabaseService.client) {
      try {
        const bcrypt = require('bcrypt');
        const passwordHash = await bcrypt.hash(password, 10);
        
        const userData = {
          email,
          password_hash: passwordHash,
          first_name: firstName,
          last_name: lastName,
          role: role || 'client',
          phone,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const user = await supabaseService.createUser(userData);
        res.status(201).json({ data: user });
        return;
      } catch (supabaseError) {
        console.log('⚠️ Falling back to local database:', supabaseError.message);
      }
    }

    // Fallback to local database
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      role: role || 'client',
      phone,
      isActive: true
    });

    res.status(201).json({ data: user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send login link to user (admin only)
router.post('/users/:userId/send-login-link', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Try to send login link via Supabase first
    if (supabaseService.client) {
      try {
        // Get user from Supabase
        const user = await supabaseService.getUserById(userId);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        // Generate a temporary password reset token
        const crypto = require('crypto');
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Update user with reset token
        await supabaseService.updateUser(userId, {
          reset_token: resetToken,
          reset_token_expires_at: resetTokenExpiry.toISOString(),
          updated_at: new Date().toISOString()
        });

        // Create login link
        const loginLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?token=${resetToken}&email=${user.email}`;

        // TODO: Send email with login link
        // For now, we'll return the link in the response
        console.log(`Login link generated for ${user.email}: ${loginLink}`);

        res.json({ 
          success: true, 
          message: 'Login link sent successfully',
          loginLink: loginLink // Remove this in production
        });
        return;
      } catch (supabaseError) {
        console.log('⚠️ Falling back to local database:', supabaseError.message);
      }
    }

    // Fallback to local database
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate reset token for local database
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await user.update({
      resetToken,
      resetTokenExpiry
    });

    const loginLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?token=${resetToken}&email=${user.email}`;
    console.log(`Login link generated for ${user.email}: ${loginLink}`);

    res.json({ 
      success: true, 
      message: 'Login link sent successfully',
      loginLink: loginLink // Remove this in production
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user status (activate/deactivate)
router.patch('/users/:userId/status', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;
    
    // Try to update user in Supabase first
    if (supabaseService.client) {
      try {
        // First check if user exists
        let user = await supabaseService.getUserById(userId);
        if (!user) {
          // Try people table
          const { data: peopleUser, error: peopleError } = await supabaseService.client
            .from('people')
            .select('*')
            .eq('id', userId)
            .single();
          
          if (peopleError || !peopleUser) {
            return res.status(404).json({ error: 'User not found' });
          }
          user = peopleUser;
        }
        
        // Update the user
        await supabaseService.updateUser(userId, {
          is_active: isActive,
          updated_at: new Date().toISOString()
        });

        // Log the action
        await AuditLog.create({
          userId: req.user.id,
          action: isActive ? 'user_activated' : 'user_deactivated',
          details: `User ${user.email} ${isActive ? 'activated' : 'deactivated'} by admin`,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

        res.json({ 
          success: true, 
          message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
          data: user
        });
        return;
      } catch (supabaseError) {
        console.log('⚠️ Falling back to local database:', supabaseError.message);
      }
    }

    // Fallback to local database
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.update({ isActive });

    // Log the action
    await AuditLog.create({
      userId: req.user.id,
      action: isActive ? 'user_activated' : 'user_deactivated',
      details: `User ${user.email} ${isActive ? 'activated' : 'deactivated'} by admin`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({ 
      success: true, 
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: user
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user role
router.patch('/users/:userId/role', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    // Validate role
    const validRoles = ['admin', 'coordinator', 'client', 'third_party', 'agency'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    // Try to update user in Supabase first
    if (supabaseService.client) {
      try {
        // First check if user exists
        let user = await supabaseService.getUserById(userId);
        if (!user) {
          // Try people table
          const { data: peopleUser, error: peopleError } = await supabaseService.client
            .from('people')
            .select('*')
            .eq('id', userId)
            .single();
          
          if (peopleError || !peopleUser) {
            return res.status(404).json({ error: 'User not found' });
          }
          user = peopleUser;
        }
        
        // Update the user
        await supabaseService.updateUser(userId, {
          role: role,
          updated_at: new Date().toISOString()
        });

        // Log the action
        await AuditLog.create({
          userId: req.user.id,
          action: 'user_role_changed',
          details: `User ${user.email} role changed to ${role} by admin`,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

        res.json({ 
          success: true, 
          message: 'User role updated successfully',
          data: user
        });
        return;
      } catch (supabaseError) {
        console.log('⚠️ Falling back to local database:', supabaseError.message);
      }
    }

    // Fallback to local database
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.update({ role });

    // Log the action
    await AuditLog.create({
      userId: req.user.id,
      action: 'user_role_changed',
      details: `User ${user.email} role changed to ${role} by admin`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({ 
      success: true, 
      message: 'User role updated successfully',
      data: user
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset user password
router.post('/users/:userId/reset-password', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Try to reset password in Supabase first
    if (supabaseService.client) {
      try {
        // Try to find user in both users and people tables
        let user = await supabaseService.getUserById(userId);
        if (!user) {
          // Try people table
          const { data: peopleUser, error: peopleError } = await supabaseService.client
            .from('people')
            .select('*')
            .eq('id', userId)
            .single();
          
          if (peopleError || !peopleUser) {
            return res.status(404).json({ error: 'User not found' });
          }
          user = peopleUser;
        }

        // Generate new password
        const crypto = require('crypto');
        const newPassword = crypto.randomBytes(8).toString('hex');
        const bcrypt = require('bcrypt');
        const passwordHash = await bcrypt.hash(newPassword, 10);

        // Update user with new password and force password reset
        await supabaseService.updateUser(userId, {
          password_hash: passwordHash,
          force_password_reset: true,
          updated_at: new Date().toISOString()
        });

        // Log the action
        await AuditLog.create({
          userId: req.user.id,
          action: 'password_reset',
          details: `Password reset for user ${user.email} by admin`,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

        res.json({ 
          success: true, 
          message: 'Password reset successfully',
          newPassword: newPassword // Remove this in production, send via email instead
        });
        return;
      } catch (supabaseError) {
        console.log('⚠️ Falling back to local database:', supabaseError.message);
      }
    }

    // Fallback to local database
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate new password
    const crypto = require('crypto');
    const newPassword = crypto.randomBytes(8).toString('hex');
    await user.update({ 
      password: newPassword,
      forcePasswordReset: true
    });

    // Log the action
    await AuditLog.create({
      userId: req.user.id,
      action: 'password_reset',
      details: `Password reset for user ${user.email} by admin`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({ 
      success: true, 
      message: 'Password reset successfully',
      newPassword: newPassword // Remove this in production, send via email instead
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle 2FA for user
router.patch('/users/:userId/2fa', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    const { twoFaEnabled } = req.body;
    
    // Try to update user in Supabase first
    if (supabaseService.client) {
      try {
        // First check if user exists
        let user = await supabaseService.getUserById(userId);
        if (!user) {
          // Try people table
          const { data: peopleUser, error: peopleError } = await supabaseService.client
            .from('people')
            .select('*')
            .eq('id', userId)
            .single();
          
          if (peopleError || !peopleUser) {
            return res.status(404).json({ error: 'User not found' });
          }
          user = peopleUser;
        }
        
        // Update the user
        await supabaseService.updateUser(userId, {
          two_fa_enabled: twoFaEnabled,
          updated_at: new Date().toISOString()
        });

        // Log the action
        await AuditLog.create({
          userId: req.user.id,
          action: twoFaEnabled ? '2fa_enabled' : '2fa_disabled',
          details: `2FA ${twoFaEnabled ? 'enabled' : 'disabled'} for user ${user.email} by admin`,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

        res.json({ 
          success: true, 
          message: `2FA ${twoFaEnabled ? 'enabled' : 'disabled'} successfully`,
          data: user
        });
        return;
      } catch (supabaseError) {
        console.log('⚠️ Falling back to local database:', supabaseError.message);
      }
    }

    // Fallback to local database
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.update({ twoFaEnabled });

    // Log the action
    await AuditLog.create({
      userId: req.user.id,
      action: twoFaEnabled ? '2fa_enabled' : '2fa_disabled',
      details: `2FA ${twoFaEnabled ? 'enabled' : 'disabled'} for user ${user.email} by admin`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({ 
      success: true, 
      message: `2FA ${twoFaEnabled ? 'enabled' : 'disabled'} successfully`,
      data: user
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user audit logs
router.get('/users/:userId/audit', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const logs = await AuditLog.findAndCountAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    res.json({
      data: logs.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: logs.count,
        totalPages: Math.ceil(logs.count / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user (soft delete)
router.delete('/users/:userId', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Try to delete user in Supabase first
    if (supabaseService.client) {
      try {
        const user = await supabaseService.getUserById(userId);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        // Soft delete by setting deleted_at
        await supabaseService.updateUser(userId, {
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        // Log the action
        await AuditLog.create({
          userId: req.user.id,
          action: 'user_deleted',
          details: `User ${user.email} deleted by admin`,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });

        res.json({ 
          success: true, 
          message: 'User deleted successfully'
        });
        return;
      } catch (supabaseError) {
        console.log('⚠️ Falling back to local database:', supabaseError.message);
      }
    }

    // Fallback to local database
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Soft delete
    await user.update({ deletedAt: new Date() });

    // Log the action
    await AuditLog.create({
      userId: req.user.id,
      action: 'user_deleted',
      details: `User ${user.email} deleted by admin`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({ 
      success: true, 
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get audit logs (admin only)
router.get('/audit-logs', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 50, userId, action, startDate, endDate } = req.query;
    
    const whereClause = {};
    if (userId) whereClause.user_id = userId;
    if (action) whereClause.action = action;
    if (startDate || endDate) {
      whereClause.created_at = {};
      if (startDate) whereClause.created_at[Op.gte] = new Date(startDate);
      if (endDate) whereClause.created_at[Op.lte] = new Date(endDate);
    }

    const logs = await AuditLog.findAndCountAll({
      where: whereClause,
      include: [{ model: User, as: 'user' }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (page - 1) * limit
    });

    res.json({
      data: logs.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: logs.count,
        totalPages: Math.ceil(logs.count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get system health (admin only)
router.get('/health', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: await sequelize.healthCheck()
    };

    res.json({ data: health });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get system settings (admin only)
router.get('/system-settings', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const settings = {
      appName: 'Peak 1031 Exchange Platform',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      features: {
        realTimeMessaging: true,
        documentUpload: true,
        practicePantherSync: true,
        auditLogging: true
      },
      limits: {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxUploadsPerDay: 100,
        maxUsers: 1000
      }
    };

    res.json({ data: settings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update system settings (admin only)
router.put('/system-settings', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    // In a real application, you would save these to a database
    // For now, we'll just return success
    res.json({ 
      data: { 
        message: 'Settings updated successfully',
        settings: req.body 
      } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export data (admin only)
router.get('/export/:type', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { type } = req.params;
    const { format = 'json' } = req.query;
    
    let data;
    switch (type) {
      case 'users':
        data = await User.findAll();
        break;
      case 'exchanges':
        data = await Exchange.findAll();
        break;
      case 'documents':
        data = await Document.findAll();
        break;
      default:
        return res.status(400).json({ error: 'Invalid export type' });
    }

    if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-${Date.now()}.csv"`);
      res.send(csv);
    } else {
      res.json({ data });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to convert data to CSV
function convertToCSV(data) {
  if (!data.length) return '';
  
  const headers = Object.keys(data[0].toJSON());
  const csvRows = [headers.join(',')];
  
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

module.exports = router; 