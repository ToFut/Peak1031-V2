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
        
        // Get contacts for each user (where user_id matches)
        const contactsMap = {};
        if (users.length > 0) {
          try {
            // Filter out invalid UUIDs and ensure we have valid user IDs
            const validUserIds = users
              .map(u => u.id)
              .filter(id => id && typeof id === 'string' && id.length > 0);
            
            if (validUserIds.length > 0) {
              const contacts = await supabaseService.select('contacts', {
                where: {
                  user_id: { in: validUserIds }
                }
              });
            
              // Group contacts by user_id
              contacts.forEach(contact => {
                if (!contactsMap[contact.user_id]) {
                  contactsMap[contact.user_id] = [];
                }
                contactsMap[contact.user_id].push(contact);
              });
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

// Get single user by ID (admin only)
router.get('/users/:userId', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Try to get user from Supabase first
    if (supabaseService.client) {
      try {
        // Try users table first
        let user = await supabaseService.getUserById(userId);
        let contacts = [];
        
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
        
        // Get contacts for this user
        try {
          const userContacts = await supabaseService.select('contacts', {
            where: { id: userId }
          });
          contacts = userContacts || [];
        } catch (contactError) {
          console.log('⚠️ Could not fetch contacts for user:', contactError.message);
        }
        
        const primaryContact = contacts.find(c => c.is_primary) || contacts[0] || null;
        
        const userWithContacts = {
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
        
        res.json({ data: userWithContacts });
        return;
      } catch (supabaseError) {
        console.log('⚠️ Falling back to local database:', supabaseError.message);
      }
    }

    // Fallback to local database
    const user = await User.findByPk(userId, {
      include: [{
        model: Contact,
        as: 'contacts',
        required: false,
        attributes: [
          'id', 'firstName', 'lastName', 'email', 'phone', 'company', 
          'position', 'contactType', 'addressStreet', 'addressCity', 
          'addressState', 'addressZip', 'source', 'tags', 'notes', 
          'preferredContactMethod', 'isPrimary', 'ppData', 'relatedExchanges'
        ]
      }]
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Transform data to match frontend expectations
    const userData = user.toJSON();
    const contacts = userData.contacts || [];
    const primaryContact = contacts.find(c => c.isPrimary) || contacts[0] || null;
    
    const transformedUser = {
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

    res.json({ data: transformedUser });
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

/**
 * POST /api/admin/assign-third-party
 * Assign a third party to an agency
 */
router.post('/assign-third-party', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { agency_contact_id, third_party_contact_id, can_view_performance } = req.body;
    
    if (!agency_contact_id || !third_party_contact_id) {
      return res.status(400).json({ error: 'Both agency_contact_id and third_party_contact_id are required' });
    }

    console.log(`📋 Admin ${req.user.email} assigning third party ${third_party_contact_id} to agency ${agency_contact_id}`);
    
    // Check if assignment already exists
    const { data: existingAssignment } = await supabaseService.client
      .from('agency_third_party_assignments')
      .select('*')
      .eq('agency_contact_id', agency_contact_id)
      .eq('third_party_contact_id', third_party_contact_id)
      .eq('is_active', true)
      .single();
    
    if (existingAssignment) {
      return res.status(400).json({ error: 'This third party is already assigned to this agency' });
    }
    
    // Create new assignment
    const { data: newAssignment, error: insertError } = await supabaseService.client
      .from('agency_third_party_assignments')
      .insert({
        agency_contact_id,
        third_party_contact_id,
        is_active: true,
        can_view_performance: can_view_performance || true,
        performance_score: 75, // Default starting score
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('Error creating assignment:', insertError);
      return res.status(500).json({ error: 'Failed to create assignment' });
    }
    
    // Log the assignment in audit trail
    try {
      await supabaseService.logActivity({
        user_id: req.user.id,
        action: 'ASSIGN_THIRD_PARTY_TO_AGENCY',
        entity_type: 'assignment',
        entity_id: newAssignment.id,
        details: `Assigned third party ${third_party_contact_id} to agency ${agency_contact_id}`,
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });
    } catch (auditError) {
      console.warn('Failed to log assignment audit:', auditError);
    }
    
    console.log(`✅ Assignment created successfully:`, newAssignment.id);
    
    res.status(201).json({
      success: true,
      assignment: newAssignment
    });
    
  } catch (error) {
    console.error('Error in assign-third-party endpoint:', error);
    res.status(500).json({ error: 'Failed to assign third party to agency' });
  }
});

/**
 * GET /api/admin/agencies
 * Get all agencies with performance metrics
 * BUSINESS RULE: Only contacts with assigned third parties are considered "agencies"
 */
router.get('/agencies', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    console.log(`📊 Admin agencies request from: ${req.user.email}`);
    
    // Get all potential agency contacts (those marked as agency OR those who have third party assignments)
    const { data: potentialAgencies, error: contactsError } = await supabaseService.client
      .from('contacts')
      .select(`
        id,
        first_name,
        last_name,
        display_name,
        email,
        phone_primary,
        company,
        contact_type,
        created_at,
        updated_at
      `)
      .in('contact_type', ['agency', 'third_party'])
      .eq('is_active', true);
    
    if (contactsError) {
      console.error('Error fetching contacts:', contactsError);
      return res.status(500).json({ error: 'Failed to fetch contacts' });
    }
    
    if (!potentialAgencies || potentialAgencies.length === 0) {
      return res.json({
        success: true,
        data: [],
        count: 0
      });
    }
    
    // Get all assignments to determine who qualifies as an "agency"
    const contactIds = potentialAgencies.map(c => c.id);
    const { data: allAssignments } = await supabaseService.client
      .from('agency_third_party_assignments')
      .select('agency_contact_id, third_party_contact_id, performance_score')
      .in('agency_contact_id', contactIds)
      .eq('is_active', true);
    
    // BUSINESS RULE: Only contacts with at least 1 third party assignment are "agencies"
    const agencyAssignmentMap = new Map();
    (allAssignments || []).forEach(assignment => {
      const agencyId = assignment.agency_contact_id;
      if (!agencyAssignmentMap.has(agencyId)) {
        agencyAssignmentMap.set(agencyId, []);
      }
      agencyAssignmentMap.get(agencyId).push(assignment);
    });
    
    // Filter to only true agencies (those with assignments)
    const trueAgencies = potentialAgencies.filter(contact => 
      agencyAssignmentMap.has(contact.id) && agencyAssignmentMap.get(contact.id).length > 0
    );
    
    console.log(`📋 Found ${potentialAgencies.length} potential agencies, ${trueAgencies.length} qualify as true agencies`);
    
    if (trueAgencies.length === 0) {
      return res.json({
        success: true,
        data: [],
        count: 0,
        message: 'No agencies found. Contacts must have assigned third parties to qualify as agencies.'
      });
    }
    
    // Get exchange participation data for metrics
    const agencyIds = trueAgencies.map(a => a.id);
    const { data: exchangeParticipants } = await supabaseService.client
      .from('exchange_participants')
      .select(`
        contact_id,
        exchanges!inner(
          id,
          status,
          exchange_value,
          property_value,
          client_contact_id,
          created_at
        )
      `)
      .in('contact_id', agencyIds);
    
    // Process true agencies with metrics
    const enrichedAgencies = trueAgencies.map(agency => {
      // Count assignments - use the map we built earlier
      const agencyAssignments = agencyAssignmentMap.get(agency.id) || [];
      
      // Calculate exchange metrics
      const agencyExchanges = exchangeParticipants?.filter(ep => ep.contact_id === agency.id) || [];
      const activeExchanges = agencyExchanges.filter(ep => 
        ['active', 'in_progress', 'In Progress'].includes(ep.exchanges.status)
      ).length;
      const completedExchanges = agencyExchanges.filter(ep => 
        ['completed', 'COMPLETED', 'Completed'].includes(ep.exchanges.status)
      ).length;
      
      const totalValue = agencyExchanges.reduce((sum, ep) => {
        const value = parseFloat(ep.exchanges.exchange_value || ep.exchanges.property_value || '0');
        return sum + value;
      }, 0);
      
      // Calculate success rate
      const successRate = agencyExchanges.length > 0 
        ? Math.round((completedExchanges / agencyExchanges.length) * 100)
        : 0;
      
      return {
        id: agency.id,
        name: agency.display_name || `${agency.first_name || ''} ${agency.last_name || ''}`.trim(),
        email: agency.email || '',
        phone: agency.phone_primary,
        status: 'active', // Default status
        created_at: agency.created_at,
        original_contact_type: agency.contact_type, // Track if they were originally marked as agency or promoted from third_party
        
        // Performance metrics
        total_clients: 0, // Would need client relationship data
        active_clients: 0,
        total_exchanges: agencyExchanges.length,
        active_exchanges: activeExchanges,
        completed_exchanges: completedExchanges,
        total_portfolio_value: totalValue,
        success_rate: successRate,
        average_completion_time: 30 + Math.round(Math.random() * 30), // Mock for now
        
        // Recent activity
        last_activity: agency.updated_at,
        monthly_growth: Math.round((Math.random() - 0.5) * 20), // Mock growth percentage
        
        // Assignments
        assigned_third_parties: agencyAssignments.length,
        pending_assignments: 0 // Would need pending assignment logic
      };
    });
    
    console.log(`✅ Returning ${enrichedAgencies.length} agencies`);
    
    res.json({
      success: true,
      data: enrichedAgencies,
      count: enrichedAgencies.length
    });
    
  } catch (error) {
    console.error('Error in admin agencies endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch agencies' });
  }
});

/**
 * GET /api/admin/third-parties
 * Get all third parties with assignment status
 * BUSINESS RULE: Excludes contacts who have become "agencies" by having third party assignments
 */
router.get('/third-parties', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    console.log(`📊 Admin third parties request from: ${req.user.email}`);
    
    // Get all potential third party contacts
    const { data: potentialThirdParties, error: tpError } = await supabaseService.client
      .from('contacts')
      .select(`
        id,
        first_name,
        last_name,
        display_name,
        email,
        phone_primary,
        company,
        contact_type,
        created_at,
        updated_at
      `)
      .in('contact_type', ['third_party', 'agency'])
      .eq('is_active', true);
    
    if (tpError) {
      console.error('Error fetching third parties:', tpError);
      return res.status(500).json({ error: 'Failed to fetch third parties' });
    }
    
    if (!potentialThirdParties || potentialThirdParties.length === 0) {
      return res.json({
        success: true,
        data: [],
        count: 0
      });
    }
    
    // Check who has become an "agency" by having third party assignments
    const contactIds = potentialThirdParties.map(c => c.id);
    const { data: agencyAssignments } = await supabaseService.client
      .from('agency_third_party_assignments')
      .select('agency_contact_id')
      .in('agency_contact_id', contactIds)
      .eq('is_active', true);
    
    // Contacts who have third parties assigned to them are now "agencies", not third parties
    const agencyContactIds = new Set((agencyAssignments || []).map(a => a.agency_contact_id));
    
    // Filter to only true third parties (those WITHOUT third party assignments)
    const trueThirdParties = potentialThirdParties.filter(contact => 
      !agencyContactIds.has(contact.id)
    );
    
    console.log(`📋 Found ${potentialThirdParties.length} potential third parties, ${trueThirdParties.length} are actual third parties`);
    console.log(`📋 ${agencyContactIds.size} contacts promoted to agencies due to having third party assignments`);
    
    if (trueThirdParties.length === 0) {
      return res.json({
        success: true,
        data: [],
        count: 0,
        message: 'No third parties found. Some contacts may have been promoted to agencies.'
      });
    }
    
    // Get assignment information for remaining third parties (as assignees, not assignors)
    const thirdPartyIds = trueThirdParties.map(tp => tp.id);
    const { data: assignments } = await supabaseService.client
      .from('agency_third_party_assignments')
      .select(`
        third_party_contact_id,
        agency_contact_id,
        performance_score,
        created_at,
        contacts!agency_third_party_assignments_agency_contact_id_fkey(
          display_name,
          first_name,
          last_name
        )
      `)
      .in('third_party_contact_id', thirdPartyIds)
      .eq('is_active', true);
    
    // Get exchange participation data
    const { data: exchangeParticipants } = await supabaseService.client
      .from('exchange_participants')
      .select(`
        contact_id,
        exchanges!inner(
          id,
          status,
          created_at
        )
      `)
      .in('contact_id', thirdPartyIds);
    
    // Process third parties with assignment data
    const enrichedThirdParties = trueThirdParties.map(tp => {
      const assignment = assignments?.find(a => a.third_party_contact_id === tp.id);
      const tpExchanges = exchangeParticipants?.filter(ep => ep.contact_id === tp.id) || [];
      const activeExchanges = tpExchanges.filter(ep => 
        ['active', 'in_progress', 'In Progress'].includes(ep.exchanges.status)
      ).length;
      
      return {
        id: tp.id,
        name: tp.display_name || `${tp.first_name || ''} ${tp.last_name || ''}`.trim(),
        email: tp.email || '',
        phone: tp.phone_primary,
        status: 'active',
        assigned_agency_id: assignment?.agency_contact_id || null,
        assigned_agency_name: assignment?.contacts ? 
          (assignment.contacts.display_name || `${assignment.contacts.first_name || ''} ${assignment.contacts.last_name || ''}`.trim()) : 
          null,
        
        // Performance
        exchanges_count: tpExchanges.length,
        active_exchanges: activeExchanges,
        documents_reviewed: Math.round(Math.random() * 50), // Mock for now
        avg_response_time: Math.round(12 + Math.random() * 48), // Mock response time in hours
        last_activity: tp.updated_at,
        
        // Mock additional data
        specialties: ['Real Estate', '1031 Exchanges'],
        experience_level: ['junior', 'senior', 'expert'][Math.floor(Math.random() * 3)]
      };
    });
    
    console.log(`✅ Returning ${enrichedThirdParties.length} third parties`);
    
    res.json({
      success: true,
      data: enrichedThirdParties,
      count: enrichedThirdParties.length
    });
    
  } catch (error) {
    console.error('Error in admin third-parties endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch third parties' });
  }
});

/**
 * GET /api/admin/agency-performance
 * Get agency performance analytics by time period
 */
router.get('/agency-performance', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    console.log(`📊 Admin agency performance request for period: ${period}`);
    
    // Calculate date range based on period
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default: // month
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    // Get agencies and third parties performance data
    const [agenciesRes, thirdPartiesRes] = await Promise.all([
      // Get agencies
      fetch(`${req.protocol}://${req.get('host')}/api/admin/agencies`, {
        headers: { Authorization: req.get('Authorization') }
      }),
      // Get third parties  
      fetch(`${req.protocol}://${req.get('host')}/api/admin/third-parties`, {
        headers: { Authorization: req.get('Authorization') }
      })
    ]);
    
    const agenciesData = await agenciesRes.json();
    const thirdPartiesData = await thirdPartiesRes.json();
    
    const agencies = (agenciesData.data || []).map(agency => ({
      id: agency.id,
      name: agency.name,
      exchanges_completed: agency.completed_exchanges,
      portfolio_value: agency.total_portfolio_value,
      success_rate: agency.success_rate,
      client_satisfaction: 85 + Math.round(Math.random() * 15), // Mock for now
      revenue_generated: agency.total_portfolio_value * 0.03 // Mock 3% fee
    }));
    
    const third_parties = (thirdPartiesData.data || []).map(tp => ({
      id: tp.id,
      name: tp.name,
      agency_name: tp.assigned_agency_name,
      exchanges_handled: tp.exchanges_count,
      avg_response_time: tp.avg_response_time,
      documents_processed: tp.documents_reviewed,
      performance_score: 70 + Math.round(Math.random() * 30) // Mock score
    }));
    
    res.json({
      success: true,
      period,
      agencies: agencies.sort((a, b) => b.success_rate - a.success_rate),
      third_parties: third_parties.sort((a, b) => b.performance_score - a.performance_score)
    });
    
  } catch (error) {
    console.error('Error in agency-performance endpoint:', error);
    res.status(500).json({ error: 'Failed to fetch agency performance data' });
  }
});

module.exports = router; 