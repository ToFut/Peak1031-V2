import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BuildingOfficeIcon,
  UserIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  PlusIcon,
  XMarkIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
  EnvelopeIcon,
  CalendarIcon,
  MapPinIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';
import { EnhancedStatCard } from '../../dashboard/components/SharedDashboardComponents';
import apiService from '../../../services/api';

interface Agency {
  id: string;
  agency_name: string;
  agency_code: string;
  email: string;
  phone?: string;
  address?: string;
  status: 'active' | 'inactive';
  total_exchanges: number;
  active_exchanges: number;
  total_clients: number;
  created_at: string;
  updated_at: string;
}

interface Exchange {
  id: string;
  name: string;
  status: string;
  property_address?: string;
  created_at: string;
}

interface ThirdParty {
  id: string;
  display_name: string;
  email: string;
  status: string;
  assigned_at?: string;
  assignment_id?: string;
}

interface Permission {
  id: string;
  resource: string;
  action: string;
  granted: boolean;
}

const AgencyProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  // State for agency data
  const [agency, setAgency] = useState<Agency | null>(null);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [thirdParties, setThirdParties] = useState<ThirdParty[]>([]);
  const [availableExchanges, setAvailableExchanges] = useState<Exchange[]>([]);
  const [availableThirdParties, setAvailableThirdParties] = useState<ThirdParty[]>([]);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [showThirdPartyModal, setShowThirdPartyModal] = useState(false);
  const [selectedExchangeId, setSelectedExchangeId] = useState<string>('');
  const [selectedThirdPartyId, setSelectedThirdPartyId] = useState<string>('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    if (id) {
      loadAgencyData();
    }
  }, [id]);

  const loadAgencyData = async () => {
    setLoading(true);
    try {
      // Load agency details
      const agencyResponse = await apiService.get(`/agencies/${id}`);
      setAgency(agencyResponse.data || agencyResponse);

      // Load assigned exchanges
      const exchangesResponse = await apiService.get(`/agencies/${id}/exchanges`);
      setExchanges(exchangesResponse.data || []);

      // Load assigned third parties
      const thirdPartiesResponse = await apiService.get(`/agencies/${id}/third-parties`);
      setThirdParties(thirdPartiesResponse.data || []);

      // Load available resources
      const allExchangesResponse = await apiService.get('/exchanges');
      setAvailableExchanges(allExchangesResponse.data || []);

      const allThirdPartiesResponse = await apiService.get('/users?role=third_party');
      setAvailableThirdParties(allThirdPartiesResponse.data || []);

    } catch (error) {
      console.error('Error loading agency data:', error);
      setError('Failed to load agency profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignExchange = async () => {
    if (!selectedExchangeId) return;
    
    setIsAssigning(true);
    try {
      await apiService.post(`/agencies/${id}/exchanges`, {
        exchange_id: selectedExchangeId,
        permissions: selectedPermissions
      });
      
      await loadAgencyData();
      setShowExchangeModal(false);
      setSelectedExchangeId('');
      setSelectedPermissions([]);
    } catch (error) {
      console.error('Error assigning exchange:', error);
      alert('Failed to assign exchange');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveExchange = async (exchangeId: string) => {
    if (!window.confirm('Are you sure you want to remove this exchange assignment?')) return;
    
    try {
      await apiService.delete(`/agencies/${id}/exchanges/${exchangeId}`);
      await loadAgencyData();
    } catch (error) {
      console.error('Error removing exchange:', error);
      alert('Failed to remove exchange');
    }
  };

  const handleAssignThirdParty = async () => {
    if (!selectedThirdPartyId) return;
    
    setIsAssigning(true);
    try {
      const response = await apiService.post(`/agencies/${id}/third-parties`, {
        third_party_id: selectedThirdPartyId
      });
      
      console.log('Assignment response:', response);
      
      if (response.success || response.data) {
        await loadAgencyData();
        setShowThirdPartyModal(false);
        setSelectedThirdPartyId('');
      } else {
        throw new Error(response.error || 'Assignment failed');
      }
    } catch (error) {
      console.error('Error assigning third party:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Failed to assign third party: ${errorMessage}`);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveThirdParty = async (thirdPartyId: string) => {
    if (!window.confirm('Are you sure you want to remove this third party assignment?')) return;
    
    try {
      await apiService.delete(`/agencies/${id}/third-parties/${thirdPartyId}`);
      await loadAgencyData();
    } catch (error) {
      console.error('Error removing third party:', error);
      alert('Failed to remove third party');
    }
  };

  const availablePermissions = [
    { id: 'view', label: 'View Exchange', description: 'Can view exchange details' },
    { id: 'edit', label: 'Edit Exchange', description: 'Can modify exchange information' },
    { id: 'upload', label: 'Upload Documents', description: 'Can upload documents' },
    { id: 'delete', label: 'Delete Documents', description: 'Can delete documents' },
    { id: 'message', label: 'Send Messages', description: 'Can send messages' },
    { id: 'invite', label: 'Invite Users', description: 'Can invite other users' },
    { id: 'manage', label: 'Manage Exchange', description: 'Full management access' }
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-gray-200 h-32 rounded-lg"></div>
            ))}
          </div>
          <div className="space-y-4">
            <div className="bg-gray-200 h-64 rounded-lg"></div>
            <div className="bg-gray-200 h-64 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !agency) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <ExclamationCircleIcon className="h-6 w-6 text-red-500 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-red-800">Error Loading Agency Profile</h3>
              <p className="text-red-700 mt-1">{error || 'Agency not found'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
            <BuildingOfficeIcon className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{agency.agency_name}</h1>
            <div className="flex items-center space-x-3 mt-1">
              <span className="text-gray-600">{agency.agency_code}</span>
              <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(agency.status)}`}>
                {agency.status.charAt(0).toUpperCase() + agency.status.slice(1)}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={loadAgencyData}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <EnhancedStatCard
          title="Total Exchanges"
          value={agency.total_exchanges || exchanges.length}
          icon={DocumentTextIcon}
          color="blue"
          subtitle="All time"
        />
        
        <EnhancedStatCard
          title="Active Exchanges"
          value={agency.active_exchanges || exchanges.filter(e => e.status === 'active').length}
          icon={ArrowPathIcon}
          color="green"
          subtitle="Currently active"
        />
        
        <EnhancedStatCard
          title="Third Parties"
          value={thirdParties.length}
          icon={UserGroupIcon}
          color="purple"
          subtitle="Assigned"
        />
        
        <EnhancedStatCard
          title="Total Clients"
          value={agency.total_clients || 0}
          icon={UserIcon}
          color="yellow"
          subtitle="Agency clients"
        />
      </div>

      {/* Agency Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Contact Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
          <dl className="space-y-4">
            <div className="flex items-center">
              <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="text-sm text-gray-900">{agency.email}</dd>
              </div>
            </div>
            
            {agency.phone && (
              <div className="flex items-center">
                <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <dt className="text-sm font-medium text-gray-500">Phone</dt>
                  <dd className="text-sm text-gray-900">{agency.phone}</dd>
                </div>
              </div>
            )}
            
            {agency.address && (
              <div className="flex items-center">
                <MapPinIcon className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <dt className="text-sm font-medium text-gray-500">Address</dt>
                  <dd className="text-sm text-gray-900">{agency.address}</dd>
                </div>
              </div>
            )}
          </dl>
        </div>

        {/* Agency Details */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Agency Details</h3>
          <dl className="space-y-4">
            <div className="flex items-center">
              <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="text-sm text-gray-900">{formatDate(agency.created_at)}</dd>
              </div>
            </div>
            
            <div className="flex items-center">
              <ArrowPathIcon className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="text-sm text-gray-900">{formatDate(agency.updated_at)}</dd>
              </div>
            </div>
          </dl>
        </div>
      </div>

      {/* Exchange Assignments */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <DocumentTextIcon className="h-6 w-6 text-gray-500 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Exchange Assignments</h3>
          </div>
          <button
            onClick={() => setShowExchangeModal(true)}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Assign Exchange
          </button>
        </div>

        <div className="space-y-3">
          {exchanges.length > 0 ? (
            exchanges.map((exchange) => (
              <div key={exchange.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{exchange.name}</p>
                  <p className="text-xs text-gray-500">
                    {exchange.property_address || 'No address'} • Status: {exchange.status}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleRemoveExchange(exchange.id)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No exchanges assigned</p>
          )}
        </div>
      </div>

      {/* Third Party Assignments */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <UserGroupIcon className="h-6 w-6 text-gray-500 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">Third Party Assignments</h3>
          </div>
          <button
            onClick={() => setShowThirdPartyModal(true)}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Assign Third Party
          </button>
        </div>

        <div className="space-y-3">
          {thirdParties.length > 0 ? (
            thirdParties.map((thirdParty) => (
              <div key={thirdParty.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{thirdParty.display_name}</p>
                  <p className="text-xs text-gray-500">
                    {thirdParty.email}
                    {thirdParty.assigned_at && (
                      <span> • Assigned {formatDate(thirdParty.assigned_at)}</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => handleRemoveThirdParty(thirdParty.id)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">No third parties assigned</p>
          )}
        </div>
      </div>

      {/* Exchange Assignment Modal */}
      <AnimatePresence>
        {showExchangeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Assign Exchange</h3>
                <button
                  onClick={() => setShowExchangeModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Exchange
                  </label>
                  <select
                    value={selectedExchangeId}
                    onChange={(e) => setSelectedExchangeId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose an exchange...</option>
                    {availableExchanges
                      .filter(ex => !exchanges.find(ae => ae.id === ex.id))
                      .map((exchange) => (
                        <option key={exchange.id} value={exchange.id}>
                          {exchange.name} - {exchange.status}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowExchangeModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssignExchange}
                    disabled={!selectedExchangeId || isAssigning}
                    className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isAssigning ? 'Assigning...' : 'Assign Exchange'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Third Party Assignment Modal */}
      <AnimatePresence>
        {showThirdPartyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Assign Third Party</h3>
                <button
                  onClick={() => setShowThirdPartyModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Third Party
                  </label>
                  <select
                    value={selectedThirdPartyId}
                    onChange={(e) => setSelectedThirdPartyId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Choose a third party...</option>
                    {availableThirdParties
                      .filter(tp => !thirdParties.find(atp => atp.id === tp.id))
                      .map((thirdParty) => (
                        <option key={thirdParty.id} value={thirdParty.id}>
                          {thirdParty.display_name} - {thirdParty.email}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowThirdPartyModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssignThirdParty}
                    disabled={!selectedThirdPartyId || isAssigning}
                    className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  >
                    {isAssigning ? 'Assigning...' : 'Assign Third Party'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AgencyProfile;