const jwt = require('jsonwebtoken');
const databaseService = require('./services/database');

async function debugAdminAuth() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyNzgzMDRkZS01NjhmLTQxMzgtYjM1Yi02ZmRjZmJkMmYxY2UiLCJlbWFpbCI6ImFkbWluQHBlYWsxMDMxLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1NDYyNDk1MywiZXhwIjoxNzU0NzExMzUzfQ.AVdtn9NQXyS7t2gaQWBnPcWK-buAvc9QdHTxnDnGRUI';
  
  try {
    console.log('🧪 Debugging admin authentication...\n');
    
    // Decode JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log('🔑 JWT Decoded:', decoded);
    
    // Get user from database
    const user = await databaseService.getUserById(decoded.userId);
    console.log('👤 User from database:', user);
    
    // Check permissions
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
      ]
    };
    
    const userRole = user.role;
    const userPerms = permissions[userRole] || [];
    const requiredPermission = 'messages:write';
    
    console.log('🔐 Permission check:');
    console.log('   User role:', userRole);
    console.log('   User permissions:', userPerms);
    console.log('   Required permission:', requiredPermission);
    console.log('   Has * permission:', userPerms.includes('*'));
    console.log('   Has specific permission:', userPerms.includes(requiredPermission));
    console.log('   Should pass:', userPerms.includes('*') || userPerms.includes(requiredPermission));
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

require('dotenv').config();
debugAdminAuth();