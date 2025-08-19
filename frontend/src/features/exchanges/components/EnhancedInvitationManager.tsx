import React, { useState, useEffect } from 'react';
import {
  UserPlusIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  TrashIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  UsersIcon,
  ExclamationTriangleIcon,
  UserCircleIcon,
  PlusIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import { useInvitations, InvitationData, PendingInvitation } from '../../../hooks/useInvitations';
import { useAuth } from '../../../hooks/useAuth';
import { useEnhancedPermissions } from '../../../hooks/useEnhancedPermissions';
import { apiService } from '../../../services/api';
import { Contact } from '../../../types';
import UserDirectory from '../../users/components/UserDirectory';

interface EnhancedInvitationManagerProps {
  exchangeId: string;
  exchangeName: string;
  existingParticipants?: any[];
  onParticipantAdded?: () => void;
}

type InviteMode = 'manual' | 'contact';

const EnhancedInvitationManager: React.FC<EnhancedInvitationManagerProps> = ({
  exchangeId,
  exchangeName,
  existingParticipants = [],
  onParticipantAdded
}) => {
  const { user } = useAuth();
  const { 
    isAdmin, 
    isCoordinator, 
    canInviteParticipants,
    canEditExchange,
    canDeleteInExchange,
    exchangePermissions,
    loading: permissionsLoading,
    getPermissionSummary 
  } = useEnhancedPermissions(exchangeId);
  const {
    loading,
    error,
    sendInvitations,
    getPendingInvitations,
    resendInvitation,
    cancelInvitation,
    clearError
  } = useInvitations();

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteMode, setInviteMode] = useState<InviteMode>('manual');
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [exchangeParticipants, setExchangeParticipants] = useState<any[]>([]);
  const [exchangeStats, setExchangeStats] = useState<any>({});
  const [inviteFormData, setInviteFormData] = useState<InvitationData[]>([{
    email: '',
    phone: '',
    role: 'client',
    method: 'email',
    firstName: '',
    lastName: ''
  }]);
  const [customMessage, setCustomMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [lastResults, setLastResults] = useState<any>(null);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);
  const [activeTab, setActiveTab] = useState<'participants' | 'invitations'>('participants');
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<any>(null);

  const canInvite = canInviteParticipants();

  useEffect(() => {
    if (!isLoadingInvitations) {
      loadExchangeUsersAndInvitations();
    }
  }, [exchangeId]);

  const loadExchangeUsersAndInvitations = async () => {
    if (isLoadingInvitations) return;
    
    setIsLoadingInvitations(true);
    try {
      // Use the new combined endpoint
      const response = await apiService.get(`/invitations/exchange/${exchangeId}/users-and-invitations`);
      
      if (response && response.success) {
        setExchangeParticipants(response.participants || []);
        setPendingInvitations(response.invitations || []);
        setExchangeStats(response.stats || {});
      } else {
        setExchangeParticipants([]);
        setPendingInvitations([]);
        setExchangeStats({});
      }
    } catch (err) {
      console.error('Failed to load exchange users and invitations:', err);
      setExchangeParticipants([]);
      setPendingInvitations([]);
      setExchangeStats({});
    } finally {
      setIsLoadingInvitations(false);
    }
  };

  const loadPendingInvitations = async () => {
    // This is for backward compatibility
    await loadExchangeUsersAndInvitations();
  };

  const handleRemoveSelectedContact = (contactId: string) => {
    const contact = selectedContacts.find(c => c.id === contactId);
    if (contact) {
      setSelectedContacts(selectedContacts.filter(c => c.id !== contactId));
    }
  };

  const handleAddInvitation = () => {
    setInviteFormData([
      ...inviteFormData,
      {
        email: '',
        phone: '',
        role: 'client',
        method: 'email',
        firstName: '',
        lastName: ''
      }
    ]);
  };

  const handleRemoveInvitation = (index: number) => {
    if (inviteFormData.length > 1) {
      setInviteFormData(inviteFormData.filter((_, i) => i !== index));
    }
  };

  const handleInvitationChange = (index: number, field: keyof InvitationData, value: string) => {
    const updated = [...inviteFormData];
    updated[index] = { ...updated[index], [field]: value };
    setInviteFormData(updated);
  };

  const handleSendInvitations = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!canInvite) return;

    let invitationsToSend: InvitationData[] = [];

    if (inviteMode === 'contact') {
      // For existing contacts, check if they have user accounts
      const contactsToInvite: InvitationData[] = [];
      const usersToAdd: any[] = [];
      
      for (const contact of selectedContacts) {
        // Check if this contact has an associated user account
        // The userId field indicates this contact is linked to a user account
        if (contact.userId) {
          // This contact has a user account - add directly
          usersToAdd.push(contact);
        } else {
          // This contact needs an invitation to create account
          contactsToInvite.push({
            email: contact.email,
            phone: contact.phone || '',
            role: 'client' as const,
            method: 'email' as const,
            firstName: contact.firstName || '',
            lastName: contact.lastName || ''
          });
        }
      }
      
      // Add users directly
      if (usersToAdd.length > 0) {
        try {
          for (const user of usersToAdd) {
            console.log('➕ Adding existing user as participant:', user);
            
            const response = await apiService.post(`/exchange-participants/${exchangeId}/participants`, {
              contactId: user.id, // This will be detected as user ID in backend
              role: 'client',
              permissions: {
                canView: true,
                canMessage: true,
                canUpload: true,
                canViewDocuments: true
              }
            });
            
            console.log('✅ User added successfully:', response);
          }
        } catch (error: any) {
          console.error('❌ Failed to add users as participants:', error);
          alert(`Failed to add users: ${error.message}`);
        }
      }
      
      // Send invitations to contacts without accounts
      if (contactsToInvite.length > 0) {
        invitationsToSend = contactsToInvite;
        // Continue with invitation flow below
      } else {
        // All were users, we're done
        setSelectedContacts([]);
        setShowInviteForm(false);
        await loadExchangeUsersAndInvitations();
        
        if (onParticipantAdded) {
          onParticipantAdded();
        }
        
        alert(`Successfully added ${usersToAdd.length} user(s) to the exchange!`);
        return;
      }
    } else {
      // Use manual form data
      invitationsToSend = inviteFormData.filter(inv => 
        inv.email.trim() && 
        (inv.method !== 'sms' && inv.method !== 'both' || inv.phone?.trim())
      );
    }

    if (invitationsToSend.length === 0) {
      alert('Please select at least one contact or provide valid email addresses.');
      return;
    }

    try {
      console.log('🔍 Debug - Invitations to send:', invitationsToSend);
      console.log('🔍 Debug - Exchange ID:', exchangeId);
      console.log('🔍 Debug - Custom message:', customMessage);
      console.log('🔍 Debug - Full invitation data:', JSON.stringify(invitationsToSend, null, 2));
      
      const results = await sendInvitations(exchangeId, invitationsToSend, customMessage);
      setLastResults(results);
      setShowResults(true);
      
      // Reset form on success
      setInviteFormData([{
        email: '',
        phone: '',
        role: 'client',
        method: 'email',
        firstName: '',
        lastName: ''
      }]);
      setSelectedContacts([]);
      setCustomMessage('');
      setShowInviteForm(false);
      
      // Reload exchange data
      await loadExchangeUsersAndInvitations();
      
      // Notify parent component
      if (onParticipantAdded) {
        onParticipantAdded();
      }
    } catch (err: any) {
      console.error('Failed to send invitations:', err);
      if (err.message) {
        alert(`Failed to send invitations: ${err.message}`);
      }
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      await resendInvitation(invitationId);
      alert('Invitation resent successfully!');
      await loadExchangeUsersAndInvitations();
    } catch (err) {
      console.error('Failed to resend invitation:', err);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    const confirmed = window.confirm('Are you sure you want to cancel this invitation?');
    if (!confirmed) return;

    try {
      await cancelInvitation(invitationId);
      alert('Invitation cancelled successfully!');
      await loadExchangeUsersAndInvitations();
    } catch (err) {
      console.error('Failed to cancel invitation:', err);
    }
  };

  const handleRemoveParticipant = async (participantId: string, participantName: string) => {
    const confirmed = window.confirm(`Are you sure you want to remove ${participantName} from this exchange?`);
    if (!confirmed) return;

    try {
      await apiService.delete(`/exchanges/${exchangeId}/participants/${participantId}`);
      alert(`${participantName} has been removed from the exchange successfully!`);
      await loadExchangeUsersAndInvitations();
      
      if (onParticipantAdded) {
        onParticipantAdded();
      }
    } catch (err: any) {
      console.error('Failed to remove participant:', err);
      alert(`Failed to remove participant: ${err.message || 'Unknown error'}`);
    }
  };

  const handleManagePermissions = (participant: any) => {
    setSelectedParticipant(participant);
    setShowPermissionsModal(true);
  };

  const handleUpdatePermissions = async (participantId: string, newPermissions: Record<string, boolean>) => {
    try {
      await apiService.put(`/exchange-participants/${exchangeId}/participants/${participantId}/permissions`, {
        permissions: newPermissions
      });
      
      alert('Permissions updated successfully!');
      await loadExchangeUsersAndInvitations();
      setShowPermissionsModal(false);
      setSelectedParticipant(null);
      
      if (onParticipantAdded) {
        onParticipantAdded();
      }
    } catch (err: any) {
      console.error('Failed to update permissions:', err);
      alert(`Failed to update permissions: ${err.message || 'Unknown error'}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'accepted':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'expired':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'cancelled':
        return <XCircleIcon className="h-5 w-5 text-gray-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredParticipants = exchangeParticipants.filter(participant =>
    participant.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (participant.firstName && participant.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (participant.lastName && participant.lastName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredInvitations = pendingInvitations.filter(invitation =>
    invitation.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (invitation.firstName && invitation.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (invitation.lastName && invitation.lastName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Remove the permission check entirely - let all users see participants
  // The invite functionality will still be hidden based on canInvite

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Exchange Members & Invitations</h3>
          <p className="text-sm text-gray-500">
            Manage users and invitations for {exchangeName}
          </p>
          {exchangeStats.totalParticipants !== undefined && (
            <div className="flex items-center mt-2 space-x-4 text-sm text-gray-600">
              <span>👥 {exchangeStats.totalParticipants} Active Members</span>
              <span>📧 {exchangeStats.totalInvitations} Invitations</span>
              <span>⏳ {exchangeStats.pendingInvitations} Pending</span>
            </div>
          )}
          {exchangePermissions && (
            <div className="mt-2">
              <details className="text-xs text-gray-500">
                <summary className="cursor-pointer hover:text-gray-700">Your permissions in this exchange</summary>
                <div className="mt-1 flex flex-wrap gap-1">
                  {getPermissionSummary().map(permission => (
                    <span key={permission} className="inline-flex px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs">
                      {permission}
                    </span>
                  ))}
                  {getPermissionSummary().length === 0 && (
                    <span className="text-gray-400">No special permissions granted</span>
                  )}
                </div>
              </details>
            </div>
          )}
        </div>
        {canInvite && (
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <UserPlusIcon className="h-4 w-4 mr-2" />
            Send Invitations
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('participants')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'participants'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <UsersIcon className="h-4 w-4 inline mr-2" />
            Active Members ({filteredParticipants.length})
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'invitations'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <EnvelopeIcon className="h-4 w-4 inline mr-2" />
            Invitations ({filteredInvitations.length})
          </button>
        </nav>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <button
              onClick={clearError}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <XCircleIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Results Display */}
      {showResults && lastResults && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-sm font-medium text-blue-800">Invitation Results</h4>
              <div className="mt-2 text-sm text-blue-700">
                <p>✅ Successfully sent: {lastResults.totalSent}</p>
                {lastResults.totalErrors > 0 && <p>❌ Errors: {lastResults.totalErrors}</p>}
              </div>
              <div className="mt-3 space-y-1">
                {lastResults.results.map((result: any, index: number) => (
                  <div key={index} className="text-xs text-blue-600">
                    <span className="font-medium">{result.email}:</span> {result.message}
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => setShowResults(false)}
              className="text-blue-400 hover:text-blue-600"
            >
              <XCircleIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Invitation Form */}
      {showInviteForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">Send Invitations</h4>
              
              {/* Mode Selector */}
              <div className="mb-6">
                <div className="flex space-x-4">
                  <button
                    onClick={() => setInviteMode('contact')}
                    className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                      inviteMode === 'contact'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <UserCircleIcon className="h-6 w-6 mx-auto mb-1" />
                    <p className="text-sm font-medium">Select from Contacts</p>
                    <p className="text-xs mt-1 opacity-75">Choose existing users from your contact list</p>
                  </button>
                  <button
                    onClick={() => setInviteMode('manual')}
                    className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                      inviteMode === 'manual'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <EnvelopeIcon className="h-6 w-6 mx-auto mb-1" />
                    <p className="text-sm font-medium">Enter Manually</p>
                    <p className="text-xs mt-1 opacity-75">Type email addresses to invite new users</p>
                  </button>
                </div>
              </div>

              {/* Custom Message */}
              <div className="mb-6">
                <label htmlFor="customMessage" className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Message (Optional)
                </label>
                <textarea
                  id="customMessage"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Add a personal message to your invitation..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {customMessage.length}/500 characters
                </p>
              </div>

              {/* Contact Selection Mode */}
              {inviteMode === 'contact' && (
                <div className="space-y-4">
                  {/* User Directory */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Users to Invite
                    </label>
                    <UserDirectory 
                      showStats={false}
                      onSelectUser={(user) => {
                        // Check if user is already selected
                        if (!selectedContacts.find(c => c.id === user.id)) {
                          const contact = {
                            id: user.id,
                            firstName: user.firstName || user.first_name || '',
                            lastName: user.lastName || user.last_name || '',
                            email: user.email,
                            phone: user.phone || '',
                            company: user.company,
                            role: user.role,
                            first_name: user.firstName || user.first_name,
                            last_name: user.lastName || user.last_name
                          };
                          setSelectedContacts([...selectedContacts, contact as unknown as Contact]);
                        }
                      }}
                    />
                  </div>

                  {/* Selected Contacts */}
                  {selectedContacts.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Selected Users ({selectedContacts.length})
                      </label>
                      <div className="space-y-2">
                        {selectedContacts.map((contact) => (
                          <div
                            key={contact.id}
                            className="flex items-center justify-between bg-blue-50 p-3 rounded-md"
                          >
                            <div>
                              <p className="font-medium text-gray-900">
                                {contact.firstName} {contact.lastName}
                              </p>
                              <p className="text-sm text-gray-600">{contact.email}</p>
                            </div>
                            <button
                              onClick={() => handleRemoveSelectedContact(contact.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <XCircleIcon className="h-5 w-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Manual Entry Mode */}
              {inviteMode === 'manual' && (
                <div className="space-y-4">
                  {inviteFormData.map((invitation, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-4">
                        <h5 className="text-sm font-medium text-gray-900">
                          Invitation #{index + 1}
                        </h5>
                        {inviteFormData.length > 1 && (
                          <button
                            onClick={() => handleRemoveInvitation(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Email */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email Address *
                          </label>
                          <input
                            type="email"
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            value={invitation.email}
                            onChange={(e) => handleInvitationChange(index, 'email', e.target.value)}
                            placeholder="user@example.com"
                          />
                        </div>

                        {/* Phone */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            value={invitation.phone}
                            onChange={(e) => handleInvitationChange(index, 'phone', e.target.value)}
                            placeholder="+1 (555) 123-4567"
                          />
                        </div>

                        {/* First Name */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            First Name
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            value={invitation.firstName}
                            onChange={(e) => handleInvitationChange(index, 'firstName', e.target.value)}
                          />
                        </div>

                        {/* Last Name */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Last Name
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            value={invitation.lastName}
                            onChange={(e) => handleInvitationChange(index, 'lastName', e.target.value)}
                          />
                        </div>

                        {/* Role */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Role *
                          </label>
                          <select
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            value={invitation.role}
                            onChange={(e) => handleInvitationChange(index, 'role', e.target.value as any)}
                          >
                            <option value="client">Client</option>
                            <option value="third_party">Third Party</option>
                            <option value="agency">Agency</option>
                            {isAdmin() && <option value="coordinator">Coordinator</option>}
                          </select>
                        </div>

                        {/* Invitation Method */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Send Via *
                          </label>
                          <select
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            value={invitation.method}
                            onChange={(e) => handleInvitationChange(index, 'method', e.target.value as any)}
                          >
                            <option value="email">Email Only</option>
                            <option value="sms">SMS Only</option>
                            <option value="both">Email & SMS</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add Another Invitation Button */}
                  <button
                    type="button"
                    onClick={handleAddInvitation}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <UserPlusIcon className="h-4 w-4 mr-2" />
                    Add Another Invitation
                  </button>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowInviteForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => handleSendInvitations(e)}
                disabled={loading || (inviteMode === 'contact' ? selectedContacts.length === 0 : inviteFormData.every(inv => !inv.email.trim()))}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? (
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                )}
                Send Invitations
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder={`Search ${activeTab === 'participants' ? 'members' : 'invitations'}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white border border-gray-200 rounded-lg">
        {/* Participants Tab */}
        {activeTab === 'participants' && (
          <div className="overflow-hidden">
            {filteredParticipants.length === 0 ? (
              <div className="text-center py-12">
                <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  {exchangeParticipants.length === 0 ? 'No participants yet' : 'No participants found'}
                </h3>
                <p className="text-gray-500">
                  {exchangeParticipants.length === 0 
                    ? "No users have been added to this exchange yet."
                    : "No participants match your search criteria."
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Member
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Added By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Joined
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Permissions
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredParticipants.map((participant) => (
                      <tr key={participant.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircleIcon className="h-5 w-5 text-green-600" />
                              </div>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {participant.firstName && participant.lastName 
                                  ? `${participant.firstName} ${participant.lastName}`
                                  : participant.email
                                }
                              </div>
                              <div className="text-sm text-gray-500">{participant.email}</div>
                              {participant.phone && (
                                <div className="text-xs text-gray-400 flex items-center">
                                  <DevicePhoneMobileIcon className="h-3 w-3 mr-1" />
                                  {participant.phone}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            {participant.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">
                            {participant.userId ? 'Registered User' : 'Contact Only'}
                          </span>
                          {participant.userRole && (
                            <div className="text-xs text-gray-500">
                              System Role: {participant.userRole}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {participant.assignedBy?.name || 'System'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(participant.assignedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-xs">
                            {participant.permissions && typeof participant.permissions === 'object' ? (
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(participant.permissions as Record<string, boolean>).map(([key, value]) => 
                                  value ? (
                                    <span
                                      key={key}
                                      className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800"
                                    >
                                      {key.replace('can_', '').replace('_', ' ')}
                                    </span>
                                  ) : null
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">No permissions set</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            {canInvite && (
                              <>
                                <button
                                  onClick={() => handleManagePermissions(participant)}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="Manage permissions"
                                >
                                  <CogIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleRemoveParticipant(participant.id, 
                                    participant.firstName && participant.lastName 
                                      ? `${participant.firstName} ${participant.lastName}`
                                      : participant.email
                                  )}
                                  className="text-red-600 hover:text-red-900"
                                  title="Remove from exchange"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Invitations Tab */}
        {activeTab === 'invitations' && (
          <div className="overflow-hidden">
          {filteredInvitations.length === 0 ? (
            <div className="text-center py-12">
              <EnvelopeIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No pending invitations</h3>
              <p className="text-gray-500">
                {pendingInvitations.length === 0 
                  ? "All invitations have been accepted or expired."
                  : "No invitations match your search criteria."
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invitee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invited By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expires
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInvitations.map((invitation) => (
                    <tr key={invitation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            {getStatusIcon(invitation.status)}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {invitation.firstName && invitation.lastName 
                                ? `${invitation.firstName} ${invitation.lastName}`
                                : invitation.email
                              }
                            </div>
                            <div className="text-sm text-gray-500">{invitation.email}</div>
                            {invitation.phone && (
                              <div className="text-xs text-gray-400 flex items-center">
                                <DevicePhoneMobileIcon className="h-3 w-3 mr-1" />
                                {invitation.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {invitation.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invitation.status)}`}>
                          {invitation.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {typeof invitation.invitedBy === 'object' && invitation.invitedBy !== null && 'name' in invitation.invitedBy
                          ? (invitation.invitedBy as any).name 
                          : invitation.invitedBy || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invitation.expiresAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {canInvite && invitation.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleResendInvitation(invitation.id)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Resend invitation"
                              >
                                <ArrowPathIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleCancelInvitation(invitation.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Cancel invitation"
                              >
                                <XCircleIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </div>
        )}
      </div>

      {/* Permissions Management Modal */}
      {showPermissionsModal && selectedParticipant && (
        <PermissionsModal
          participant={selectedParticipant}
          onClose={() => {
            setShowPermissionsModal(false);
            setSelectedParticipant(null);
          }}
          onSave={(permissions) => handleUpdatePermissions(selectedParticipant.id, permissions)}
        />
      )}
    </div>
  );
};

// Permissions Modal Component
interface PermissionsModalProps {
  participant: any;
  onClose: () => void;
  onSave: (permissions: Record<string, boolean>) => void;
}

const PermissionsModal: React.FC<PermissionsModalProps> = ({ participant, onClose, onSave }) => {
  const [permissions, setPermissions] = useState<Record<string, boolean>>({
    can_edit: false,
    can_delete: false,
    can_add_participants: false,
    can_upload_documents: false,
    can_send_messages: false,
    can_view_overview: false,
    can_view_messages: false,
    can_view_tasks: false,
    can_create_tasks: false,
    can_edit_tasks: false,
    can_assign_tasks: false,
    can_view_documents: false,
    can_edit_documents: false,
    can_delete_documents: false,
    can_view_participants: false,
    can_manage_participants: false,
    can_view_financial: false,
    can_edit_financial: false,
    can_view_timeline: false,
    can_edit_timeline: false,
    can_view_reports: false
  });

  useEffect(() => {
    if (participant.permissions) {
      try {
        let parsed = typeof participant.permissions === 'string' 
          ? JSON.parse(participant.permissions) 
          : participant.permissions;
        
        // If permissions is an array (legacy format), convert to object
        if (Array.isArray(parsed)) {
          console.warn('Converting legacy array permissions to object format');
          const permissionObject: Record<string, boolean> = {
            can_edit: false,
            can_delete: false,
            can_add_participants: false,
            can_upload_documents: false,
            can_send_messages: false,
            can_view_overview: false,
            can_view_messages: false,
            can_view_tasks: false,
            can_create_tasks: false,
            can_edit_tasks: false,
            can_assign_tasks: false,
            can_view_documents: false,
            can_edit_documents: false,
            can_delete_documents: false,
            can_view_participants: false,
            can_manage_participants: false,
            can_view_financial: false,
            can_edit_financial: false,
            can_view_timeline: false,
            can_edit_timeline: false,
            can_view_reports: false
          };
          
          // If it's an array of permission strings, set those to true
          parsed.forEach((perm: any) => {
            if (typeof perm === 'string' && permissionObject.hasOwnProperty(perm)) {
              permissionObject[perm] = true;
            }
          });
          
          parsed = permissionObject;
        }
        
        // Ensure we have all required permission keys
        const fullPermissions = {
          can_edit: false,
          can_delete: false,
          can_add_participants: false,
          can_upload_documents: false,
          can_send_messages: false,
          can_view_overview: false,
          can_view_messages: false,
          can_view_tasks: false,
          can_create_tasks: false,
          can_edit_tasks: false,
          can_assign_tasks: false,
          can_view_documents: false,
          can_edit_documents: false,
          can_delete_documents: false,
          can_view_participants: false,
          can_manage_participants: false,
          can_view_financial: false,
          can_edit_financial: false,
          can_view_timeline: false,
          can_edit_timeline: false,
          can_view_reports: false,
          ...parsed // Override with actual permissions
        };
        
        setPermissions(fullPermissions);
      } catch (error) {
        console.error('Error parsing permissions:', error);
        // Set default permissions on error
        setPermissions({
          can_edit: false,
          can_delete: false,
          can_add_participants: false,
          can_upload_documents: false,
          can_send_messages: false,
          can_view_overview: false,
          can_view_messages: false,
          can_view_tasks: false,
          can_create_tasks: false,
          can_edit_tasks: false,
          can_assign_tasks: false,
          can_view_documents: false,
          can_edit_documents: false,
          can_delete_documents: false,
          can_view_participants: false,
          can_manage_participants: false,
          can_view_financial: false,
          can_edit_financial: false,
          can_view_timeline: false,
          can_edit_timeline: false,
          can_view_reports: false
        });
      }
    } else {
      // No permissions set, use defaults based on role
      const roleDefaults: Record<string, Record<string, boolean>> = {
        admin: {
          can_edit: true,
          can_delete: true,
          can_add_participants: true,
          can_upload_documents: true,
          can_send_messages: true,
          can_view_overview: true,
          can_view_messages: true,
          can_view_tasks: true,
          can_create_tasks: true,
          can_edit_tasks: true,
          can_assign_tasks: true,
          can_view_documents: true,
          can_edit_documents: true,
          can_delete_documents: true,
          can_view_participants: true,
          can_manage_participants: true,
          can_view_financial: true,
          can_edit_financial: true,
          can_view_timeline: true,
          can_edit_timeline: true,
          can_view_reports: true
        },
        coordinator: {
          can_edit: true,
          can_delete: false,
          can_add_participants: true,
          can_upload_documents: true,
          can_send_messages: true,
          can_view_overview: true,
          can_view_messages: true,
          can_view_tasks: true,
          can_create_tasks: true,
          can_edit_tasks: true,
          can_assign_tasks: true,
          can_view_documents: true,
          can_edit_documents: true,
          can_delete_documents: false,
          can_view_participants: true,
          can_manage_participants: true,
          can_view_financial: true,
          can_edit_financial: true,
          can_view_timeline: true,
          can_edit_timeline: true,
          can_view_reports: true
        },
        client: {
          can_edit: true,
          can_delete: false,
          can_add_participants: true,
          can_upload_documents: true,
          can_send_messages: true,
          can_view_overview: true,
          can_view_messages: true,
          can_view_tasks: true,
          can_create_tasks: true,
          can_edit_tasks: true,
          can_assign_tasks: true,
          can_view_documents: true,
          can_edit_documents: true,
          can_delete_documents: false,
          can_view_participants: true,
          can_manage_participants: true,
          can_view_financial: true,
          can_edit_financial: true,
          can_view_timeline: true,
          can_edit_timeline: true,
          can_view_reports: true
        },
        third_party: {
          can_edit: false,
          can_delete: false,
          can_add_participants: false,
          can_upload_documents: false,
          can_send_messages: false,
          can_view_overview: true,
          can_view_messages: false,
          can_view_tasks: false,
          can_create_tasks: false,
          can_edit_tasks: false,
          can_assign_tasks: false,
          can_view_documents: false,
          can_edit_documents: false,
          can_delete_documents: false,
          can_view_participants: false,
          can_manage_participants: false,
          can_view_financial: false,
          can_edit_financial: false,
          can_view_timeline: false,
          can_edit_timeline: false,
          can_view_reports: false
        },
        agency: {
          can_edit: false,
          can_delete: false,
          can_add_participants: false,
          can_upload_documents: false,
          can_send_messages: false,
          can_view_overview: true,
          can_view_messages: false,
          can_view_tasks: false,
          can_create_tasks: false,
          can_edit_tasks: false,
          can_assign_tasks: false,
          can_view_documents: false,
          can_edit_documents: false,
          can_delete_documents: false,
          can_view_participants: false,
          can_manage_participants: false,
          can_view_financial: false,
          can_edit_financial: false,
          can_view_timeline: false,
          can_edit_timeline: false,
          can_view_reports: false
        }
      };
      
      setPermissions(roleDefaults[participant.role] || {
        can_edit: false,
        can_delete: false,
        can_add_participants: false,
        can_upload_documents: false,
        can_send_messages: false,
        can_view_overview: false,
        can_view_messages: false,
        can_view_tasks: false,
        can_create_tasks: false,
        can_edit_tasks: false,
        can_assign_tasks: false,
        can_view_documents: false,
        can_edit_documents: false,
        can_delete_documents: false,
        can_view_participants: false,
        can_manage_participants: false,
        can_view_financial: false,
        can_edit_financial: false,
        can_view_timeline: false,
        can_edit_timeline: false,
        can_view_reports: false
      });
    }
  }, [participant]);

  const handlePermissionChange = (permission: string, value: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [permission]: value
    }));
  };

  const handleSave = () => {
    onSave(permissions);
  };

  const permissionLabels = {
    can_edit: 'Edit Exchange',
    can_delete: 'Delete Items',
    can_add_participants: 'Add Participants',
    can_upload_documents: 'Upload Documents',
    can_send_messages: 'Send Messages'
  };

  const permissionDescriptions: Record<string, string> = {
    can_edit: 'Allow editing exchange details and properties',
    can_delete: 'Allow deleting documents and other items',
    can_add_participants: 'Allow adding new participants to the exchange',
    can_upload_documents: 'Allow uploading documents to the exchange',
    can_send_messages: 'Allow sending messages in exchange chat'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Manage Permissions
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XCircleIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Managing permissions for: <strong>
              {participant.firstName && participant.lastName 
                ? `${participant.firstName} ${participant.lastName}`
                : participant.email}
            </strong>
          </p>
          <p className="text-xs text-gray-500 mt-1">Role: {participant.role}</p>
        </div>

        <div className="space-y-4">
          {Object.entries(permissionLabels).map(([key, label]) => (
            <div key={key} className="flex items-start space-x-3">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  id={key}
                  checked={permissions[key] || false}
                  onChange={(e) => handlePermissionChange(key, e.target.checked)}
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
              </div>
              <div className="min-w-0 flex-1">
                <label htmlFor={key} className="text-sm font-medium text-gray-900">
                  {label}
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  {permissionDescriptions[key]}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedInvitationManager;