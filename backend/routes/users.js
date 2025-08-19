const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { enforceRBAC } = require('../middleware/rbac');

// Simple permission check function
const checkPermission = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check if user has required role(s)
    const userRole = req.user.role;
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    
    if (requiredRoles.includes(userRole)) {
      console.log(`🔐 Permission granted: ${userRole} user accessing restricted resource`);
      next();
    } else {
      console.log(`❌ Permission denied: ${userRole} user accessing restricted resource (required: ${requiredRoles.join(', ')})`);
      res.status(403).json({ error: 'Insufficient permissions' });
    }
  };
};
const databaseService = require('../services/database');
const AuthService = require('../services/auth');
const bcrypt = require('bcryptjs');
const { transformToCamelCase, transformToSnakeCase } = require('../utils/caseTransform');
const { Op } = require('sequelize');

const router = express.Router();

// Get all users with filtering and pagination
router.get('/', authenticateToken, checkPermission(['admin', 'coordinator', 'client']), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      role, 
      isActive, 
      sortBy = 'created_at', 
      sortOrder = 'DESC' 
    } = req.query;
    
    const whereClause = {};
    
    if (search) {
      whereClause[Op.or] = [
        { first_name: { [Op.like]: `%${search}%` } },
        { last_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (role) {
      whereClause.role = role;
    }
    
    if (isActive !== undefined) {
      whereClause.is_active = isActive === 'true';
    }

    const options = {
      where: whereClause,
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      orderBy: { column: sortBy, ascending: sortOrder === 'ASC' }
    };

    const users = await databaseService.getUsers(options);
    
    // Transform to camelCase for frontend
    const transformedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.first_name || user.firstName,
      lastName: user.last_name || user.lastName,
      role: user.role,
      isActive: user.is_active !== false,
      emailVerified: true, // Default since email_verified column doesn't exist
      twoFaEnabled: user.two_fa_enabled || false,
      lastLogin: user.last_login || user.lastLogin,
      createdAt: user.created_at || user.createdAt,
      updatedAt: user.updated_at || user.updatedAt
    }));

    res.json({
      data: transformedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: users.length,
        totalPages: Math.ceil(users.length / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single user by ID
router.get('/:id', authenticateToken, checkPermission(['admin', 'coordinator']), async (req, res) => {
  try {
    const user = await databaseService.getUserById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Transform to camelCase
    const transformedUser = {
      id: user.id,
      email: user.email,
      firstName: user.first_name || user.firstName,
      lastName: user.last_name || user.lastName,
      role: user.role,
      isActive: user.is_active !== false,
      emailVerified: true, // Default since email_verified column doesn't exist
      twoFaEnabled: user.two_fa_enabled || false,
      lastLogin: user.last_login || user.lastLogin,
      createdAt: user.created_at || user.createdAt,
      updatedAt: user.updated_at || user.updatedAt
    };

    res.json(transformedUser);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new user
router.post('/', [
  authenticateToken,
  checkPermission(['admin']),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('firstName').trim().isLength({ min: 1 }),
  body('lastName').trim().isLength({ min: 1 }),
  body('role').isIn(['admin', 'coordinator', 'client', 'agency', 'third_party'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, firstName, lastName, role } = req.body;

    // Check if user already exists
    const existingUser = await databaseService.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    const userData = {
      email,
      password_hash: hashedPassword,
      first_name: firstName,
      last_name: lastName,
      role,
      is_active: true,
      // email_verified column doesn't exist in database
      two_fa_enabled: false
    };

    const newUser = await databaseService.createUser(userData);

    // Transform response
    const transformedUser = {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.first_name || newUser.firstName,
      lastName: newUser.last_name || newUser.lastName,
      role: newUser.role,
      isActive: newUser.is_active !== false,
      emailVerified: true, // Default to true since column doesn't exist
      twoFaEnabled: newUser.two_fa_enabled || false,
      createdAt: newUser.created_at || newUser.createdAt
    };

    res.status(201).json(transformedUser);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user
router.put('/:id', [
  authenticateToken,
  checkPermission(['admin']),
  body('email').optional().isEmail().normalizeEmail(),
  body('firstName').optional().trim().isLength({ min: 1 }),
  body('lastName').optional().trim().isLength({ min: 1 }),
  body('role').optional().isIn(['admin', 'coordinator', 'client', 'agency', 'third_party']),
  body('isActive').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await databaseService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updateData = {};
    
    if (req.body.email) updateData.email = req.body.email;
    if (req.body.firstName) updateData.first_name = req.body.firstName;
    if (req.body.lastName) updateData.last_name = req.body.lastName;
    if (req.body.role) updateData.role = req.body.role;
    if (req.body.isActive !== undefined) updateData.is_active = req.body.isActive;

    const updatedUser = await databaseService.updateUser(req.params.id, updateData);

    // Transform response
    const transformedUser = {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.first_name || updatedUser.firstName,
      lastName: updatedUser.last_name || updatedUser.lastName,
      role: updatedUser.role,
      isActive: updatedUser.is_active !== false,
      emailVerified: true, // Default since email_verified column doesn't exist
      twoFaEnabled: updatedUser.two_fa_enabled || false,
      updatedAt: updatedUser.updated_at || updatedUser.updatedAt
    };

    res.json(transformedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Change user password
router.put('/:id/password', [
  authenticateToken,
  checkPermission(['admin']),
  body('newPassword').isLength({ min: 8 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await databaseService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const hashedPassword = await bcrypt.hash(req.body.newPassword, 12);
    await databaseService.updateUser(req.params.id, { password_hash: hashedPassword });

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: error.message });
  }
});

// Activate user
router.put('/:id/activate', authenticateToken, checkPermission(['admin']), async (req, res) => {
  try {
    const user = await databaseService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Activate user by setting is_active to true
    await databaseService.updateUser(req.params.id, { is_active: true });

    res.json({ message: 'User activated successfully' });
  } catch (error) {
    console.error('Error activating user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Deactivate user (soft delete)
router.delete('/:id', authenticateToken, checkPermission(['admin']), async (req, res) => {
  try {
    const user = await databaseService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Soft delete by setting is_active to false
    await databaseService.updateUser(req.params.id, { is_active: false });

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user statistics for dashboard
router.get('/statistics/overview', authenticateToken, checkPermission(['admin']), async (req, res) => {
  try {
    const users = await databaseService.getUsers();
    
    const stats = {
      total: users.length,
      active: users.filter(u => u.is_active !== false).length,
      inactive: users.filter(u => u.is_active === false).length,
      byRole: {
        admin: users.filter(u => u.role === 'admin').length,
        coordinator: users.filter(u => u.role === 'coordinator').length,
        client: users.filter(u => u.role === 'client').length,
        agency: users.filter(u => u.role === 'agency').length,
        third_party: users.filter(u => u.role === 'third_party').length
      },
      verified: users.length, // All users considered verified since email_verified column doesn't exist
      twoFaEnabled: users.filter(u => u.two_fa_enabled).length,
      recentLogins: users.filter(u => {
        const lastLogin = u.last_login || u.lastLogin;
        if (!lastLogin) return false;
        const loginDate = new Date(lastLogin);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return loginDate > weekAgo;
      }).length
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user activities
router.get('/:userId/activities', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;
    
    // Fetch recent activities from audit logs
    const activities = await databaseService.getAuditLogs({
      where: { userId },
      limit: parseInt(limit),
      orderBy: { column: 'created_at', ascending: false }
    });
    
    // Transform activities
    const formattedActivities = activities.map(activity => ({
      id: activity.id,
      action: activity.action,
      entity: activity.entity_type,
      entityId: activity.entity_id,
      details: activity.details,
      timestamp: activity.created_at,
      ipAddress: activity.ip_address
    }));
    
    res.json({ data: formattedActivities });
  } catch (error) {
    console.error('Error fetching user activities:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 