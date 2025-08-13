import React, { useState, useEffect } from 'react';
import {
  UserPlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  Cog6ToothIcon,
  CheckIcon,
  XMarkIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
}

interface ExchangeAccess {
  id: string;
  user_id: string;
  exchange_id: string;
  access_level: 'none' | 'read' | 'write' | 'admin';
  is_active: boolean;
  assigned_at: string;
  assigned_by: string;
  notes?: string;
  users: User;
}

interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  role_type: string;
  permissions: string[];
  is_default: boolean;
}

interface ExchangeUserManagementProps {
  exchangeId: string;
  onClose: () => void;
}

const ACCESS_LEVELS = [
  { value: 'none', label: 'No Access', color: 'gray', description: 'User cannot access this exchange' },
  { value: 'read', label: 'Read Only', color: 'blue', description: 'Can view but not modify' },
  { value: 'write', label: 'Read & Write', color: 'green', description: 'Can view and modify content' },
  { value: 'admin', label: 'Administrator', color: 'red', description: 'Full control over exchange' }
];

const PERMISSION_CATEGORIES = {
  overview: { icon: EyeIcon, label: 'Overview', permissions: ['view_overview'] },
  messages: { icon: ChatBubbleLeftRightIcon, label: 'Messages', permissions: ['view_messages', 'send_messages'] },
  tasks: { icon: ClipboardDocumentListIcon, label: 'Tasks', permissions: ['view_tasks', 'create_tasks', 'edit_tasks', 'assign_tasks'] },
  documents: { icon: DocumentTextIcon, label: 'Documents', permissions: ['view_documents', 'upload_documents', 'edit_documents', 'delete_documents'] },
  participants: { icon: UserGroupIcon, label: 'Participants', permissions: ['view_participants', 'manage_participants'] },
  admin: { icon: ShieldCheckIcon, label: 'Administration', permissions: ['admin_exchange', 'view_financial', 'edit_financial', 'view_reports'] }
};

export const ExchangeUserManagement: React.FC<ExchangeUserManagementProps> = ({
  exchangeId,
  onClose
}) => {
  const [users, setUsers] = useState<ExchangeAccess[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [templates, setTemplates] = useState<PermissionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUser, setShowAddUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ExchangeAccess | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Fetch exchange users
  const fetchExchangeUsers = async () => {
    try {
      const response = await fetch(`/api/exchanges/${exchangeId}/users`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching exchange users:', error);
    }
  };

  // Fetch all users for adding new ones
  const fetchAllUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAllUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching all users:', error);
    }
  };

  // Fetch permission templates
  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/admin/permission-templates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchExchangeUsers(),
        fetchAllUsers(),
        fetchTemplates()
      ]);
      setLoading(false);
    };

    loadData();
  }, [exchangeId]);

  // Add user to exchange
  const addUserToExchange = async (userId: string, accessLevel: string, templateId?: string) => {
    try {
      const response = await fetch(`/api/exchanges/${exchangeId}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          userId,
          accessLevel,
          templateId
        })
      });

      if (response.ok) {
        await fetchExchangeUsers();
        setShowAddUser(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error adding user to exchange:', error);
      return false;
    }
  };

  // Update user access level
  const updateUserAccess = async (userId: string, accessLevel: string) => {
    try {
      const response = await fetch(`/api/exchanges/${exchangeId}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ accessLevel })
      });

      if (response.ok) {
        await fetchExchangeUsers();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating user access:', error);
      return false;
    }
  };

  // Remove user from exchange
  const removeUserFromExchange = async (userId: string) => {
    try {
      const response = await fetch(`/api/exchanges/${exchangeId}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        await fetchExchangeUsers();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error removing user from exchange:', error);
      return false;
    }
  };

  // Get access level color
  const getAccessLevelColor = (level: string) => {
    const levelData = ACCESS_LEVELS.find(l => l.value === level);
    return levelData?.color || 'gray';
  };

  // Get access level label
  const getAccessLevelLabel = (level: string) => {
    const levelData = ACCESS_LEVELS.find(l => l.value === level);
    return levelData?.label || level;
  };

  // Bulk action handlers
  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(user => user.user_id));
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const bulkUpdateAccessLevel = async (accessLevel: string) => {
    try {
      const promises = selectedUsers.map(userId => 
        updateUserAccess(userId, accessLevel)
      );
      await Promise.all(promises);
      setSelectedUsers([]);
      setShowBulkActions(false);
      alert(`Successfully updated ${selectedUsers.length} users to ${getAccessLevelLabel(accessLevel)}`);
    } catch (error) {
      console.error('Bulk update failed:', error);
      alert('Some updates failed. Please try again.');
    }
  };

  const bulkRemoveUsers = async () => {
    if (!window.confirm(`Remove ${selectedUsers.length} users from this exchange?`)) return;
    
    try {
      const promises = selectedUsers.map(userId => 
        removeUserFromExchange(userId)
      );
      await Promise.all(promises);
      setSelectedUsers([]);
      setShowBulkActions(false);
      alert(`Successfully removed ${selectedUsers.length} users from exchange`);
    } catch (error) {
      console.error('Bulk removal failed:', error);
      alert('Some removals failed. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 overflow-hidden">
        <div className="absolute inset-0 bg-black bg-opacity-50" />
        <div className="absolute right-0 top-0 h-full w-full max-w-4xl bg-white shadow-xl">
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-4xl bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Exchange User Management</h2>
              <p className="text-sm text-gray-600 mt-1">
                Manage user access and permissions for this exchange
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {selectedUsers.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {selectedUsers.length} selected
                  </span>
                  <button
                    onClick={() => setShowBulkActions(!showBulkActions)}
                    className="px-3 py-1 bg-orange-100 text-orange-700 rounded-md text-sm hover:bg-orange-200"
                  >
                    Bulk Actions
                  </button>
                </div>
              )}
              <button
                onClick={() => setShowAddUser(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <UserPlusIcon className="h-4 w-4" />
                <span>Add User</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Bulk Actions Dropdown */}
          {showBulkActions && selectedUsers.length > 0 && (
            <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h4 className="text-sm font-medium text-orange-900 mb-3">
                Bulk Actions for {selectedUsers.length} users:
              </h4>
              <div className="flex flex-wrap gap-2">
                {ACCESS_LEVELS.filter(level => level.value !== 'none').map(level => (
                  <button
                    key={level.value}
                    onClick={() => bulkUpdateAccessLevel(level.value)}
                    className={`px-3 py-1 text-xs rounded-md bg-${level.color}-100 text-${level.color}-700 hover:bg-${level.color}-200`}
                  >
                    Set to {level.label}
                  </button>
                ))}
                <button
                  onClick={bulkRemoveUsers}
                  className="px-3 py-1 text-xs rounded-md bg-red-100 text-red-700 hover:bg-red-200"
                >
                  Remove All
                </button>
                <button
                  onClick={() => {
                    setSelectedUsers([]);
                    setShowBulkActions(false);
                  }}
                  className="px-3 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Users List */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Current Users ({users.length})</h3>
              {users.length > 0 && (
                <label className="flex items-center space-x-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === users.length}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Select All</span>
                </label>
              )}
            </div>
            
            {users.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <UserGroupIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No users assigned to this exchange</p>
                <button
                  onClick={() => setShowAddUser(true)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add First User
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {users.map((userAccess) => (
                  <div key={userAccess.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(userAccess.user_id)}
                          onChange={() => handleSelectUser(userAccess.user_id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium">
                            {userAccess.users.first_name?.[0]}{userAccess.users.last_name?.[0]}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">
                            {userAccess.users.first_name} {userAccess.users.last_name}
                          </h4>
                          <p className="text-sm text-gray-600">{userAccess.users.email}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs text-gray-500">Role: {userAccess.users.role}</span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${getAccessLevelColor(userAccess.access_level)}-100 text-${getAccessLevelColor(userAccess.access_level)}-800`}>
                              {getAccessLevelLabel(userAccess.access_level)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {/* Access Level Dropdown */}
                        <select
                          value={userAccess.access_level}
                          onChange={(e) => updateUserAccess(userAccess.user_id, e.target.value)}
                          className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {ACCESS_LEVELS.map(level => (
                            <option key={level.value} value={level.value}>
                              {level.label}
                            </option>
                          ))}
                        </select>
                        
                        {/* Custom Permissions Button */}
                        <button
                          onClick={() => {
                            setSelectedUser(userAccess);
                            setShowPermissionModal(true);
                          }}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                          title="Custom Permissions"
                        >
                          <Cog6ToothIcon className="h-4 w-4" />
                        </button>
                        
                        {/* Remove User Button */}
                        <button
                          onClick={() => {
                            if (window.confirm('Remove this user from the exchange?')) {
                              removeUserFromExchange(userAccess.user_id);
                            }
                          }}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-100 rounded"
                          title="Remove User"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    {userAccess.notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-600">
                        <span className="font-medium">Notes:</span> {userAccess.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <AddUserModal
          exchangeId={exchangeId}
          availableUsers={allUsers.filter(user => 
            !users.some(existingUser => existingUser.user_id === user.id)
          )}
          templates={templates}
          onAdd={addUserToExchange}
          onClose={() => setShowAddUser(false)}
        />
      )}

      {/* Custom Permissions Modal */}
      {showPermissionModal && selectedUser && (
        <CustomPermissionsModal
          user={selectedUser}
          exchangeId={exchangeId}
          onClose={() => {
            setShowPermissionModal(false);
            setSelectedUser(null);
            fetchExchangeUsers();
          }}
        />
      )}
    </div>
  );
};

// Add User Modal Component
const AddUserModal: React.FC<{
  exchangeId: string;
  availableUsers: User[];
  templates: PermissionTemplate[];
  onAdd: (userId: string, accessLevel: string, templateId?: string) => Promise<boolean>;
  onClose: () => void;
}> = ({ availableUsers, templates, onAdd, onClose }) => {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [accessLevel, setAccessLevel] = useState('read');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    setLoading(true);
    const success = await onAdd(selectedUserId, accessLevel, selectedTemplate || undefined);
    setLoading(false);

    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-60 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-75" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Add User to Exchange</h3>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* User Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select User
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              >
                <option value="">Choose a user...</option>
                {availableUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.first_name} {user.last_name} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Access Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Access Level
              </label>
              <select
                value={accessLevel}
                onChange={(e) => setAccessLevel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {ACCESS_LEVELS.filter(level => level.value !== 'none').map(level => (
                  <option key={level.value} value={level.value}>
                    {level.label} - {level.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Permission Template */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Permission Template (Optional)
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Use default for access level</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name} - {template.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedUserId}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Custom Permissions Modal Component
const CustomPermissionsModal: React.FC<{
  user: ExchangeAccess;
  exchangeId: string;
  onClose: () => void;
}> = ({ user, exchangeId, onClose }) => {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserPermissions = async () => {
      try {
        const response = await fetch(`/api/exchanges/${exchangeId}/users/${user.user_id}/permissions`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setPermissions(data.map((p: any) => p.permission_type));
        }
      } catch (error) {
        console.error('Error fetching user permissions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserPermissions();
  }, [user.user_id, exchangeId]);

  const updatePermissions = async () => {
    try {
      const response = await fetch(`/api/exchanges/${exchangeId}/users/${user.user_id}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ permissions })
      });

      if (response.ok) {
        onClose();
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
    }
  };

  const togglePermission = (permission: string) => {
    setPermissions(prev => 
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-60 overflow-hidden">
        <div className="absolute inset-0 bg-black bg-opacity-75" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-60 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-75" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Custom Permissions: {user.users.first_name} {user.users.last_name}
            </h3>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            <div className="space-y-6">
              {Object.entries(PERMISSION_CATEGORIES).map(([category, info]) => {
                const CategoryIcon = info.icon;
                return (
                  <div key={category} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <CategoryIcon className="h-5 w-5 text-gray-600" />
                      <h4 className="font-medium text-gray-900">{info.label}</h4>
                    </div>
                    <div className="space-y-2">
                      {info.permissions.map(permission => (
                        <label key={permission} className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={permissions.includes(permission)}
                            onChange={() => togglePermission(permission)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">
                            {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={updatePermissions}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save Permissions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};