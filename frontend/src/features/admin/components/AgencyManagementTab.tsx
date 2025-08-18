import React, { useState, useEffect } from 'react';
import { apiService } from '../../../services/api';
import { agencyApi } from '../../../services/agencyApi';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Building2,
  Users,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText
} from 'lucide-react';

interface Agency {
  id: string;
  name: string;
  type: 'agency' | 'third_party' | 'vendor';
  contact_person: string;
  email: string;
  phone: string;
  website?: string;
  address?: string;
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  updated_at: string;
  exchange_count?: number;
  user_count?: number;
}

const AgencyManagementTab: React.FC = () => {
  const { isAdmin, userRole } = usePermissions();
  
  console.log('🔍 AgencyManagementTab rendered, isAdmin:', isAdmin());
  
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // UI states
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Check admin access
  useEffect(() => {
    if (!isAdmin()) {
      setError('Access denied. Admin privileges required.');
      return;
    }
  }, [isAdmin]);

  const loadAgencies = async () => {
    console.log('🔄 Loading agencies...');
    try {
      setLoading(true);
      setError(null);
      
      // Use the real API endpoint
      console.log('📡 Making API call to /agencies...');
      const response = await apiService.get('/agencies', {
        useCache: false,
        forceRefresh: true
      });
      console.log('📡 API response:', response);
      
      if (response.success && response.data) {
        // Transform the API response to match our interface
        const transformedAgencies: Agency[] = response.data.map((agency: any) => ({
          id: agency.id,
          name: agency.display_name || agency.company || `${agency.first_name} ${agency.last_name}`.trim(),
          type: agency.contact_type?.includes('agency') ? 'agency' : 'third_party',
          contact_person: `${agency.first_name || ''} ${agency.last_name || ''}`.trim(),
          email: agency.email,
          phone: agency.phone_primary || agency.phone,
          website: agency.website,
          address: agency.address,
          status: agency.status || (agency.is_active ? 'active' : 'inactive'),
          created_at: agency.created_at,
          updated_at: agency.updated_at,
          exchange_count: agency.exchange_count || 0,
          user_count: agency.user_count || 0
        }));
        
        setAgencies(transformedAgencies);
      } else {
        setError('Failed to load agencies');
      }
    } catch (err: any) {
      console.error('Error loading agencies:', err);
      setError(err.message || 'Failed to load agencies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔧 useEffect triggered, isAdmin:', isAdmin());
    if (isAdmin()) {
      loadAgencies();
    } else {
      console.log('❌ User is not admin, not loading agencies');
    }
  }, [isAdmin]);

  // Admin Actions
  const handleViewAgency = (agency: Agency) => {
    console.log('🔍 handleViewAgency called with:', agency);
    
    const details = `
Agency Details:
Name: ${agency.name}
Contact: ${agency.contact_person}
Email: ${agency.email}
Phone: ${agency.phone}
Type: ${agency.type}
Status: ${agency.status}
Website: ${agency.website || 'N/A'}
Address: ${agency.address || 'N/A'}
Exchanges: ${agency.exchange_count || 0}
Users: ${agency.user_count || 0}
Created: ${new Date(agency.created_at).toLocaleDateString()}
    `;
    
    alert(details);
  };

  const handleEditAgency = async (agency: Agency) => {
    console.log('✏️ handleEditAgency called with:', agency);
    
    const newName = prompt('Enter new agency name:', agency.name);
    if (!newName || newName === agency.name) return;
    
    const newEmail = prompt('Enter new email:', agency.email);
    if (!newEmail) return;
    
    const newPhone = prompt('Enter new phone:', agency.phone);
    if (!newPhone) return;
    
    try {
      setActionLoading(agency.id);
      const response = await apiService.put(`/users/${agency.id}`, {
        first_name: newName.split(' ')[0] || '',
        last_name: newName.split(' ').slice(1).join(' ') || '',
        email: newEmail,
        phone_primary: newPhone
      });
      
      if (response.success) {
        await loadAgencies();
        alert('Agency updated successfully!');
      } else {
        alert('Failed to update agency');
      }
    } catch (error) {
      console.error('Error updating agency:', error);
      alert('Error updating agency');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteAgency = async (agency: Agency) => {
    console.log('🗑️ handleDeleteAgency called with:', agency);
    if (!window.confirm(`Are you sure you want to delete ${agency.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      setActionLoading(agency.id);
      const response = await apiService.delete(`/users/${agency.id}`);
      
      if (response.success) {
        await loadAgencies();
        alert('Agency deleted successfully');
      } else {
        alert('Failed to delete agency');
      }
    } catch (error) {
      console.error('Error deleting agency:', error);
      alert('Error deleting agency');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAssignThirdParties = async (agency: Agency) => {
    console.log('👥 handleAssignThirdParties called with:', agency);
    
    try {
      // Get available third parties
      const response = await apiService.get('/contacts?type=third_party&limit=50');
      
      if (response.success && response.data) {
        const thirdParties = response.data;
        const options = thirdParties.map((tp: any) => 
          `${tp.first_name} ${tp.last_name} (${tp.email})`
        ).join('\n');
        
        const selected = prompt(
          `Select third parties to assign to ${agency.name}:\n\nAvailable:\n${options}\n\nEnter comma-separated email addresses:`
        );
        
        if (selected) {
          const emails = selected.split(',').map(e => e.trim());
          const selectedParties = thirdParties.filter((tp: any) => 
            emails.includes(tp.email)
          );
          
          if (selectedParties.length > 0) {
            alert(`Assigned ${selectedParties.length} third parties to ${agency.name}`);
            // Here you would make the actual assignment API call
          }
        }
      } else {
        alert('No third parties available for assignment');
      }
    } catch (error) {
      console.error('Error assigning third parties:', error);
      alert('Error assigning third parties');
    }
  };

  const handleViewStats = async (agency: Agency) => {
    console.log('📊 handleViewStats called with:', agency);
    
    try {
      // Get agency statistics
      const statsResponse = await apiService.get(`/admin/stats`);
      const exchangesResponse = await apiService.get(`/exchanges?limit=100`);
      
      let stats = 'Agency Statistics:\n\n';
      stats += `Agency: ${agency.name}\n`;
      stats += `Status: ${agency.status}\n`;
      stats += `Exchanges: ${agency.exchange_count || 0}\n`;
      stats += `Users: ${agency.user_count || 0}\n\n`;
      
      if (statsResponse.success) {
        stats += `System Totals:\n`;
        stats += `Total Users: ${statsResponse.data?.users || 0}\n`;
        stats += `Total Exchanges: ${statsResponse.data?.exchanges || 0}\n`;
        stats += `Total Documents: ${statsResponse.data?.documents || 0}\n`;
        stats += `Total Tasks: ${statsResponse.data?.tasks || 0}\n`;
      }
      
      alert(stats);
    } catch (error) {
      console.error('Error loading stats:', error);
      alert('Error loading agency statistics');
    }
  };



  const handleToggleStatus = async (agency: Agency) => {
    const newStatus = agency.status === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? 'activate' : 'deactivate';

    if (!window.confirm(`Are you sure you want to ${action} ${agency.name}?`)) {
      return;
    }

    try {
      setActionLoading(agency.id);
      const response = await apiService.put(`/users/${agency.id}`, {
        is_active: newStatus === 'active'
      });
      
      if (response.success) {
        await loadAgencies();
        alert(`Agency ${action}d successfully`);
      } else {
        alert(`Failed to ${action} agency`);
      }
    } catch (error) {
      console.error(`Error ${action}ing agency:`, error);
      alert(`Error ${action}ing agency`);
    } finally {
      setActionLoading(null);
    }
  };



  const filteredAgencies = agencies.filter(agency => {
    const matchesSearch = agency.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agency.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agency.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || agency.status === statusFilter;
    const matchesType = !typeFilter || agency.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Active</span>;
      case 'inactive':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Inactive</span>;
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"><AlertCircle className="w-3 h-3 mr-1" />Pending</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'agency':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Agency</span>;
      case 'third_party':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Third Party</span>;
      case 'vendor':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Vendor</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{type}</span>;
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Agency Management</h1>
            <p className="text-gray-600">Manage agencies and third-party organizations</p>
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  console.log('🎨 Rendering AgencyManagementTab component');
  
  // Simple test to see if component is rendering
  if (!isAdmin()) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-lg font-semibold text-red-800">Access Denied</h2>
        <p className="text-red-600">You need admin privileges to access this page.</p>
        <p className="text-sm text-red-500 mt-2">Current user role: {userRole}</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Debug info */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-medium text-blue-800">Debug Info</h3>
        <p className="text-xs text-blue-600">Loading: {loading.toString()}</p>
        <p className="text-xs text-blue-600">Error: {error || 'None'}</p>
        <p className="text-xs text-blue-600">Agencies count: {agencies.length}</p>
        <p className="text-xs text-blue-600">Is Admin: {isAdmin().toString()}</p>
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agency Management</h1>
          <p className="text-gray-600">Manage agencies and third-party organizations</p>
        </div>
        <button
          onClick={() => alert('Add Agency functionality - Coming soon!')}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Agency
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search agencies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 w-full"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Types</option>
              <option value="agency">Agency</option>
              <option value="third_party">Third Party</option>
              <option value="vendor">Vendor</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setTypeFilter('');
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Agencies List */}
      <div className="bg-white shadow rounded-lg">
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading agencies...</p>
          </div>
        ) : filteredAgencies.length === 0 ? (
          <div className="p-6 text-center">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No agencies found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter || typeFilter 
                ? 'Try adjusting your filters.' 
                : 'Get started by creating a new agency.'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agency</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stats</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAgencies.map((agency) => (
                  <tr key={agency.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{agency.name}</div>
                        {agency.website && (
                          <div className="text-sm text-gray-500">
                            <a href={agency.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                              {agency.website}
                            </a>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900">{agency.contact_person}</div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Mail className="h-3 w-3 mr-1" />
                          {agency.email}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Phone className="h-3 w-3 mr-1" />
                          {agency.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getTypeBadge(agency.type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(agency.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-1" />
                          {agency.exchange_count || 0} exchanges
                        </div>
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          {agency.user_count || 0} users
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            console.log('👁️ View button clicked for agency:', agency.name);
                            handleViewAgency(agency);
                          }}
                          className="text-blue-600 hover:text-blue-900 cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            console.log('✏️ Edit button clicked for agency:', agency.name);
                            handleEditAgency(agency);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 cursor-pointer"
                          title="Edit Agency"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleAssignThirdParties(agency)}
                          className="text-green-600 hover:text-green-900"
                          title="Assign Third Parties"
                        >
                          <Users className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleViewStats(agency)}
                          className="text-purple-600 hover:text-purple-900"
                          title="View Statistics"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(agency)}
                          disabled={actionLoading === agency.id}
                          className={`${agency.status === 'active' ? 'text-orange-600 hover:text-orange-900' : 'text-green-600 hover:text-green-900'}`}
                          title={agency.status === 'active' ? 'Deactivate' : 'Activate'}
                        >
                          {actionLoading === agency.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                          ) : (
                            agency.status === 'active' ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteAgency(agency)}
                          disabled={actionLoading === agency.id}
                          className="text-red-600 hover:text-red-900"
                          title="Delete Agency"
                        >
                          {actionLoading === agency.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
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
  );
};

export default AgencyManagementTab;
