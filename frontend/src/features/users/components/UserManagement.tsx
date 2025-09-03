import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { apiService } from '../../../services/api';
import ModernCard from '../../../components/ui/ModernCard';
import StatusBadge from '../../../components/ui/StatusBadge';
import ModernDropdown from '../../../components/ui/ModernDropdown';

import {
  UserIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckIcon,
  XMarkIcon,
  EnvelopeIcon,
  PhoneIcon,
  ShieldCheckIcon,
  KeyIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ViewColumnsIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline';

import { User } from '../types';

interface UserFormData {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'client' | 'coordinator' | 'third_party' | 'agency';
  phone?: string;
  isActive: boolean;
}

const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all'); // New: users, contacts, or all
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'client',
    phone: '',
    isActive: true
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const roleOptions = [
    { value: 'all', label: 'All Roles' },
    { value: 'admin', label: 'Admin' },
    { value: 'coordinator', label: 'Exchange Coordinator' },
    { value: 'client', label: 'Client' },
    { value: 'third_party', label: 'Third Party' },
    { value: 'agency', label: 'Agency' }
  ];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ];

  const typeOptions = [
    { value: 'all', label: 'All (Users & Contacts)' },
    { value: 'users', label: 'Users Only' },
    { value: 'contacts', label: 'Contacts Only' }
  ];

  useEffect(() => {
    loadUsers();
    loadContacts();
  }, [currentPage, roleFilter, statusFilter, searchTerm, typeFilter]);

  const loadContacts = async () => {
    if (typeFilter === 'users') return; // Skip if only showing users
    
    try {
      const response = await apiService.getContacts({
        search: searchTerm || undefined,
        limit: 500 // Increased limit to ensure all contacts are loaded
      });
      
      console.log('📋 Contacts API response:', response);
      // Handle the response structure - it could be an array or an object with contacts/data property
      let contactsData: any[] = [];
      if (Array.isArray(response)) {
        contactsData = response;
      } else if (response && typeof response === 'object') {
        contactsData = (response as any).contacts || (response as any).data || [];
      }
      setContacts(contactsData);
    } catch (error) {
      console.error('Failed to load contacts:', error);
      setContacts([]);
    }
  };

  const loadUsers = async () => {
    if (typeFilter === 'contacts') return; // Skip if only showing contacts
    
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(roleFilter !== 'all' && { role: roleFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter })
      });

      console.log('🔍 Loading users with params:', {
        page: currentPage,
        limit: 20,
        search: searchTerm || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined
      });
      
      const response = await apiService.getUsers({
        page: currentPage,
        limit: 20,
        search: searchTerm || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined
      });
      
      console.log('📋 Users API response:', response);
      
      if (Array.isArray(response)) {
        // Apply client-side filtering if backend doesn't support it
        let filteredUsers = response;
        
        if (searchTerm) {
          const search = searchTerm.toLowerCase();
          filteredUsers = filteredUsers.filter(user =>
            (user.email || '').toLowerCase().includes(search) ||
            (user.first_name || '').toLowerCase().includes(search) ||
            (user.last_name || '').toLowerCase().includes(search)
          );
        }
        
        if (roleFilter !== 'all') {
          filteredUsers = filteredUsers.filter(user => user.role === roleFilter);
        }
        
        if (statusFilter !== 'all') {
          filteredUsers = filteredUsers.filter(user => 
            statusFilter === 'active' ? user.is_active : !user.is_active
          );
        }
        
        setUsers(filteredUsers as any);
        setTotalPages(1); // Single page for client-side filtering
      } else if (Array.isArray(response)) {
        setUsers(response);
        setTotalPages(1);
      } else if (response && typeof response === 'object' && 'data' in response) {
        const responseData = response as any;
        if (Array.isArray(responseData.data)) {
          setUsers(responseData.data);
          if (responseData.pagination) {
            setTotalPages(responseData.pagination.totalPages || 1);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }

    if (!showEditModal && !formData.password) {
      errors.password = 'Password is required for new users';
    } else if (!showEditModal && formData.password && formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (!formData.firstName) {
      errors.firstName = 'First name is required';
    }

    if (!formData.lastName) {
      errors.lastName = 'Last name is required';
    }

    if (formData.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      errors.phone = 'Phone number is invalid';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateUser = async () => {
    if (!validateForm()) return;

    try {
      await apiService.createUser(formData);
      setShowCreateModal(false);
      resetForm();
      loadUsers();
    } catch (error: any) {
      setFormErrors({ submit: error.message || 'Failed to create user' });
    }
  };

  const handleUpdateUser = async () => {
    if (!validateForm() || !selectedUser) return;

    try {
      await apiService.updateUser(selectedUser.id, formData);
      setShowEditModal(false);
      resetForm();
      loadUsers();
    } catch (error: any) {
      setFormErrors({ submit: error.message || 'Failed to update user' });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await apiService.deleteUser(userId);
      loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user. Please try again.');
    }
  };

  const handleActivateUser = async (userId: string) => {
    try {
      await apiService.activateUser(userId);
      loadUsers();
    } catch (error) {
      console.error('Failed to activate user:', error);
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    try {
      await apiService.deactivateUser(userId);
      loadUsers();
    } catch (error) {
      console.error('Failed to deactivate user:', error);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role as any,
      phone: (user as any).phone || '',
      isActive: user.is_active
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: 'client',
      phone: '',
      isActive: true
    });
    setFormErrors({});
    setSelectedUser(null);
  };

  // Combine users and contacts into a single display dataset with filtering
  const getCombinedData = () => {
    const combinedData: any[] = [];
    
    // Add users with type flag
    if (typeFilter === 'all' || typeFilter === 'users') {
      // Don't filter users here since the API already does the search
      // The backend filters when we pass searchTerm to loadUsers
      let filteredUsers = users;
      
      // Apply role filter (only for users)
      if (roleFilter !== 'all') {
        filteredUsers = filteredUsers.filter(user => user.role === roleFilter);
      }
      
      // Apply status filter
      if (statusFilter !== 'all') {
        filteredUsers = filteredUsers.filter(user => 
          statusFilter === 'active' ? user.is_active : !user.is_active
        );
      }
      
      filteredUsers.forEach(user => {
        combinedData.push({
          ...user,
          _type: 'user',
          _displayName: `${user.first_name} ${user.last_name}`,
          _email: user.email,
          _phone: (user as any).phone,
          _status: user.is_active ? 'active' : 'inactive'
        });
      });
    }
    
    // Add contacts with type flag
    if (typeFilter === 'all' || typeFilter === 'contacts') {
      // Don't filter contacts here since the API already does the search
      // The backend filters when we pass searchTerm to loadContacts
      let filteredContacts = contacts;
      
      // Apply status filter
      if (statusFilter !== 'all') {
        filteredContacts = filteredContacts.filter(contact => {
          const contactStatus = contact.status || 'active';
          return statusFilter === 'active' ? contactStatus === 'active' : contactStatus !== 'active';
        });
      }
      
      filteredContacts.forEach(contact => {
        combinedData.push({
          ...contact,
          _type: 'contact',
          _displayName: `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unnamed Contact',
          _email: contact.email,
          _phone: contact.phone,
          _status: contact.status || 'active'
        });
      });
    }
    
    return combinedData;
  };
  
  const combinedData = getCombinedData();

  const exportUsers = () => {
    const csv = [
      ['Email', 'First Name', 'Last Name', 'Role', 'Phone', 'Status', 'Created At', 'Last Login'].join(','),
      ...users.map(user => [
        user.email,
        user.first_name,
        user.last_name,
        user.role,
        (user as any).phone || '',
        user.is_active ? 'Active' : 'Inactive',
        new Date(user.created_at).toLocaleDateString(),
        user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'red';
      case 'coordinator': return 'blue';
      case 'client': return 'green';
      case 'third_party': return 'yellow';
      case 'agency': return 'purple';
      default: return 'gray';
    }
  };

  const getRoleDisplayName = (role: string | null | undefined) => {
    if (!role) return 'Unknown';
    
    switch (role) {
      case 'admin': return 'Admin';
      case 'coordinator': return 'Coordinator';
      case 'client': return 'Client';
      case 'third_party': return 'Third Party';
      case 'agency': return 'Agency';
      default: return role;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
        <div className="flex gap-3">
          {/* View Toggle */}
          <button
            onClick={() => setViewMode(viewMode === 'card' ? 'table' : 'card')}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {viewMode === 'card' ? (
              <>
                <ViewColumnsIcon className="h-5 w-5" />
                Table View
              </>
            ) : (
              <>
                <Squares2X2Icon className="h-5 w-5" />
                Card View
              </>
            )}
          </button>
          <button
            onClick={exportUsers}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            Export
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            Add User
          </button>
        </div>
      </div>

      {/* Filters */}
      <ModernCard>
        <div className="p-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <ModernDropdown
              options={roleOptions}
              value={roleFilter}
              onChange={setRoleFilter}
              className="w-48"
            />
            <ModernDropdown
              options={statusOptions}
              value={statusFilter}
              onChange={setStatusFilter}
              className="w-48"
            />
            <ModernDropdown
              options={typeOptions}
              value={typeFilter}
              onChange={setTypeFilter}
              className="w-48"
            />
          </div>
        </div>
      </ModernCard>

      {/* Users Display */}
      <ModernCard>
        {viewMode === 'table' ? (
          <div className="overflow-x-auto">
            <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {combinedData.map((item) => (
                <tr key={`${item._type}-${item.id}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <UserIcon className="h-6 w-6 text-gray-500" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          {item._displayName}
                          {item._type === 'contact' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              Contact
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                          <EnvelopeIcon className="h-4 w-4" />
                          {item._email}
                        </div>
                        {item._phone && (
                          <div className="text-sm text-gray-500 flex items-center gap-2">
                            <PhoneIcon className="h-4 w-4" />
                            {item._phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item._type === 'user' ? (
                      <>
                        <StatusBadge
                          status={getRoleDisplayName(item.role)}
                        />
                        {item.two_fa_enabled && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 text-xs text-green-700">
                              <ShieldCheckIcon className="h-3 w-3" />
                              2FA
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <StatusBadge status="PP Contact" />
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge
                      status={item._status === 'active' ? 'Active' : 'Inactive'}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item._type === 'user' && item.created_at 
                      ? new Date(item.created_at).toLocaleDateString() 
                      : item._type === 'contact' ? 'PP Import' : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item._type === 'user' && item.last_login 
                      ? new Date(item.last_login).toLocaleDateString() 
                      : item._type === 'user' ? 'Never' : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {item._type === 'user' ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(item)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit user"
                        >
                          <PencilSquareIcon className="h-5 w-5" />
                        </button>
                        {item.id !== currentUser?.id && (
                          <>
                            {item.is_active ? (
                              <button
                                onClick={() => handleDeactivateUser(item.id)}
                                className="text-yellow-600 hover:text-yellow-900"
                                title="Deactivate user"
                              >
                                <XMarkIcon className="h-5 w-5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleActivateUser(item.id)}
                                className="text-green-600 hover:text-green-900"
                                title="Activate user"
                              >
                                <CheckIcon className="h-5 w-5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteUser(item.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete user"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">PP Contact</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {combinedData.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No {typeFilter === 'users' ? 'users' : typeFilter === 'contacts' ? 'contacts' : 'users or contacts'} found
            </div>
          )}
        </div>
        ) : (
          /* Card View */
          <div className="p-6">
            {combinedData.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No {typeFilter === 'users' ? 'users' : typeFilter === 'contacts' ? 'contacts' : 'users or contacts'} found
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {combinedData.map((item) => (
                  <div key={`${item._type}-${item.id}`} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                    {/* User Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                          <UserIcon className="h-6 w-6 text-gray-500" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            {item._displayName}
                            {item._type === 'contact' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Contact
                              </span>
                            )}
                          </h3>
                          <p className="text-sm text-gray-500">{item._email}</p>
                        </div>
                      </div>
                      <StatusBadge
                        status={item._status === 'active' ? 'Active' : 'Inactive'}
                      />
                    </div>

                    {/* User Details */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Role:</span>
                        <StatusBadge
                          status={item._type === 'user' ? getRoleDisplayName(item.role) : 'PP Contact'}
                        />
                      </div>
                      
                      {item._phone && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Phone:</span>
                          <span className="text-sm text-gray-900">{item._phone}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Created:</span>
                        <span className="text-sm text-gray-900">
                          {item._type === 'user' && item.created_at
                            ? new Date(item.created_at).toLocaleDateString()
                            : item._type === 'contact' ? 'PP Import' : 'N/A'}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Last Login:</span>
                        <span className="text-sm text-gray-900">
                          {item._type === 'user' && item.last_login
                            ? new Date(item.last_login).toLocaleDateString()
                            : item._type === 'user' ? 'Never' : 'N/A'}
                        </span>
                      </div>

                      {item._type === 'user' && item.two_fa_enabled && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">2FA:</span>
                          <span className="inline-flex items-center gap-1 text-xs text-green-700">
                            <ShieldCheckIcon className="h-3 w-3" />
                            Enabled
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mt-6 pt-4 border-t border-gray-100">
                      <div className="flex justify-between items-center">
                        {item._type === 'user' ? (
                          <>
                            <button
                              onClick={() => openEditModal(item)}
                              className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                            >
                              Edit
                            </button>
                            {item.id !== currentUser?.id && (
                              <div className="flex gap-2">
                                {item.is_active ? (
                                  <button
                                    onClick={() => handleDeactivateUser(item.id)}
                                    className="text-yellow-600 hover:text-yellow-900 text-sm"
                                    title="Deactivate user"
                                  >
                                    <XMarkIcon className="h-4 w-4" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleActivateUser(item.id)}
                                    className="text-green-600 hover:text-green-900 text-sm"
                                    title="Activate user"
                                  >
                                    <CheckIcon className="h-4 w-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteUser(item.id)}
                                  className="text-red-600 hover:text-red-900 text-sm"
                                  title="Delete user"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-sm text-gray-500 font-medium">PP Contact - Read Only</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </ModernCard>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              {showCreateModal ? 'Create New User' : 'Edit User'}
            </h3>

            {formErrors.submit && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {formErrors.submit}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    formErrors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
                )}
              </div>

              {showCreateModal && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      formErrors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.password && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.password}</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      formErrors.firstName ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.firstName && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.firstName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      formErrors.lastName ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.lastName && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.lastName}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <ModernDropdown
                  options={[
                    { value: 'admin', label: 'Admin' },
                    { value: 'coordinator', label: 'Exchange Coordinator' },
                    { value: 'client', label: 'Client' },
                    { value: 'third_party', label: 'Third Party' },
                    { value: 'agency', label: 'Agency' }
                  ]}
                  value={formData.role}
                  onChange={(value) => setFormData({ ...formData, role: value as any })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    formErrors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {formErrors.phone && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.phone}</p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  showCreateModal ? setShowCreateModal(false) : setShowEditModal(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={showCreateModal ? handleCreateUser : handleUpdateUser}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {showCreateModal ? 'Create User' : 'Update User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;