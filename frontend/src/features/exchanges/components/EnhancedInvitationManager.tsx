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
  PlusIcon
} from '@heroicons/react/24/outline';
import { useInvitations, InvitationData, PendingInvitation } from '../../../hooks/useInvitations';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';
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
  const { isAdmin, isCoordinator } = usePermissions();
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

  const canInvite = isAdmin() || isCoordinator();

  useEffect(() => {
    if (canInvite && !isLoadingInvitations) {
      loadPendingInvitations();
    }
  }, [exchangeId, canInvite]);

  const loadPendingInvitations = async () => {
    if (isLoadingInvitations) return;
    
    setIsLoadingInvitations(true);
    try {
      const response = await getPendingInvitations(exchangeId);
      if (response && response.invitations) {
        setPendingInvitations(response.invitations);
      } else if (response && Array.isArray(response)) {
        setPendingInvitations(response);
      } else {
        setPendingInvitations([]);
      }
    } catch (err) {
      console.error('Failed to load pending invitations:', err);
      setPendingInvitations([]);
    } finally {
      setIsLoadingInvitations(false);
    }
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
        await loadPendingInvitations();
        
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
      
      // Reload pending invitations
      await loadPendingInvitations();
      
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
      await loadPendingInvitations();
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
      await loadPendingInvitations();
    } catch (err) {
      console.error('Failed to cancel invitation:', err);
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

  const filteredInvitations = pendingInvitations.filter(invitation =>
    invitation.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (invitation.firstName && invitation.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (invitation.lastName && invitation.lastName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!canInvite) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">You don't have permission to manage invitations for this exchange.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Manage Invitations</h3>
          <p className="text-sm text-gray-500">
            Invite users to join {exchangeName}
          </p>
        </div>
        <button
          onClick={() => setShowInviteForm(!showInviteForm)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <UserPlusIcon className="h-4 w-4 mr-2" />
          Send Invitations
        </button>
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
                disabled={loading || (inviteMode === 'contact' ? selectedContacts.length === 0 : true)}
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

      {/* Pending Invitations */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-medium text-gray-900">
              Pending Invitations ({pendingInvitations.length})
            </h4>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Search invitations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

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
                        {invitation.invitedBy}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invitation.expiresAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {invitation.status === 'pending' && (
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
      </div>
    </div>
  );
};

export default EnhancedInvitationManager;