import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { apiService } from '@/shared/services/api';
import { User } from '@/shared/types';
import {
  UserPlusIcon,
  UserMinusIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  Cog6ToothIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

interface ExchangeParticipant {
  id: string;
  exchange_id: string;
  user_id?: string;
  contact_id?: string;
  role: string;
  permissions: Record<string, boolean>;
  user?: User;
  contact?: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    company?: string;
  };
}

interface AvailableMember {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role?: string;
  company?: string;
  type: 'user' | 'contact';
  department?: string;
  phone?: string;
  last_active?: string;
  avatar?: string;
  expertise?: string[];
  status?: 'active' | 'inactive' | 'pending';
}

interface BulkAction {
  type: 'add' | 'remove' | 'role_change' | 'permission_update';
  participants: string[];
  data?: any;
}

interface ParticipantFilter {
  role?: string;
  status?: string;
  type?: 'user' | 'contact' | 'all';
  department?: string;
  permissions?: string;
}

interface ParticipantStats {
  total: number;
  active: number;
  pending: number;
  byRole: Record<string, number>;
  byType: Record<string, number>;
}

interface ExchangeParticipantsManagerProps {
  exchangeId: string;
  isOpen: boolean;
  onClose: () => void;
  onParticipantsChange?: () => void;
}

const ExchangeParticipantsManager: React.FC<ExchangeParticipantsManagerProps> = ({
  exchangeId,
  isOpen,
  onClose,
  onParticipantsChange
}) => {
  const { user } = useAuth();
  const [participants, setParticipants] = useState<ExchangeParticipant[]>([]);
  const [availableMembers, setAvailableMembers] = useState<AvailableMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Enhanced professional features
  const [activeTab, setActiveTab] = useState<'participants' | 'invite' | 'bulk' | 'analytics'>('participants');
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<ParticipantFilter>({});
  const [sortBy, setSortBy] = useState<'name' | 'role' | 'added' | 'last_active'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table'>('table');
  const [showFilters, setShowFilters] = useState(false);
  const [bulkEmails, setBulkEmails] = useState('');
  const [selectedRole, setSelectedRole] = useState('participant');
  const [inviteMessage, setInviteMessage] = useState('');
  const [showRoleEditor, setShowRoleEditor] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<string | null>(null);

  // Check if current user can manage participants
  const canManage = user?.role === 'admin' || user?.role === 'coordinator';

  // Professional computed values
  const participantStats = useMemo<ParticipantStats>(() => {
    const stats: ParticipantStats = {
      total: participants.length,
      active: 0,
      pending: 0,
      byRole: {},
      byType: {}
    };

    participants.forEach(p => {
      // Count by role
      stats.byRole[p.role] = (stats.byRole[p.role] || 0) + 1;
      
      // Count by type
      const type = p.user_id ? 'user' : 'contact';
      stats.byType[type] = (stats.byType[type] || 0) + 1;
      
      // Count active/pending (mock logic - you'd get this from API)
      const member = p.user || p.contact;
      if (member) {
        stats.active++;
      } else {
        stats.pending++;
      }
    });

    return stats;
  }, [participants]);

  const filteredAndSortedParticipants = useMemo(() => {
    let filtered = participants.filter(p => {
      const member = p.user || p.contact;
      if (!member) return false;

      // Apply filters
      if (filters.role && p.role !== filters.role) return false;
      if (filters.type && filters.type !== 'all') {
        const memberType = p.user_id ? 'user' : 'contact';
        if (memberType !== filters.type) return false;
      }

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
        const email = member.email?.toLowerCase() || '';
        if (!fullName.includes(searchLower) && !email.includes(searchLower)) {
          return false;
        }
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      const memberA = a.user || a.contact;
      const memberB = b.user || b.contact;
      if (!memberA || !memberB) return 0;

      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = `${memberA.first_name} ${memberA.last_name}`.localeCompare(
            `${memberB.first_name} ${memberB.last_name}`
          );
          break;
        case 'role':
          comparison = a.role.localeCompare(b.role);
          break;
        case 'added':
          // Mock - you'd use actual creation date
          comparison = 0;
          break;
        case 'last_active':
          // Mock - you'd use actual last active date
          comparison = 0;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [participants, filters, searchTerm, sortBy, sortOrder]);

  const availableRoles = [
    { value: 'client', label: 'Client', icon: '👤', description: 'Primary exchange client' },
    { value: 'coordinator', label: 'Coordinator', icon: '👨‍💼', description: 'Exchange coordinator' },
    { value: 'qualified_intermediary', label: 'Qualified Intermediary', icon: '🏛️', description: 'QI professional' },
    { value: 'attorney', label: 'Attorney', icon: '⚖️', description: 'Legal counsel' },
    { value: 'cpa', label: 'CPA', icon: '📊', description: 'Tax professional' },
    { value: 'agent', label: 'Real Estate Agent', icon: '🏠', description: 'Real estate professional' },
    { value: 'participant', label: 'General Participant', icon: '👥', description: 'General participant' },
    { value: 'viewer', label: 'Viewer', icon: '👁️', description: 'Read-only access' }
  ];

  useEffect(() => {
    if (isOpen) {
      loadParticipants();
      if (canManage) {
        loadAvailableMembers();
      }
    }
  }, [isOpen, exchangeId, canManage]);

  useEffect(() => {
    if (canManage && searchTerm) {
      const timeoutId = setTimeout(() => {
        loadAvailableMembers(searchTerm);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm, canManage]);

  const loadParticipants = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getExchangeParticipants(exchangeId);
      setParticipants(response.participants || []);
    } catch (error: any) {
      setError('Failed to load participants');
      console.error('Error loading participants:', error);
    } finally {
      setLoading(false);
    }
  }, [exchangeId]);

  const loadAvailableMembers = useCallback(async (search = '') => {
    try {
      const response = await apiService.getAvailableMembers(exchangeId, search);
      
      const users = (response.availableUsers || []).map((u: any) => ({
        ...u,
        type: 'user' as const
      }));
      
      const contacts = (response.availableContacts || []).map((c: any) => ({
        ...c,
        type: 'contact' as const
      }));
      
      setAvailableMembers([...users, ...contacts]);
    } catch (error: any) {
      console.error('Error loading available members:', error);
    }
  }, [exchangeId]);

  const addParticipant = async (member: AvailableMember, role: string = 'participant') => {
    try {
      setAddingMember(true);
      setError(null);
      
      const payload = {
        ...(member.type === 'user' ? { user_id: member.id } : { contact_id: member.id }),
        role,
        permissions: {
          view: true,
          message: true,
          upload: role !== 'viewer',
          edit: ['admin', 'coordinator'].includes(role),
          manage: role === 'admin'
        }
      };

      await apiService.addExchangeParticipant(exchangeId, payload);
      
      setSuccess(`Added ${member.first_name} ${member.last_name} to exchange`);
      setTimeout(() => setSuccess(null), 3000);
      
      await loadParticipants();
      await loadAvailableMembers(searchTerm);
      onParticipantsChange?.();
    } catch (error: any) {
      setError(error.message || 'Failed to add participant');
    } finally {
      setAddingMember(false);
    }
  };

  const addParticipantByEmail = async () => {
    if (!newMemberEmail.trim()) return;
    
    try {
      setAddingMember(true);
      setError(null);
      
      const payload = {
        email: newMemberEmail.trim(),
        role: 'participant',
        permissions: {
          view: true,
          message: true,
          upload: true,
          edit: false,
          manage: false
        }
      };

      await apiService.addExchangeParticipant(exchangeId, payload);
      
      setSuccess(`Invited ${newMemberEmail} to exchange`);
      setTimeout(() => setSuccess(null), 3000);
      
      setNewMemberEmail('');
      setShowAddForm(false);
      
      await loadParticipants();
      await loadAvailableMembers(searchTerm);
      onParticipantsChange?.();
    } catch (error: any) {
      setError(error.message || 'Failed to invite participant');
    } finally {
      setAddingMember(false);
    }
  };

  const removeParticipant = async (participantId: string) => {
    try {
      setRemovingMember(participantId);
      setError(null);
      
      await apiService.removeExchangeParticipant(exchangeId, participantId);
      
      setSuccess('Participant removed from exchange');
      setTimeout(() => setSuccess(null), 3000);
      
      await loadParticipants();
      await loadAvailableMembers(searchTerm);
      onParticipantsChange?.();
    } catch (error: any) {
      setError(error.message || 'Failed to remove participant');
    } finally {
      setRemovingMember(null);
    }
  };

  // Professional bulk operations
  const handleBulkInvite = async () => {
    if (!bulkEmails.trim()) return;
    
    try {
      setAddingMember(true);
      setError(null);
      
      const emails = bulkEmails
        .split(/[,\n]/)
        .map(email => email.trim())
        .filter(email => email && email.includes('@'));
      
      if (emails.length === 0) {
        setError('Please enter valid email addresses');
        return;
      }
      
      const results = await Promise.allSettled(
        emails.map(email => apiService.addExchangeParticipant(exchangeId, {
          email,
          role: selectedRole,
          permissions: {
            view: true,
            message: true,
            upload: selectedRole !== 'viewer',
            edit: ['admin', 'coordinator'].includes(selectedRole),
            manage: selectedRole === 'admin'
          }
        }))
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.length - successful;
      
      if (successful > 0) {
        setSuccess(`Successfully invited ${successful} participant${successful > 1 ? 's' : ''}${failed > 0 ? `, ${failed} failed` : ''}`);
        setBulkEmails('');
        await loadParticipants();
        await loadAvailableMembers(searchTerm);
        onParticipantsChange?.();
      }
      
      if (failed > 0 && successful === 0) {
        setError(`Failed to invite ${failed} participant${failed > 1 ? 's' : ''}`);
      }
      
    } catch (error: any) {
      setError(error.message || 'Failed to send bulk invitations');
    } finally {
      setAddingMember(false);
    }
  };

  const handleBulkRemove = async () => {
    if (selectedParticipants.size === 0) return;
    
    if (!window.confirm(`Remove ${selectedParticipants.size} participant${selectedParticipants.size > 1 ? 's' : ''}?`)) {
      return;
    }
    
    try {
      setRemovingMember('bulk');
      setError(null);
      
      const results = await Promise.allSettled(
        Array.from(selectedParticipants).map(id => 
          apiService.removeExchangeParticipant(exchangeId, id)
        )
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.length - successful;
      
      if (successful > 0) {
        setSuccess(`Successfully removed ${successful} participant${successful > 1 ? 's' : ''}${failed > 0 ? `, ${failed} failed` : ''}`);
        setSelectedParticipants(new Set());
        await loadParticipants();
        await loadAvailableMembers(searchTerm);
        onParticipantsChange?.();
      }
      
      if (failed > 0 && successful === 0) {
        setError(`Failed to remove ${failed} participant${failed > 1 ? 's' : ''}`);
      }
      
    } catch (error: any) {
      setError(error.message || 'Failed to remove participants');
    } finally {
      setRemovingMember(null);
    }
  };

  const handleSelectAll = () => {
    if (selectedParticipants.size === filteredAndSortedParticipants.length) {
      setSelectedParticipants(new Set());
    } else {
      setSelectedParticipants(new Set(filteredAndSortedParticipants.map(p => p.id)));
    }
  };

  const toggleParticipantSelection = (participantId: string) => {
    const newSelection = new Set(selectedParticipants);
    if (newSelection.has(participantId)) {
      newSelection.delete(participantId);
    } else {
      newSelection.add(participantId);
    }
    setSelectedParticipants(newSelection);
  };

  const exportParticipants = () => {
    const csvContent = [
      ['Name', 'Email', 'Role', 'Type', 'Company', 'Added Date'].join(','),
      ...filteredAndSortedParticipants.map(p => {
        const member = p.user || p.contact;
        return [
          `"${member?.first_name} ${member?.last_name}"`,
          member?.email || '',
          p.role,
          p.user_id ? 'User' : 'Contact',
          p.contact?.company || '',
          new Date().toLocaleDateString() // Mock - you'd use actual date
        ].join(',');
      })
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exchange-${exchangeId}-participants.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'coordinator': return 'bg-blue-100 text-blue-800';
      case 'client': return 'bg-green-100 text-green-800';
      case 'qualified_intermediary': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 overflow-y-auto h-full w-full z-50 backdrop-blur-sm">
      <div className="relative top-4 mx-auto border w-11/12 max-w-7xl shadow-2xl rounded-2xl bg-white">
        {/* Professional Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-2xl px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white bg-opacity-20 rounded-xl">
                <UserGroupIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Exchange Team Management</h2>
                <p className="text-blue-100 mt-1">Manage participants, roles, and permissions</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right text-white">
                <div className="text-sm opacity-90">Total Participants</div>
                <div className="text-2xl font-bold">{participantStats.total}</div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-xl transition-all"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="px-8 py-6 bg-gray-50 border-b">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-green-600">{participantStats.active}</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckIcon className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-orange-600">{participantStats.pending}</p>
                </div>
                <div className="p-2 bg-orange-100 rounded-lg">
                  <ExclamationTriangleIcon className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Users</p>
                  <p className="text-2xl font-bold text-blue-600">{participantStats.byType.user || 0}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Contacts</p>
                  <p className="text-2xl font-bold text-purple-600">{participantStats.byType.contact || 0}</p>
                </div>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <UserPlusIcon className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Professional Tab Navigation */}
        <div className="px-8 py-4 border-b bg-white">
          <nav className="flex space-x-8">
            {[
              { id: 'participants', label: 'Participants', icon: UserGroupIcon, count: participantStats.total },
              { id: 'invite', label: 'Invite Members', icon: UserPlusIcon },
              { id: 'bulk', label: 'Bulk Operations', icon: ClipboardDocumentListIcon },
              { id: 'analytics', label: 'Analytics', icon: InformationCircleIcon }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                      isActive ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mx-8 mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="ml-3 text-sm text-red-700 font-medium">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mx-8 mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center">
              <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
              <p className="ml-3 text-sm text-green-700 font-medium">{success}</p>
            </div>
          </div>
        )}

        {/* Add Member Section */}
        {canManage && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-medium text-gray-900">Add Participants</h4>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
              >
                <UserPlusIcon className="w-4 h-4 mr-2" />
                Invite by Email
              </button>
            </div>

            {/* Email Invitation Form */}
            {showAddForm && (
              <div className="mb-4 p-4 bg-gray-50 rounded-md">
                <div className="flex space-x-2">
                  <input
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={addParticipantByEmail}
                    disabled={addingMember || !newMemberEmail.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {addingMember ? 'Inviting...' : 'Invite'}
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Search Existing Users */}
            <div className="mb-4">
              <div className="relative">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search existing users and contacts..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Available Members */}
            <div className="mb-6 max-h-40 overflow-y-auto border border-gray-200 rounded-md">
              {availableMembers.length > 0 ? (
                availableMembers.map((member) => (
                  <div key={`${member.type}-${member.id}`} className="flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0">
                    <div>
                      <div className="font-medium text-gray-900">
                        {member.first_name} {member.last_name}
                      </div>
                      <div className="text-sm text-gray-500">{member.email}</div>
                      {member.company && (
                        <div className="text-xs text-gray-400">{member.company}</div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        member.type === 'user' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {member.type === 'user' ? member.role || 'User' : 'Contact'}
                      </span>
                      <button
                        onClick={() => addParticipant(member)}
                        disabled={addingMember}
                        className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 disabled:opacity-50"
                      >
                        <UserPlusIcon className="w-3 h-3 mr-1" />
                        Add
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500">
                  {searchTerm ? 'No matching users found' : 'Start typing to search for users'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Current Participants */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">
            Current Participants ({participants.length})
          </h4>
          
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {participants.map((participant) => {
                const member = participant.user || participant.contact;
                if (!member) return null;

                return (
                  <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div>
                      <div className="font-medium text-gray-900">
                        {member.first_name} {member.last_name}
                      </div>
                      <div className="text-sm text-gray-500">{member.email}</div>
                      {participant.contact?.company && (
                        <div className="text-xs text-gray-400">{participant.contact.company}</div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(participant.role)}`}>
                        {participant.role.replace('_', ' ')}
                      </span>
                      {canManage && (
                        <button
                          onClick={() => removeParticipant(participant.id)}
                          disabled={removingMember === participant.id}
                          className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 disabled:opacity-50"
                        >
                          {removingMember === participant.id ? (
                            <div className="w-3 h-3 border border-red-600 border-t-transparent rounded-full animate-spin mr-1"></div>
                          ) : (
                            <UserMinusIcon className="w-3 h-3 mr-1" />
                          )}
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExchangeParticipantsManager;