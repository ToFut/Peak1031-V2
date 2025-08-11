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
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useInvitations, InvitationData, PendingInvitation } from '../../../hooks/useInvitations';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';

interface InvitationManagerProps {
  exchangeId: string;
  exchangeName: string;
  existingParticipants?: any[];
  onParticipantAdded?: () => void;
}

const InvitationManager: React.FC<InvitationManagerProps> = ({
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
    if (isLoadingInvitations) return; // Prevent duplicate calls
    
    setIsLoadingInvitations(true);
    try {
      const response = await getPendingInvitations(exchangeId);
      if (response && response.invitations) {
        setPendingInvitations(response.invitations);
      } else if (response && Array.isArray(response)) {
        // Handle case where response is directly an array
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
    // Prevent any default form submission
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log('🚀 handleSendInvitations called');
    
    if (!canInvite) {
      console.log('❌ User cannot invite');
      return;
    }

    // Validate form data
    const validInvitations = inviteFormData.filter(inv => 
      inv.email.trim() && 
      (inv.method !== 'sms' && inv.method !== 'both' || inv.phone?.trim())
    );

    if (validInvitations.length === 0) {
      alert('Please provide at least one valid email address.');
      return;
    }

    console.log('📧 Sending invitations:', validInvitations);

    try {
      const results = await sendInvitations(exchangeId, validInvitations, customMessage);
      console.log('✅ Invitation results:', results);
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
      setCustomMessage('');
      setShowInviteForm(false);
      
      // Reload pending invitations
      await loadPendingInvitations();
      
      // Notify parent component
      if (onParticipantAdded) {
        onParticipantAdded();
      }
    } catch (err: any) {
      console.error('❌ Failed to send invitations:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response,
        stack: err.stack
      });
      
      // Show error to user
      if (err.message) {
        alert(`Failed to send invitations: ${err.message}`);
      } else {
        alert('Failed to send invitations. Please check the console for details.');
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

              {/* Invitation List */}
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
              </div>

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
                disabled={loading}
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

export default InvitationManager;