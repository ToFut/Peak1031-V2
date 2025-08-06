import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';
import { User } from '../types';
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
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  ClockIcon
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
    phone?: string;
  };
  created_at?: string;
  last_active?: string;
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

interface EnterpriseParticipantsManagerProps {
  exchangeId: string;
  isOpen: boolean;
  onClose: () => void;
  onParticipantsChange?: () => void;
}

const EnterpriseParticipantsManager: React.FC<EnterpriseParticipantsManagerProps> = ({
  exchangeId,
  isOpen,
  onClose,
  onParticipantsChange
}) => {
  const { user } = useAuth();
  const [participants, setParticipants] = useState<ExchangeParticipant[]>([]);
  const [availableMembers, setAvailableMembers] = useState<AvailableMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Professional state management
  const [activeTab, setActiveTab] = useState<'participants' | 'invite' | 'bulk' | 'analytics'>('participants');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'list'>('table');
  const [sortBy, setSortBy] = useState<'name' | 'role' | 'added' | 'last_active'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState({
    role: '',
    type: 'all',
    status: 'all'
  });
  
  // Invite state
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'participant',
    message: '',
    sendWelcome: true
  });
  const [bulkEmails, setBulkEmails] = useState('');
  const [processing, setProcessing] = useState(false);

  const canManage = user?.role === 'admin' || user?.role === 'coordinator';

  // Professional role definitions
  const roleDefinitions = [
    { 
      value: 'client', 
      label: 'Client', 
      icon: '👤', 
      color: 'bg-green-100 text-green-800',
      description: 'Primary exchange client with full access to their exchange',
      permissions: ['view', 'message', 'upload', 'download']
    },
    { 
      value: 'coordinator', 
      label: 'Exchange Coordinator', 
      icon: '👨‍💼', 
      color: 'bg-blue-100 text-blue-800',
      description: 'Manages exchange process and timeline',
      permissions: ['view', 'message', 'upload', 'download', 'edit', 'manage']
    },
    { 
      value: 'qualified_intermediary', 
      label: 'Qualified Intermediary', 
      icon: '🏛️',
      color: 'bg-purple-100 text-purple-800', 
      description: 'Licensed QI facilitating the exchange',
      permissions: ['view', 'message', 'upload', 'download', 'edit']
    },
    { 
      value: 'attorney', 
      label: 'Attorney', 
      icon: '⚖️',
      color: 'bg-indigo-100 text-indigo-800', 
      description: 'Legal counsel for the exchange',
      permissions: ['view', 'message', 'upload', 'download']
    },
    { 
      value: 'cpa', 
      label: 'CPA/Tax Professional', 
      icon: '📊',
      color: 'bg-emerald-100 text-emerald-800', 
      description: 'Tax and accounting professional',
      permissions: ['view', 'message', 'upload', 'download']
    },
    { 
      value: 'agent', 
      label: 'Real Estate Agent', 
      icon: '🏠',
      color: 'bg-orange-100 text-orange-800', 
      description: 'Real estate agent handling properties',
      permissions: ['view', 'message', 'upload']
    },
    { 
      value: 'participant', 
      label: 'General Participant', 
      icon: '👥',
      color: 'bg-gray-100 text-gray-800', 
      description: 'General team member with standard access',
      permissions: ['view', 'message']
    },
    { 
      value: 'viewer', 
      label: 'Viewer', 
      icon: '👁️',
      color: 'bg-slate-100 text-slate-800', 
      description: 'Read-only access to exchange information',
      permissions: ['view']
    }
  ];

  // Analytics and stats
  const participantStats = useMemo(() => {
    const stats = {
      total: participants.length,
      active: 0,
      pending: 0,
      byRole: {} as Record<string, number>,
      byType: { user: 0, contact: 0 }
    };

    participants.forEach(p => {
      stats.byRole[p.role] = (stats.byRole[p.role] || 0) + 1;
      if (p.user_id) stats.byType.user++;
      else stats.byType.contact++;
      
      // Mock active/pending logic
      stats.active++;
    });

    return stats;
  }, [participants]);

  const filteredParticipants = useMemo(() => {
    return participants.filter(p => {
      const member = p.user || p.contact;
      if (!member) return false;

      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const fullName = `${member.first_name} ${member.last_name}`.toLowerCase();
        const email = member.email?.toLowerCase() || '';
        if (!fullName.includes(searchLower) && !email.includes(searchLower)) {
          return false;
        }
      }

      // Role filter
      if (filters.role && p.role !== filters.role) return false;

      // Type filter
      if (filters.type !== 'all') {
        const memberType = p.user_id ? 'user' : 'contact';
        if (memberType !== filters.type) return false;
      }

      return true;
    }).sort((a, b) => {
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
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [participants, searchTerm, filters, sortBy, sortOrder]);

  // Load data
  const loadParticipants = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getExchangeParticipants(exchangeId);
      setParticipants(response.participants || []);
    } catch (error: any) {
      setError('Failed to load participants');
    } finally {
      setLoading(false);
    }
  }, [exchangeId]);

  const loadAvailableMembers = useCallback(async (search = '') => {
    if (!canManage) return;
    try {
      const response = await apiService.getAvailableMembers(exchangeId, search);
      const users = (response.availableUsers || []).map((u: any) => ({ ...u, type: 'user' as const }));
      const contacts = (response.availableContacts || []).map((c: any) => ({ ...c, type: 'contact' as const }));
      setAvailableMembers([...users, ...contacts]);
    } catch (error) {
      console.error('Error loading available members:', error);
    }
  }, [exchangeId, canManage]);

  useEffect(() => {
    if (isOpen) {
      loadParticipants();
      loadAvailableMembers();
    }
  }, [isOpen, loadParticipants, loadAvailableMembers]);

  // Handlers
  const handleInviteSingle = async () => {
    if (!inviteForm.email.trim()) return;
    
    try {
      setProcessing(true);
      setError(null);
      
      await apiService.addExchangeParticipant(exchangeId, {
        email: inviteForm.email,
        role: inviteForm.role,
        permissions: getRolePermissions(inviteForm.role)
      });
      
      setSuccess(`Invitation sent to ${inviteForm.email}`);
      setInviteForm({ email: '', role: 'participant', message: '', sendWelcome: true });
      await loadParticipants();
      onParticipantsChange?.();
    } catch (error: any) {
      setError(error.message || 'Failed to send invitation');
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkInvite = async () => {
    if (!bulkEmails.trim()) return;
    
    try {
      setProcessing(true);
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
          role: inviteForm.role,
          permissions: getRolePermissions(inviteForm.role)
        }))
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.length - successful;
      
      setSuccess(`Invited ${successful} participant${successful > 1 ? 's' : ''}${failed > 0 ? `, ${failed} failed` : ''}`);
      setBulkEmails('');
      await loadParticipants();
      onParticipantsChange?.();
      
    } catch (error: any) {
      setError(error.message || 'Failed to send bulk invitations');
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveParticipant = async (participantId: string) => {
    if (!window.confirm('Remove this participant from the exchange?')) return;
    
    try {
      setProcessing(true);
      await apiService.removeExchangeParticipant(exchangeId, participantId);
      setSuccess('Participant removed');
      await loadParticipants();
      onParticipantsChange?.();
    } catch (error: any) {
      setError(error.message || 'Failed to remove participant');
    } finally {
      setProcessing(false);
    }
  };

  const getRolePermissions = (role: string) => {
    const roleConfig = roleDefinitions.find(r => r.value === role);
    const permissions: Record<string, boolean> = {
      view: false,
      message: false,
      upload: false,
      download: false,
      edit: false,
      manage: false
    };
    
    roleConfig?.permissions.forEach(perm => {
      permissions[perm] = true;
    });
    
    return permissions;
  };

  const getRoleConfig = (role: string) => {
    return roleDefinitions.find(r => r.value === role) || roleDefinitions[roleDefinitions.length - 1];
  };

  const exportData = () => {
    const csvContent = [
      ['Name', 'Email', 'Role', 'Type', 'Company', 'Phone', 'Added Date'].join(','),
      ...filteredParticipants.map(p => {
        const member = p.user || p.contact;
        return [
          `"${member?.first_name} ${member?.last_name}"`,
          member?.email || '',
          p.role,
          p.user_id ? 'User' : 'Contact',
          p.contact?.company || '',
          p.contact?.phone || '',
          p.created_at ? new Date(p.created_at).toLocaleDateString() : ''
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 overflow-y-auto h-full w-full z-50 backdrop-blur-sm">
      <div className="relative top-4 mx-auto w-11/12 max-w-7xl shadow-2xl rounded-2xl bg-white mb-8">
        
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
            <div className="flex items-center space-x-4">
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
                  <ClockIcon className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">System Users</p>
                  <p className="text-2xl font-bold text-blue-600">{participantStats.byType.user}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">External Contacts</p>
                  <p className="text-2xl font-bold text-purple-600">{participantStats.byType.contact}</p>
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

        {/* Tab Content */}
        <div className="p-8 min-h-[600px] max-h-[800px] overflow-y-auto">
          
          {/* Participants Tab */}
          {activeTab === 'participants' && (
            <div className="space-y-6">
              {/* Advanced Controls */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search participants..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-80"
                    />
                  </div>
                  <select
                    value={filters.role}
                    onChange={(e) => setFilters(f => ({ ...f, role: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Roles</option>
                    {roleDefinitions.map(role => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                  <select
                    value={filters.type}
                    onChange={(e) => setFilters(f => ({ ...f, type: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Types</option>
                    <option value="user">System Users</option>
                    <option value="contact">External Contacts</option>
                  </select>
                </div>
                <div className="flex items-center space-x-3">
                  {selectedParticipants.size > 0 && canManage && (
                    <button
                      onClick={() => {/* Handle bulk remove */}}
                      className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      <TrashIcon className="w-4 h-4" />
                      <span>Remove ({selectedParticipants.size})</span>
                    </button>
                  )}
                  <button
                    onClick={exportData}
                    className="flex items-center space-x-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    <span>Export</span>
                  </button>
                </div>
              </div>

              {/* Professional Participants Table */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {canManage && (
                          <th className="px-6 py-3 text-left">
                            <input
                              type="checkbox"
                              onChange={() => {/* Handle select all */}}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </th>
                        )}
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Participant
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role & Permissions
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Contact Info
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        {canManage && (
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredParticipants.map((participant) => {
                        const member = participant.user || participant.contact;
                        const roleConfig = getRoleConfig(participant.role);
                        
                        return (
                          <tr key={participant.id} className="hover:bg-gray-50">
                            {canManage && (
                              <td className="px-6 py-4 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={selectedParticipants.has(participant.id)}
                                  onChange={() => {/* Handle select */}}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                              </td>
                            )}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                                    {member?.first_name?.[0]}{member?.last_name?.[0]}
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {member?.first_name} {member?.last_name}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {participant.user_id ? 'System User' : 'External Contact'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleConfig.color}`}>
                                  {roleConfig.icon} {roleConfig.label}
                                </span>
                              </div>
                              <div className="flex space-x-1 mt-1">
                                {roleConfig.permissions.map(perm => (
                                  <span key={perm} className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                                    {perm}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="space-y-1">
                                <div className="flex items-center text-sm text-gray-900">
                                  <EnvelopeIcon className="w-4 h-4 text-gray-400 mr-2" />
                                  {member?.email}
                                </div>
                                {participant.contact?.phone && (
                                  <div className="flex items-center text-sm text-gray-500">
                                    <PhoneIcon className="w-4 h-4 text-gray-400 mr-2" />
                                    {participant.contact.phone}
                                  </div>
                                )}
                                {participant.contact?.company && (
                                  <div className="flex items-center text-sm text-gray-500">
                                    <BuildingOfficeIcon className="w-4 h-4 text-gray-400 mr-2" />
                                    {participant.contact.company}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Active
                              </span>
                              {participant.last_active && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Last active: {new Date(participant.last_active).toLocaleDateString()}
                                </div>
                              )}
                            </td>
                            {canManage && (
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex items-center justify-end space-x-2">
                                  <button className="text-blue-600 hover:text-blue-900 p-1">
                                    <PencilIcon className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleRemoveParticipant(participant.id)}
                                    className="text-red-600 hover:text-red-900 p-1"
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Invite Tab */}
          {activeTab === 'invite' && canManage && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Single Invite Form */}
                <div className="bg-white rounded-xl border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Invite Individual</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                      <input
                        type="email"
                        value={inviteForm.email}
                        onChange={(e) => setInviteForm(f => ({ ...f, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="member@company.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                      <select
                        value={inviteForm.role}
                        onChange={(e) => setInviteForm(f => ({ ...f, role: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {roleDefinitions.map(role => (
                          <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                      </select>
                      <p className="text-sm text-gray-500 mt-1">
                        {getRoleConfig(inviteForm.role).description}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Personal Message (Optional)</label>
                      <textarea
                        value={inviteForm.message}
                        onChange={(e) => setInviteForm(f => ({ ...f, message: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Add a personal message to the invitation..."
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={inviteForm.sendWelcome}
                        onChange={(e) => setInviteForm(f => ({ ...f, sendWelcome: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label className="ml-2 text-sm text-gray-700">Send welcome email with setup instructions</label>
                    </div>
                    <button
                      onClick={handleInviteSingle}
                      disabled={processing || !inviteForm.email}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {processing ? 'Sending...' : 'Send Invitation'}
                    </button>
                  </div>
                </div>

                {/* Bulk Invite Form */}
                <div className="bg-white rounded-xl border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Invite</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email Addresses</label>
                      <textarea
                        value={bulkEmails}
                        onChange={(e) => setBulkEmails(e.target.value)}
                        rows={8}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter email addresses separated by commas or new lines:&#10;john@company.com&#10;jane@company.com, mike@company.com"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Separate multiple emails with commas or new lines
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Default Role</label>
                      <select
                        value={inviteForm.role}
                        onChange={(e) => setInviteForm(f => ({ ...f, role: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {roleDefinitions.map(role => (
                          <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={handleBulkInvite}
                      disabled={processing || !bulkEmails.trim()}
                      className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {processing ? 'Sending...' : 'Send Bulk Invitations'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Available Members to Add */}
              <div className="bg-white rounded-xl border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Existing Members</h3>
                <div className="space-y-4">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      onChange={(e) => loadAvailableMembers(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Search existing users and contacts..."
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-80 overflow-y-auto">
                    {availableMembers.map((member) => (
                      <div key={`${member.type}-${member.id}`} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-gray-500 to-gray-600 flex items-center justify-center text-white text-sm font-semibold">
                            {member.first_name?.[0]}{member.last_name?.[0]}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {member.first_name} {member.last_name}
                            </div>
                            <div className="text-sm text-gray-500">{member.email}</div>
                            {member.company && (
                              <div className="text-xs text-gray-400">{member.company}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            member.type === 'user' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {member.type === 'user' ? member.role || 'User' : 'Contact'}
                          </span>
                          <button
                            onClick={() => {/* Add member */}}
                            className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                          >
                            <UserPlusIcon className="w-4 h-4" />
                            <span>Add</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bulk Operations Tab */}
          {activeTab === 'bulk' && canManage && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Role Changes</h3>
                  <p className="text-gray-600 mb-4">Select participants and change their roles in bulk.</p>
                  <div className="space-y-4">
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                      <option>Select new role...</option>
                      {roleDefinitions.map(role => (
                        <option key={role.value} value={role.value}>{role.label}</option>
                      ))}
                    </select>
                    <button className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50">
                      Apply to Selected ({selectedParticipants.size})
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Notifications</h3>
                  <p className="text-gray-600 mb-4">Send notifications to multiple participants at once.</p>
                  <div className="space-y-4">
                    <textarea 
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="Enter your message..."
                    />
                    <button className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700">
                      Send to Selected ({selectedParticipants.size})
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Role Distribution</h3>
                  <div className="space-y-3">
                    {Object.entries(participantStats.byRole).map(([role, count]) => {
                      const roleConfig = getRoleConfig(role);
                      const percentage = (count / participantStats.total) * 100;
                      return (
                        <div key={role} className="flex items-center justify-between">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleConfig.color}`}>
                            {roleConfig.icon} {roleConfig.label}
                          </span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{count}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white rounded-xl border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-gray-600">3 new participants added today</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-600">2 role changes this week</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="text-gray-600">1 participant removed this month</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Professional Footer */}
        <div className="px-8 py-4 bg-gray-50 border-t rounded-b-2xl">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Last updated: {new Date().toLocaleString()}
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              {canManage && (
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Generate Report
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseParticipantsManager;