import React, { useState, useEffect, useRef } from 'react';
import { X, Search, UserPlus, Mail, Check, AlertCircle } from 'lucide-react';
import { apiService } from '../services/api';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  first_name?: string;
  last_name?: string;
  role: string;
  isActive?: boolean;
  is_active?: boolean;
}

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (userId: string) => Promise<void>;
  onInvite: (email: string, firstName: string, lastName: string) => Promise<void>;
  title: string;
  role: 'client' | 'coordinator';
  exchangeId: string;
  exchangeName: string;
}

export const AssignmentModal: React.FC<AssignmentModalProps> = ({
  isOpen,
  onClose,
  onAssign,
  onInvite,
  title,
  role,
  exchangeId,
  exchangeName
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      // Focus search input when modal opens
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      // Reset state when modal closes
      setSearchQuery('');
      setFilteredUsers([]);
      setShowInviteForm(false);
      setInviteEmail('');
      setInviteFirstName('');
      setInviteLastName('');
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const filtered = users.filter(user => {
        const firstName = (user.firstName || user.first_name || '').toLowerCase();
        const lastName = (user.lastName || user.last_name || '').toLowerCase();
        const email = user.email.toLowerCase();
        const fullName = `${firstName} ${lastName}`.toLowerCase();
        
        return email.includes(query) || 
               firstName.includes(query) || 
               lastName.includes(query) ||
               fullName.includes(query);
      });
      setFilteredUsers(filtered);
      
      // Check if search query is an email and no exact match found
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(searchQuery);
      if (isEmail && !filtered.find(u => u.email.toLowerCase() === query)) {
        setShowInviteForm(true);
        setInviteEmail(searchQuery);
      } else {
        setShowInviteForm(false);
      }
    } else {
      setFilteredUsers(users);
      setShowInviteForm(false);
    }
  }, [searchQuery, users]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Get users based on role
      const endpoint = role === 'client' 
        ? '/users?role=client' 
        : '/users?role=coordinator';
      
      const response = await apiService.get(endpoint);
      const usersData = response.users || response.data || response;
      
      // Filter to only show active users and appropriate roles
      const filteredByRole = Array.isArray(usersData) 
        ? usersData.filter((u: User) => {
            const isActive = u.isActive !== false && u.is_active !== false;
            if (role === 'client') {
              return isActive && (u.role === 'client' || u.role === 'agency');
            } else {
              return isActive && (u.role === 'coordinator' || u.role === 'admin');
            }
          })
        : [];
      
      setUsers(filteredByRole);
      setFilteredUsers(filteredByRole);
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Failed to load users');
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignUser = async (userId: string) => {
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      await onAssign(userId);
      setSuccess('User assigned successfully!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to assign user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail || !inviteFirstName || !inviteLastName) {
      setError('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      await onInvite(inviteEmail, inviteFirstName, inviteLastName);
      setSuccess('Invitation sent successfully!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to send invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatUserName = (user: User) => {
    const firstName = user.firstName || user.first_name || '';
    const lastName = user.lastName || user.last_name || '';
    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim();
    }
    return user.email.split('@')[0];
  };

  const formatRole = (roleStr: string) => {
    switch (roleStr) {
      case 'admin': return 'Administrator';
      case 'coordinator': return 'Coordinator';
      case 'client': return 'Client';
      case 'agency': return 'Agency';
      default: return roleStr;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            {/* Success/Error Messages */}
            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
                <Check className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-sm text-green-800">{success}</span>
              </div>
            )}
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <span className="text-sm text-red-800">{error}</span>
              </div>
            )}

            {/* Search Input */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Loading State */}
            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Loading users...</p>
              </div>
            )}

            {/* Users List */}
            {!loading && !showInviteForm && filteredUsers.length > 0 && (
              <div className="max-h-64 overflow-y-auto">
                <div className="space-y-1">
                  {filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleAssignUser(user.id)}
                      disabled={isSubmitting}
                      className="w-full text-left p-3 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {formatUserName(user)}
                          </p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                          {formatRole(user.role)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {!loading && !showInviteForm && searchQuery && filteredUsers.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No users found matching "{searchQuery}"</p>
                {/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(searchQuery) && (
                  <button
                    onClick={() => {
                      setShowInviteForm(true);
                      setInviteEmail(searchQuery);
                    }}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    Send invitation to this email
                  </button>
                )}
              </div>
            )}

            {/* Invite Form */}
            {showInviteForm && (
              <div className="space-y-4">
                <div className="flex items-center mb-2">
                  <Mail className="w-5 h-5 text-blue-600 mr-2" />
                  <h3 className="font-medium text-gray-900">Send Invitation</h3>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="email@example.com"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={inviteFirstName}
                      onChange={(e) => setInviteFirstName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="John"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={inviteLastName}
                      onChange={(e) => setInviteLastName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Doe"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowInviteForm(false);
                      setInviteEmail('');
                      setSearchQuery('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Back to Search
                  </button>
                  
                  <button
                    onClick={handleSendInvite}
                    disabled={isSubmitting || !inviteEmail || !inviteFirstName || !inviteLastName}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isSubmitting ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Send Invitation
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};