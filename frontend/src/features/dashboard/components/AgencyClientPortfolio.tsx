import React, { useState, useEffect } from 'react';
import {
  UserIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  DocumentTextIcon,
  EyeIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  XMarkIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  total_exchanges: number;
  active_exchanges: number;
  completed_exchanges: number;
  total_value: number;
  last_activity: string;
  assigned_third_parties: ThirdPartyAssignment[];
}

interface ThirdPartyAssignment {
  id: string;
  third_party_id: string;
  third_party_name: string;
  third_party_email: string;
  third_party_company?: string;
  assignment_date: string;
  status: 'active' | 'inactive';
  assigned_exchanges: number;
  active_exchanges: number;
  completed_exchanges: number;
  success_rate: number;
  performance_score: number;
  avg_completion_time: number;
  total_revenue: number;
  last_activity: string;
  recent_exchanges: ClientExchange[];
}

interface ClientExchange {
  id: string;
  title: string;
  status: string;
  value: number;
  completion_percentage?: number;
  days_remaining?: number;
  third_party_name?: string;
  created_at: string;
  updated_at: string;
}

// Client Detail Modal Component
const ClientDetailModal: React.FC<{
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
}> = ({ client, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'third-parties' | 'exchanges'>('overview');

  if (!isOpen || !client) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <UserIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{client.name}</h2>
              <p className="text-sm text-gray-600">{client.company}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(client.status)}`}>
                  {client.status}
                </span>
                <span className="text-xs text-gray-500">
                  Client since {new Date(client.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="px-6 -mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: ChartBarIcon },
              { id: 'third-parties', name: 'Third Parties', icon: UserGroupIcon },
              { id: 'exchanges', name: 'Exchanges', icon: DocumentTextIcon }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`group inline-flex items-center px-1 py-4 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className={`mr-2 h-5 w-5 ${
                    activeTab === tab.id ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                  }`} />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                      <span className="text-sm text-gray-600">{client.email}</span>
                    </div>
                    {client.phone && (
                      <div className="flex items-center gap-3">
                        <PhoneIcon className="h-5 w-5 text-gray-400" />
                        <span className="text-sm text-gray-600">{client.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <CalendarIcon className="h-5 w-5 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        Last activity: {new Date(client.last_activity).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Portfolio Summary</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{client.total_exchanges}</div>
                      <div className="text-sm text-blue-700">Total Exchanges</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{client.active_exchanges}</div>
                      <div className="text-sm text-green-700">Active</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">${(client.total_value / 1000000).toFixed(1)}M</div>
                      <div className="text-sm text-purple-700">Total Value</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{client.assigned_third_parties.length}</div>
                      <div className="text-sm text-yellow-700">Third Parties</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Third Party Overview */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Assigned Third Parties Overview</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {client.assigned_third_parties.slice(0, 4).map((tp) => (
                    <div key={tp.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{tp.third_party_name}</h4>
                        <span className="text-sm text-gray-500">{tp.assigned_exchanges} exchanges</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Active:</span>
                          <span className="ml-1 font-medium text-green-600">{tp.active_exchanges}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Success:</span>
                          <span className={`ml-1 font-medium ${getPerformanceColor(tp.success_rate)}`}>
                            {tp.success_rate}%
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Score:</span>
                          <span className={`ml-1 font-medium ${getPerformanceColor(tp.performance_score)}`}>
                            {tp.performance_score}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Third Parties Tab */}
          {activeTab === 'third-parties' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  Third Parties Assigned to {client.name}
                </h3>
                <span className="text-sm text-gray-500">
                  {client.assigned_third_parties.length} total assignments
                </span>
              </div>

              <div className="space-y-4">
                {client.assigned_third_parties.map((tp) => (
                  <div key={tp.id} className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                          <UserGroupIcon className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="text-lg font-medium text-gray-900">{tp.third_party_name}</h4>
                          <p className="text-sm text-gray-600">{tp.third_party_email}</p>
                          {tp.third_party_company && (
                            <p className="text-xs text-gray-500">{tp.third_party_company}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            Assigned since {new Date(tp.assignment_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(tp.status)}`}>
                          {tp.status}
                        </span>
                        <div className="mt-2">
                          <div className={`text-lg font-bold ${getPerformanceColor(tp.performance_score)}`}>
                            {tp.performance_score}
                          </div>
                          <div className="text-xs text-gray-500">Performance Score</div>
                        </div>
                      </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-xl font-bold text-blue-600">{tp.assigned_exchanges}</div>
                        <div className="text-xs text-gray-600">Total Exchanges</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-green-600">{tp.active_exchanges}</div>
                        <div className="text-xs text-gray-600">Active</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-xl font-bold ${getPerformanceColor(tp.success_rate)}`}>
                          {tp.success_rate}%
                        </div>
                        <div className="text-xs text-gray-600">Success Rate</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-purple-600">
                          ${(tp.total_revenue / 1000).toFixed(0)}K
                        </div>
                        <div className="text-xs text-gray-600">Revenue</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-yellow-600">{tp.avg_completion_time}</div>
                        <div className="text-xs text-gray-600">Avg Days</div>
                      </div>
                    </div>

                    {/* Recent Exchanges */}
                    {tp.recent_exchanges && tp.recent_exchanges.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-900 mb-2">Recent Exchanges</h5>
                        <div className="space-y-2">
                          {tp.recent_exchanges.slice(0, 3).map((exchange) => (
                            <div key={exchange.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{exchange.title}</div>
                                <div className="text-xs text-gray-500">
                                  {new Date(exchange.created_at).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium text-gray-900">
                                  ${exchange.value.toLocaleString()}
                                </div>
                                <div className={`text-xs px-2 py-1 rounded-full ${
                                  exchange.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                  exchange.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {exchange.status}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Exchanges Tab */}
          {activeTab === 'exchanges' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  All Exchanges for {client.name}
                </h3>
                <span className="text-sm text-gray-500">
                  {client.total_exchanges} total • {client.active_exchanges} active
                </span>
              </div>

              {/* Exchange filters could go here */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 text-center">
                  Detailed exchange list would be loaded here from the exchanges API
                </p>
                <p className="text-xs text-gray-500 text-center mt-1">
                  Filtered by client ID: {client.id}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
            View All Exchanges
          </button>
          <button className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors">
            Generate Client Report
          </button>
          <button className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors">
            Export Data
          </button>
        </div>
      </div>
    </div>
  );
};

const AgencyClientPortfolio: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      
      // Use intelligent URL detection
      let baseUrl = process.env.REACT_APP_API_URL;
      
      if (!baseUrl) {
        const isProduction = window.location.hostname !== 'localhost';
        if (isProduction && window.location.hostname.includes('vercel.app')) {
          baseUrl = 'https://peak1031-production.up.railway.app/api';
        } else {
          baseUrl = 'http://localhost:5001/api';
        }
      }

      const response = await fetch(`${baseUrl}/agency/clients-portfolio`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        // Normalize to an array regardless of API shape
        const normalized: any = result;
        let list: Client[] = [];
        if (Array.isArray(normalized)) {
          list = normalized as Client[];
        } else if (Array.isArray(normalized?.data)) {
          list = normalized.data as Client[];
        } else if (Array.isArray(normalized?.clients)) {
          list = normalized.clients as Client[];
        } else if (normalized?.success && Array.isArray(normalized?.data)) {
          list = normalized.data as Client[];
        } else {
          list = [];
        }
        setClients(list);
      } else {
        console.error('Failed to load client portfolio:', response.statusText);
        setClients([]);
      }
    } catch (error) {
      console.error('Error loading client portfolio:', error);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClientClick = (client: Client) => {
    setSelectedClient(client);
    setShowClientModal(true);
  };

  // Filter clients based on search and status (guard against non-array)
  const safeClients = Array.isArray(clients) ? clients : [];
  const filteredClients = safeClients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (client.company && client.company.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Client Detail Modal */}
      <ClientDetailModal
        client={selectedClient}
        isOpen={showClientModal}
        onClose={() => {
          setShowClientModal(false);
          setSelectedClient(null);
        }}
      />

      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Client Portfolio</h1>
              <p className="text-gray-600 mt-1">
                Manage your clients and their assigned third parties
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">Total Clients:</span>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                {clients.length}
              </span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search clients by name, email, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredClients.map((client) => (
          <div
            key={client.id}
            onClick={() => handleClientClick(client)}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
          >
            {/* Client Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <UserIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{client.name}</h3>
                  <p className="text-sm text-gray-600">{client.email}</p>
                  {client.company && (
                    <p className="text-xs text-gray-500">{client.company}</p>
                  )}
                </div>
              </div>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(client.status)}`}>
                {client.status}
              </span>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{client.total_exchanges}</div>
                <div className="text-xs text-gray-600">Total Exchanges</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">{client.active_exchanges}</div>
                <div className="text-xs text-gray-600">Active</div>
              </div>
            </div>

            {/* Portfolio Value */}
            <div className="mb-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Portfolio Value:</span>
                <span className="text-sm font-medium text-gray-900">
                  ${(client.total_value / 1000000).toFixed(1)}M
                </span>
              </div>
            </div>

            {/* Assigned Third Parties */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Assigned Third Parties</span>
                <span className="text-sm text-gray-500">{client.assigned_third_parties.length}</span>
              </div>
              
              {client.assigned_third_parties.length > 0 ? (
                <div className="space-y-2">
                  {client.assigned_third_parties.slice(0, 2).map((tp) => (
                    <div key={tp.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{tp.third_party_name}</div>
                        <div className="text-xs text-gray-500">{tp.assigned_exchanges} exchanges</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-purple-600">{tp.performance_score}</div>
                        <div className="text-xs text-gray-500">score</div>
                      </div>
                    </div>
                  ))}
                  {client.assigned_third_parties.length > 2 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{client.assigned_third_parties.length - 2} more
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-gray-500 text-center py-2">
                  No third parties assigned
                </div>
              )}
            </div>

            {/* Action Button */}
            <button className="w-full bg-blue-50 text-blue-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
              View Client Details & Performance →
            </button>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredClients.length === 0 && (
        <div className="text-center py-12">
          <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No clients found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery || statusFilter !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'No clients have been assigned to your agency yet'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default AgencyClientPortfolio;