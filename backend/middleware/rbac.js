const permissions = {
  admin: ['*'],
  coordinator: [
    'exchanges:read', 'exchanges:write', 
    'documents:read', 'documents:write',
    'tasks:read', 'tasks:write',
    'messages:read', 'messages:write',
    'contacts:read'
  ],
  client: [
    'exchanges:read',
    'documents:read',
    'messages:read', 'messages:write',
    'tasks:read'
  ],
  third_party: [
    'exchanges:read',
    'documents:read',
    'messages:read'
  ],
  agency: [
    'exchanges:read',
    'documents:read',
    'messages:read', 'messages:write'
  ]
};

function checkPermission(resource, action) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userPerms = permissions[req.user.role] || [];
    const requiredPermission = `${resource}:${action}`;

    if (userPerms.includes('*') || userPerms.includes(requiredPermission)) {
      next();
    } else {
      res.status(403).json({ error: 'Insufficient permissions' });
    }
  };
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (roles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({ error: 'Insufficient role permissions' });
    }
  };
}

function requireAdmin(req, res, next) {
  return requireRole(['admin'])(req, res, next);
}

module.exports = { checkPermission, requireRole, requireAdmin, permissions }; 