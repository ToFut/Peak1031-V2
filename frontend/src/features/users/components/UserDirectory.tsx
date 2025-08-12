import React, { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  UserCircleIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ChatBubbleBottomCenterTextIcon,
  SparklesIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  BriefcaseIcon,
  HomeModernIcon,
  ScaleIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../../../services/api';
import { User } from '../../../types';
import { useAuth } from '../../../hooks/useAuth';

interface UserWithStats extends User {
  exchangeCount?: number;
  recentExchange?: {
    id: string;
    name: string;
    status: string;
  };
  lastActivity?: string;
  totalMessages?: number;
  completedTasks?: number;
}

interface UserDirectoryProps {
  onSelectUser?: (user: UserWithStats) => void;
  showStats?: boolean;
}

const UserDirectory: React.FC<UserDirectoryProps> = ({ 
  onSelectUser,
  showStats = true 
}) => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch users using the same method as UserManagement
      const userData = await apiService.getUsers();
      
      console.log('✅ Fetched users:', userData.length);
      
      // For each user, fetch their stats if enabled
      if (showStats && Array.isArray(userData)) {
        const usersWithStats = await Promise.all(
          userData.map(async (user: any) => {
            try {
              // Fetch user statistics (simplified - just set basic stats for now)
              return {
                ...user,
                exchangeCount: Math.floor(Math.random() * 5), // Mock for now
                recentExchange: null,
                lastActivity: user.lastLogin || user.updatedAt || user.createdAt
              };
            } catch (error) {
              console.error(`Failed to fetch stats for user ${user.id}:`, error);
              return user;
            }
          })
        );
        setUsers(usersWithStats);
      } else {
        setUsers(Array.isArray(userData) ? userData : []);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <ShieldCheckIcon className="w-5 h-5" />;
      case 'coordinator':
        return <UserGroupIcon className="w-5 h-5" />;
      case 'client':
        return <BriefcaseIcon className="w-5 h-5" />;
      case 'agency':
        return <BuildingOfficeIcon className="w-5 h-5" />;
      case 'third_party':
        return <ScaleIcon className="w-5 h-5" />;
      default:
        return <UserCircleIcon className="w-5 h-5" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'coordinator':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'client':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'agency':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'third_party':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.company?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    
    return matchesSearch && matchesRole;
  });

  const roles = ['all', 'admin', 'coordinator', 'client', 'agency', 'third_party'];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">User Directory</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="7" strokeWidth="2" />
                <rect x="14" y="3" width="7" height="7" strokeWidth="2" />
                <rect x="3" y="14" width="7" height="7" strokeWidth="2" />
                <rect x="14" y="14" width="7" height="7" strokeWidth="2" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by name, email, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {roles.map(role => (
              <option key={role} value={role}>
                {role === 'all' ? 'All Roles' : role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* User List/Grid */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <UserCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filters</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => onSelectUser?.(user)}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow text-left group"
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {(user.firstName || user.first_name)?.[0]}{(user.lastName || user.last_name)?.[0]}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.firstName || user.first_name} {user.lastName || user.last_name}
                    </p>
                    <p className="text-sm text-gray-500 truncate">{user.email}</p>
                    <div className="mt-1 flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                        {getRoleIcon(user.role)}
                        <span className="ml-1">{user.role?.replace('_', ' ')}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {showStats && (
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-gray-500">Exchanges</p>
                      <p className="font-medium text-gray-900">
                        {user.exchangeCount || 0}
                        {user.recentExchange && (
                          <span className="text-gray-500 font-normal"> (1 active)</span>
                        )}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-gray-500">Last Active</p>
                      <p className="font-medium text-gray-900">
                        {formatDate(user.lastActivity || user.created_at)}
                      </p>
                    </div>
                  </div>
                )}

                {user.company && (
                  <div className="mt-3 flex items-center text-xs text-gray-500">
                    <BuildingOfficeIcon className="w-4 h-4 mr-1" />
                    {user.company}
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => onSelectUser?.(user)}
                className="w-full px-4 py-4 hover:bg-gray-50 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                      {(user.firstName || user.first_name)?.[0]}{(user.lastName || user.last_name)?.[0]}
                    </div>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900">
                        {user.firstName || user.first_name} {user.lastName || user.last_name}
                      </p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                        {user.role?.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>

                {showStats && (
                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <div className="flex items-center">
                      <DocumentTextIcon className="w-4 h-4 mr-1" />
                      <span>{user.exchangeCount || 0} exchanges</span>
                    </div>
                    <div className="flex items-center">
                      <CalendarIcon className="w-4 h-4 mr-1" />
                      <span>{formatDate(user.lastActivity || user.created_at)}</span>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {showStats && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-6">
              <div className="flex items-center text-gray-600">
                <UserCircleIcon className="w-4 h-4 mr-1" />
                <span>{filteredUsers.length} users</span>
              </div>
              <div className="flex items-center text-gray-600">
                <ChartBarIcon className="w-4 h-4 mr-1" />
                <span>
                  {filteredUsers.reduce((sum, u) => sum + (u.exchangeCount || 0), 0)} total exchanges
                </span>
              </div>
            </div>
            <div className="text-gray-500">
              {currentUser && (
                <span className="flex items-center">
                  <SparklesIcon className="w-4 h-4 mr-1" />
                  Viewing as {currentUser.role}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDirectory;
