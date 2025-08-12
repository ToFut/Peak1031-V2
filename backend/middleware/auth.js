const jwt = require('jsonwebtoken');
// const { User, AuditLog } = require('../models'); // Disabled - using Supabase
const AuthService = require('../services/auth');
const databaseService = require('../services/database');

/**
 * JWT Authentication Middleware
 * Verifies JWT tokens and attaches user to request
 */
async function authenticateToken(req, res, next) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : null;

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid authentication token'
      });
    }

    // Verify and decode token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (jwtError) {
      console.log('❌ JWT verification failed:', jwtError.message);
      return res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is malformed or invalid'
      });
    }
    
    // Check if token is expired
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Please refresh your authentication token'
      });
    }

    // Find user and verify account status
    console.log('🔍 AUTH MIDDLEWARE: Looking for user with ID:', decoded.userId);
    
    // Use database service which handles both Supabase and SQLite
    const user = await databaseService.getUserById(decoded.userId);

    if (!user) {
      console.log('❌ AUTH MIDDLEWARE: User not found for ID:', decoded.userId);
      return res.status(401).json({
        error: 'Invalid token',
        message: 'User associated with token not found'
      });
    }

    console.log('✅ AUTH MIDDLEWARE: User found:', user.email, 'isActive:', user.is_active || user.isActive);
    
    // Check if user is active (handle both Supabase snake_case and Sequelize camelCase)
    const isActive = user.is_active !== undefined ? user.is_active : user.isActive;
    if (!isActive) {
      console.log('❌ AUTH MIDDLEWARE: User account disabled:', user.email);
      return res.status(403).json({
        error: 'Account disabled',
        message: 'Your account has been disabled. Please contact support.'
      });
    }

    // Check for account lockout (only if locked_until column exists)
    if (user.locked_until && new Date() < user.locked_until) {
      const unlockTime = new Date(user.locked_until).toISOString();
      return res.status(423).json({
        error: 'Account locked',
        message: `Account is temporarily locked until ${unlockTime}`
      });
    }

    // Attach user to request
    req.user = user;
    req.token = token;
    
    // Debug log for RBAC
    console.log('🔐 AUTH: User authenticated:', {
      id: user.id,
      email: user.email,
      role: user.role,
      contact_id: user.contact_id
    });

    // Update last activity (async, don't wait)
    setImmediate(async () => {
      try {
        await databaseService.updateUser(user.id, { 
          last_login: new Date().toISOString()
          // Note: failed_login_attempts field doesn't exist in people table
        });
      } catch (error) {
        console.error('Error updating user last activity:', error.message);
      }
    });

    next();

  } catch (error) {
    // Handle specific JWT errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is malformed or invalid'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Please refresh your authentication token'
      });
    }

    console.error('❌ AUTH MIDDLEWARE: Unexpected error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      message: 'An unexpected error occurred during authentication'
    });
  }
}

/**
 * Optional Authentication Middleware
 * Attaches user if token is provided, but doesn't require it
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : null;

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (decoded.exp && decoded.exp >= Date.now() / 1000) {
        const user = await User.findByPk(decoded.userId, {
          attributes: { exclude: ['password_hash', 'two_fa_secret'] }
        });
        
        if (user && user.is_active) {
          req.user = user;
          req.token = token;
        }
      }
    }

    next();
  } catch (error) {
    // For optional auth, we continue even if token is invalid
    next();
  }
}

/**
 * Role-based authorization middleware factory
 * @param {string|Array} allowedRoles - Role(s) that can access the resource
 * @param {Object} options - Additional options
 */
function requireRole(allowedRoles, options = {}) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'Please log in to access this resource'
        });
      }

      // Admin role has access to everything (unless explicitly excluded)
      if (req.user.role === 'admin' && !options.excludeAdmin) {
        return next();
      }

      // Check if user's role is in allowed roles
      if (!roles.includes(req.user.role)) {
        // Log unauthorized access attempt
        await AuditLog.create({
          action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
          entity_type: 'endpoint',
          entity_id: null,
          user_id: req.user.id,
          ip_address: req.ip,
          user_agent: req.get('User-Agent'),
          details: {
            path: req.path,
            method: req.method,
            required_roles: roles,
            user_role: req.user.role
          }
        });

        return res.status(403).json({
          error: 'Insufficient permissions',
          message: `Access denied. Required role(s): ${roles.join(', ')}`
        });
      }

      next();
    } catch (error) {
      console.error('Role authorization error:', error);
      return res.status(500).json({
        error: 'Authorization error',
        message: 'An error occurred during authorization'
      });
    }
  };
}

/**
 * Resource-based authorization middleware
 * Checks if user can access specific resources (exchanges, documents, etc.)
 */
function requireResourceAccess(resourceType, options = {}) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required'
        });
      }

      const resourceId = req.params.id || req.params.exchangeId || req.params.documentId;
      
      if (!resourceId) {
        return res.status(400).json({
          error: 'Resource ID required'
        });
      }

      // Admin has access to all resources (unless excluded)
      if (req.user.role === 'admin' && !options.excludeAdmin) {
        return next();
      }

      const hasAccess = await checkResourceAccess(req.user, resourceType, resourceId, options);
      
      if (!hasAccess) {
        await AuditLog.create({
          action: 'UNAUTHORIZED_RESOURCE_ACCESS',
          entityType: resourceType,
          entityId: resourceId,
          userId: req.user.id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          details: {
            path: req.path,
            method: req.method,
            resourceType: resourceType,
            access_type: options.accessType || 'read'
          }
        });

        return res.status(403).json({
          error: 'Access denied',
          message: `You do not have permission to access this ${resourceType}`
        });
      }

      next();
    } catch (error) {
      console.error('Resource authorization error:', error);
      return res.status(500).json({
        error: 'Authorization error'
      });
    }
  };
}

/**
 * Check if user has access to a specific resource
 */
async function checkResourceAccess(user, resourceType, resourceId, options = {}) {
  // TODO: Implement Supabase resource access checks
  return true; // Temporarily allow all access
  
  // const { ExchangeParticipant, Exchange, Document, Task } = require('../models');
  
  try {
    switch (resourceType) {
      case 'exchange':
        return await checkExchangeAccess(user, resourceId, options);
      
      case 'document':
        return await checkDocumentAccess(user, resourceId, options);
      
      case 'task':
        return await checkTaskAccess(user, resourceId, options);
      
      default:
        return false;
    }
  } catch (error) {
    console.error(`Error checking ${resourceType} access:`, error);
    return false;
  }
}

async function checkExchangeAccess(user, exchangeId, options = {}) {
  // TODO: Implement Supabase exchange access checks
  return true; // Temporarily allow all access
  
  // const { ExchangeParticipant, Exchange } = require('../models');
  
  // Staff and coordinators can access exchanges they're assigned to
  if (['staff', 'coordinator'].includes(user.role)) {
    const exchange = await Exchange.findByPk(exchangeId);
    if (exchange && exchange.coordinator_id === user.id) {
      return true;
    }
  }

  // Check if user is a participant in the exchange
  const participation = await ExchangeParticipant.findOne({
    where: {
      exchange_id: exchangeId,
      user_id: user.id
    }
  });

  if (participation) {
    // Check specific permission if provided
    if (options.permission) {
      return participation.permissions && participation.permissions[options.permission];
    }
    return true;
  }

  // For client role, check if they're the client of the exchange
  if (user.role === 'client') {
    // TODO: Implement Supabase client access check
    return true; // Temporarily allow all access
    
    // const { Contact } = require('../models');
    // const userContact = await Contact.findOne({ where: { user_id: user.id } });
    
    if (userContact) {
      const exchange = await Exchange.findOne({
        where: {
          id: exchangeId,
          client_id: userContact.id
        }
      });
      return !!exchange;
    }
  }

  return false;
}

async function checkDocumentAccess(user, documentId, options = {}) {
  // TODO: Implement Supabase document access checks
  return true; // Temporarily allow all access
  
  // const { Document } = require('../models');
  
  const document = await Document.findByPk(documentId, {
    include: [{ model: Exchange, as: 'exchange' }]
  });

  if (!document) {
    return false;
  }

  // Check exchange access first
  const exchangeAccess = await checkExchangeAccess(user, document.exchange_id, options);
  if (!exchangeAccess) {
    return false;
  }

  // Check document-specific permissions based on user role
  switch (user.role) {
    case 'client':
      // Clients can view most documents, but upload restrictions may apply
      return options.accessType !== 'upload' || document.client_uploadable;
    
    case 'third_party':
      // Third parties usually have read-only access
      return options.accessType === 'read' || options.accessType === 'download';
    
    case 'staff':
    case 'coordinator':
      // Staff can generally access all documents in their exchanges
      return true;
    
    default:
      return false;
  }
}

async function checkTaskAccess(user, taskId, options = {}) {
  // TODO: Implement Supabase task access checks
  return true; // Temporarily allow all access
  
  // const { Task } = require('../models');
  
  const task = await Task.findByPk(taskId);
  if (!task) {
    return false;
  }

  // Check if user is assigned to the task
  if (task.assigned_to === user.id) {
    return true;
  }

  // Check exchange access
  if (task.exchange_id) {
    return await checkExchangeAccess(user, task.exchange_id, options);
  }

  return false;
}

/**
 * Two-Factor Authentication middleware
 * Requires 2FA verification for sensitive operations
 */
function require2FA(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required'
    });
  }

  // Check if user has 2FA enabled
  if (!req.user.two_fa_enabled) {
    return res.status(403).json({
      error: '2FA required',
      message: 'Two-factor authentication must be enabled for this operation'
    });
  }

  // Check for 2FA verification in session or headers
  const twoFAVerified = req.session?.twoFAVerified || req.headers['x-2fa-verified'];
  
  if (!twoFAVerified) {
    return res.status(403).json({
      error: '2FA verification required',
      message: 'Please verify your identity with two-factor authentication'
    });
  }

  next();
}

/**
 * Rate limiting for authentication endpoints
 */
function authRateLimit(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
  const attempts = new Map();

  return (req, res, next) => {
    const key = req.ip + (req.body?.email || '');
    const now = Date.now();
    
    // Clean old entries
    for (const [k, data] of attempts.entries()) {
      if (now - data.firstAttempt > windowMs) {
        attempts.delete(k);
      }
    }

    const userAttempts = attempts.get(key);
    
    if (!userAttempts) {
      attempts.set(key, { count: 1, firstAttempt: now });
      return next();
    }

    if (userAttempts.count >= maxAttempts) {
      return res.status(429).json({
        error: 'Too many attempts',
        message: `Too many authentication attempts. Please try again in ${Math.ceil(windowMs / 60000)} minutes.`,
        retryAfter: Math.ceil((windowMs - (now - userAttempts.firstAttempt)) / 1000)
      });
    }

    userAttempts.count++;
    next();
  };
}

/**
 * Middleware to validate JWT token format without full authentication
 */
function validateTokenFormat(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (authHeader && !authHeader.startsWith('Bearer ')) {
    return res.status(400).json({
      error: 'Invalid token format',
      message: 'Authorization header must use Bearer token format'
    });
  }

  const token = authHeader?.slice(7);
  
  if (token && token.split('.').length !== 3) {
    return res.status(400).json({
      error: 'Invalid token format',
      message: 'JWT token must have three parts separated by dots'
    });
  }

  next();
}

/**
 * Middleware to check if user's email is verified
 */
function requireEmailVerification(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required'
    });
  }

  if (!req.user.email_verified) {
    return res.status(403).json({
      error: 'Email verification required',
      message: 'Please verify your email address before accessing this resource'
    });
  }

  next();
}

/**
 * Combine multiple auth middlewares
 */
function combineAuth(...middlewares) {
  return (req, res, next) => {
    let index = 0;
    
    function nextMiddleware(error) {
      if (error) return next(error);
      
      if (index >= middlewares.length) {
        return next();
      }
      
      const middleware = middlewares[index++];
      middleware(req, res, nextMiddleware);
    }
    
    nextMiddleware();
  };
}

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole,
  requireResourceAccess,
  require2FA,
  authRateLimit,
  validateTokenFormat,
  requireEmailVerification,
  combineAuth,
  checkResourceAccess
};