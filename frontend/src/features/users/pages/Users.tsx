import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import { usePermissions } from '../../../hooks/usePermissions';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  User,
  CheckCircle,
  BarChart3,
  DollarSign,
  RefreshCw,
  MoreVertical,
  Mail,
  Clock,
  Star,
  Plus,
  Edit,
  Trash2,
  Shield,
  Lock,
  Unlock,
  Send,
  MessageSquare,
  Eye,
  Settings,
  Download,
  Copy,
  AlertTriangle
} from 'lucide-react';

const Users: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAdmin } = usePermissions();
  const navigate = useNavigate();

  // Filter states
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');
  const [exchangeStatusFilter, setExchangeStatusFilter] = useState('');
  const [exchangeMinValue, setExchangeMinValue] = useState('');
  const [exchangeMaxValue, setExchangeMaxValue] = useState('');

  // UI states
  const [showRoleChip, setShowRoleChip] = useState(false);
  const [showStatusChip, setShowStatusChip] = useState(false);
  const [showExchangeStatusChip, setShowExchangeStatusChip] = useState(false);
  const [showMinChip, setShowMinChip] = useState(false);
  const [showMaxChip, setShowMaxChip] = useState(false);
  const [userActionMenu, setUserActionMenu] = useState<string | null>(null);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);

  // Check if user has admin access
  useEffect(() => {
    if (!isAdmin()) {
    
    navigate('/dashboard');
    return;
    }
  }, [isAdmin, navigate]);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use real-time data fetching with minimal caching for offline fallback only
      const response = await apiService.get('/admin/users', {
        useCache: false, // Don't use cache for real-time data
        cacheDuration: 1 * 60 * 1000, // 1 minute for offline fallback only
        useFallback: true,
        forceRefresh: true, // Always fetch fresh data
        lazyLoad: false
      });
      
      // Handle both direct array and paginated response
      const usersData = response.users || response.data || response || [];
      
      setUsers(usersData);
    } catch (err: any) {
      console.error('❌ Error loading users:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only load users if user is admin
    if (isAdmin()) {
    loadUsers();
    }
  }, [isAdmin, loadUsers]);

  // Filter users based on all criteria
  const filteredUserList = users.filter(user => {
    const matchesSearch = !userSearch || 
    user.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.first_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    user.last_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    `${user.first_name} ${user.last_name}`.toLowerCase().includes(userSearch.toLowerCase());
    
    const matchesRole = !userRoleFilter || user.role === userRoleFilter;
    const matchesStatus = !userStatusFilter || (userStatusFilter === 'Active' ? user.is_active : !user.is_active);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Don't load users if user is not admin
  if (!isAdmin()) {
    return (
    
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking permissions...</p>
        </div>
      </div>
    
    );
  }

  // Admin action handlers
  const handleSendLoginLink = async (user: any) => {
    try {
    const response = await apiService.post(`/admin/users/${user.id}/send-login-link`, {});
    if (response.success) {
      alert(`Login link sent to ${user.email}\n\nLink: ${response.loginLink}`);
    }
    } catch (error: any) {
    alert(`Error sending login link: ${error.message}`);
    }
    setUserActionMenu(null);
  };

  const handleViewUserProfile = (user: any) => {
    // Navigate to the detailed user profile page
    navigate(`/users/user-profile/${user.id}`);
    setUserActionMenu(null);
  };

  const handleSeeAudit = async (user: any) => {
    try {
    const response = await apiService.get(`/admin/users/${user.id}/audit`);
    alert(`Audit logs for ${user.email}:\n\n${JSON.stringify(response.data, null, 2)}`);
    } catch (error: any) {
    alert(`Error fetching audit logs: ${error.message}`);
    }
    setUserActionMenu(null);
  };

  const handleChat = (user: any) => {
    // Navigate to messages page with user filter
    navigate(`/messages?user=${user.id}`);
    setUserActionMenu(null);
  };

  const handleDeactivate = async (user: any) => {
    if (window.confirm(`Are you sure you want to ${user.is_active ? 'deactivate' : 'activate'} ${user.email}?`)) {
    try {
      const response = await apiService.patch(`/admin/users/${user.id}/status`, {
        isActive: !user.is_active
      });
      if (response.success) {
        alert(response.message);
        // Refresh users list
        loadUsers();
      }
    } catch (error: any) {
      alert(`Error updating user status: ${error.message}`);
    }
    }
    setUserActionMenu(null);
  };

  const handleAdminAssignExchange = async (user: any, exchangeId: string) => {
    try {
    // This would need a separate endpoint for assigning users to exchanges
    alert(`Assigned ${user.email} to exchange ${exchangeId}`);
    } catch (error: any) {
    alert(`Error assigning user to exchange: ${error.message}`);
    }
    setUserActionMenu(null);
  };

  const handleAdminAssignSuperThirdParty = async (user: any, thirdPartyId: string) => {
    try {
    // This would need a separate endpoint for assigning super third party
    alert(`Assigned Super Third Party to ${user.email} (Third Party ID: ${thirdPartyId})`);
    } catch (error: any) {
    alert(`Error assigning super third party: ${error.message}`);
    }
    setUserActionMenu(null);
  };

  const handleEditUser = async (user: any) => {
    // For now, just show current user data
    alert(`Edit user profile for ${user.email}\n\nThis would open an edit form in a future update.`);
  };

  const handleResetPassword = async (user: any) => {
    if (window.confirm(`Are you sure you want to reset the password for ${user.email}?`)) {
    try {
      const response = await apiService.post(`/admin/users/${user.id}/reset-password`, {});
      if (response.success) {
        alert(`Password reset successfully!\n\nNew password: ${response.newPassword}\n\nPlease share this password securely with the user.`);
      }
    } catch (error: any) {
      alert(`Error resetting password: ${error.message}`);
    }
    }
  };

  const handleEnable2FA = async (user: any) => {
    const action = user.two_fa_enabled ? 'disable' : 'enable';
    if (window.confirm(`Are you sure you want to ${action} 2FA for ${user.email}?`)) {
    try {
      const response = await apiService.patch(`/admin/users/${user.id}/2fa`, {
        twoFaEnabled: !user.two_fa_enabled
      });
      if (response.success) {
        alert(response.message);
        // Refresh users list
        loadUsers();
      }
    } catch (error: any) {
      alert(`Error updating 2FA status: ${error.message}`);
    }
    }
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    alert('Email copied to clipboard');
  };

  const handleDeleteUser = async (user: any) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
    try {
      const response = await apiService.delete(`/admin/users/${user.id}`);
      if (response.success) {
        alert(response.message);
        // Refresh users list
        loadUsers();
        setShowProfileDrawer(false);
      }
    } catch (error: any) {
      alert(`Error deleting user: ${error.message}`);
    }
    }
  };

  const handleChangeRole = async (user: any, newRole: string) => {
    try {
    const response = await apiService.patch(`/admin/users/${user.id}/role`, {
      role: newRole
    });
    if (response.success) {
      alert(response.message);
      // Refresh users list
      loadUsers();
    }
    } catch (error: any) {
    alert(`Error changing user role: ${error.message}`);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role?.toLowerCase()) {
    case 'admin': return 'bg-red-100 text-red-800';
    case 'coordinator': return 'bg-blue-100 text-blue-800';
    case 'client': return 'bg-green-100 text-green-800';
    case 'third_party': return 'bg-purple-100 text-purple-800';
    case 'agency': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive 
    ? 'bg-green-100 text-green-800' 
    : 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
    
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="space-y-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-20"></div>
          ))}
        </div>
      </div>
    
    );
  }

  return (
    
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage users, roles, and permissions</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2 items-center mb-6">
        {/* Search bar */}
        <div className="flex items-center bg-white border border-gray-200 rounded-full px-3 py-1 shadow-sm">
          <Search className="w-4 h-4 text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search user..."
            className="border-none outline-none bg-transparent px-1 py-1 w-32 md:w-40 text-sm"
            value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
          />
        </div>

        {/* Role chip */}
        <div className="relative">
          <button
            className={`px-3 py-1 rounded-full border text-xs font-semibold flex items-center gap-1 transition ${userRoleFilter ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'}`}
            onClick={() => setShowRoleChip(!showRoleChip)}
            type="button"
          >
            <User className="w-4 h-4" />
            {userRoleFilter ? userRoleFilter : 'All Roles'}
          </button>
          {showRoleChip && (
            <div className="absolute z-10 mt-2 bg-white border border-gray-200 rounded shadow-lg w-40 animate-fade-in">
              {['', 'admin', 'coordinator', 'client', 'third_party', 'agency'].map(role => (
                <div
                  key={role}
                  className={`px-4 py-2 cursor-pointer hover:bg-blue-50 ${userRoleFilter === role ? 'bg-blue-100 font-semibold' : ''}`}
                  onClick={() => { setUserRoleFilter(role); setShowRoleChip(false); }}
                >
                  {role === '' ? 'All Roles' : role.charAt(0).toUpperCase() + role.slice(1)}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status chip */}
        <div className="relative">
          <button
            className={`px-3 py-1 rounded-full border text-xs font-semibold flex items-center gap-1 transition ${userStatusFilter ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'}`}
            onClick={() => setShowStatusChip(!showStatusChip)}
            type="button"
          >
            <CheckCircle className="w-4 h-4" />
            {userStatusFilter ? userStatusFilter : 'All Status'}
          </button>
          {showStatusChip && (
            <div className="absolute z-10 mt-2 bg-white border border-gray-200 rounded shadow-lg w-32 animate-fade-in">
              {['', 'Active', 'Inactive'].map(status => (
                <div
                  key={status}
                  className={`px-4 py-2 cursor-pointer hover:bg-blue-50 ${userStatusFilter === status ? 'bg-blue-100 font-semibold' : ''}`}
                  onClick={() => { setUserStatusFilter(status); setShowStatusChip(false); }}
                >
                  {status === '' ? 'All Status' : status}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clear All chip */}
        <button
          className="px-3 py-1 rounded-full border text-xs font-semibold flex items-center gap-1 bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 transition"
          onClick={() => {
            setUserSearch('');
            setUserRoleFilter('');
            setUserStatusFilter('');
            setExchangeStatusFilter('');
            setExchangeMinValue('');
            setExchangeMaxValue('');
          }}
          title="Clear All Filters"
          type="button"
        >
          <RefreshCw className="w-4 h-4" />
          Clear All
        </button>
      </div>

      {/* User Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredUserList.map(user => (
          <div
            key={user.id}
            className="bg-white rounded-xl shadow p-6 border flex flex-col hover:shadow-lg transition cursor-pointer relative"
            onClick={() => handleViewUserProfile(user)}
            tabIndex={0}
            role="button"
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { handleViewUserProfile(user); } }}
          >
            {/* Three dots admin actions menu */}
            <div className="absolute top-4 right-4 z-10">
              <button 
                onClick={e => { 
                  e.stopPropagation(); 
                  setUserActionMenu(user.id === userActionMenu ? null : user.id); 
                }} 
                className="p-2 rounded-full hover:bg-gray-100 focus:outline-none"
              >
                <MoreVertical className="w-5 h-5 text-gray-500" />
              </button>
              {userActionMenu === user.id && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded shadow-lg z-20 animate-fade-in">
                  <button className="block w-full text-left px-4 py-2 hover:bg-blue-50" onClick={() => handleSendLoginLink(user)}>
                    <Send className="w-4 h-4 inline mr-2" />
                    Send Login Link
                  </button>
                  <button className="block w-full text-left px-4 py-2 hover:bg-blue-50" onClick={() => handleViewUserProfile(user)}>
                    <BarChart3 className="w-4 h-4 inline mr-2" />
                    View Analytics
                  </button>
                  <button className="block w-full text-left px-4 py-2 hover:bg-blue-50" onClick={() => handleSeeAudit(user)}>
                    <BarChart3 className="w-4 h-4 inline mr-2" />
                    See Audit
                  </button>
                  <button className="block w-full text-left px-4 py-2 hover:bg-blue-50" onClick={() => handleChat(user)}>
                    <MessageSquare className="w-4 h-4 inline mr-2" />
                    Chat
                  </button>
                  <div className="border-t my-1"></div>
                  <button className="block w-full text-left px-4 py-2 hover:bg-red-50 text-red-600" onClick={() => handleDeactivate(user)}>
                    {user.is_active ? (
                      <>
                        <Lock className="w-4 h-4 inline mr-2" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <Unlock className="w-4 h-4 inline mr-2" />
                        Activate
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* User Avatar and Info */}
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-700 shadow">
                {`${user.first_name || ''} ${user.last_name || ''}`.split(' ').map(n => n[0]).join('') || user.email[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-lg">
                  {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email}
                </div>
                <div className="text-xs text-gray-500">
                  {user.role} 
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.is_active)}`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            {/* User Details */}
            <div className="text-sm text-gray-700 mb-2">
              Email: {user.email}
            </div>

            {/* Last Login */}
            {user.last_login && (
              <div className="text-xs text-gray-500 mb-2">
                Last login: {new Date(user.last_login).toLocaleDateString()}
              </div>
            )}

            {/* Role Badge */}
            <div className="flex flex-wrap gap-2 mb-1">
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRoleColor(user.role)}`}>
                {user.role}
              </span>
              {user.two_fa_enabled && (
                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                  2FA Enabled
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredUserList.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No users found</h3>
          <p className="text-gray-600">Try adjusting your search or filter criteria</p>
        </div>
      )}


      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-red-800 font-medium">Error</span>
          </div>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      )}
    </div>
    
  );
};

export default Users;