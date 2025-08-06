import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  DocumentTextIcon, 
  CheckCircleIcon, 
  UsersIcon, 
  CogIcon,
  ExclamationTriangleIcon,
  ServerIcon,
  PlusIcon,
  ChatBubbleLeftRightIcon,
  FolderIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../hooks/useAuth';
import DebugAuth from '../components/DebugChatInfo';

interface AdminStats {
  exchanges: {
    total: number;
    pending: number;
    active: number;
    completed: number;
    ppSynced: number;
  };
  users: {
    total: number;
    active: number;
    admins: number;
    clients: number;
    coordinators: number;
  };
  system: {
    lastSync: string | null;
    syncStatus: 'success' | 'pending' | 'error';
    totalDocuments: number;
    systemHealth: 'healthy' | 'warning' | 'error';
  };
  tasks: {
    total: number;
    pending: number;
    overdue: number;
    completed: number;
  };
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'exchanges' | 'tasks' | 'users' | 'agencies' | 'chat' | 'documents' | 'system'>('overview');
  const [stats, setStats] = useState<AdminStats>({
    exchanges: { total: 0, pending: 0, active: 0, completed: 0, ppSynced: 0 },
    users: { total: 0, active: 0, admins: 0, clients: 0, coordinators: 0 },
    system: { lastSync: null, syncStatus: 'pending', totalDocuments: 0, systemHealth: 'healthy' },
    tasks: { total: 0, pending: 0, overdue: 0, completed: 0 }
  });
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      // Mock data for now - replace with actual API calls
      setStats({
        exchanges: { total: 851, pending: 45, active: 234, completed: 572, ppSynced: 851 },
        users: { total: 5, active: 5, admins: 1, clients: 1, coordinators: 1 },
        system: { lastSync: '2 hours ago', syncStatus: 'success', totalDocuments: 1247, systemHealth: 'healthy' },
        tasks: { total: 156, pending: 23, overdue: 5, completed: 128 }
      });
      setUsers([
        { id: 1, first_name: 'Admin', last_name: 'User', email: 'admin@peak1031.com', role: 'admin', is_active: true },
        { id: 2, first_name: 'Client', last_name: 'User', email: 'client@peak1031.com', role: 'client', is_active: true },
        { id: 3, first_name: 'Exchange', last_name: 'Coordinator', email: 'coordinator@peak1031.com', role: 'coordinator', is_active: true },
        { id: 4, first_name: 'Agency', last_name: 'User', email: 'agency@peak1031.com', role: 'agency', is_active: true },
        { id: 5, first_name: 'Third', last_name: 'Party', email: 'thirdparty@peak1031.com', role: 'third_party', is_active: true }
      ]);
    } catch (error) {
      console.error('Error loading admin data:', error);
      setError('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncPP = async () => {
    try {
      setError(null);
      // Mock sync operation
      console.log('Starting PracticePanther sync...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('PracticePanther sync completed');
      // Refresh dashboard data to show updated progress
      await loadAdminData();
    } catch (error) {
      console.error('Sync error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Failed to sync PracticePanther data: ${errorMessage}`);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  if (!user || user.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">You don't have permission to access the admin dashboard.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        <span className="ml-3 text-gray-600">Loading admin dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
          {/* Debug Auth Info */}
          <DebugAuth />
          
          {/* Admin Header with Red/Orange Theme */}
          <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-lg p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">System Administration</h1>
                <p className="text-red-100 mt-1">
                  Peak 1031 Exchange Management System - Full Control Panel
                </p>
              </div>
              <div className="text-right">
                <div className="text-red-100 text-sm">System Health</div>
                <div className="flex items-center mt-1">
                  <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                  <span className="font-medium">All Systems Operational</span>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-2" />
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 📊 SYSTEM METRICS */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-red-900 mb-4 flex items-center">
                  <ServerIcon className="w-5 h-5 mr-2 text-red-600" />
                  System Metrics
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-600">{stats.exchanges.total}</div>
                    <div className="text-sm text-gray-600">Total Exchanges</div>
                    <div className="text-xs text-green-600 mt-1">+12% this month</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{stats.users.total}</div>
                    <div className="text-sm text-gray-600">Active Users</div>
                    <div className="text-xs text-gray-500 mt-1">{stats.users.active} active users</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600">{stats.tasks.pending}</div>
                    <div className="text-sm text-gray-600">Pending Tasks</div>
                    <div className="text-xs text-red-600 mt-1">{stats.tasks.overdue} overdue</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-emerald-600">98</div>
                    <div className="text-sm text-gray-600">System Health %</div>
                    <div className="text-xs text-gray-500 mt-1">All systems operational</div>
                  </div>
                </div>
              </div>

              {/* 📥 PRACTICEPANTHER IMPORT PROGRESS */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <span className="mr-2">📥</span>
                    PracticePanther Integration Status
                  </h2>
                  <button
                    onClick={handleSyncPP}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    🔄 Sync Now
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-900">Contacts Imported</span>
                      <span className="text-lg font-bold text-green-600">{stats.exchanges.ppSynced}</span>
                    </div>
                    <p className="text-xs text-green-700 mt-1">Successfully synced</p>
                  </div>
                  
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-900">Matters Imported</span>
                      <span className="text-lg font-bold text-blue-600">0</span>
                    </div>
                    <p className="text-xs text-blue-700 mt-1">Pending investigation</p>
                  </div>
                  
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-orange-900">Last Sync</span>
                      <span className="text-lg font-bold text-orange-600">2h ago</span>
                    </div>
                    <p className="text-xs text-orange-700 mt-1">Status: Connected</p>
                  </div>
                </div>
              </div>

              {/* 🚀 QUICK ACTIONS */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <button className="p-4 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-left">
                    <div className="text-red-600 text-2xl mb-2">👥</div>
                    <div className="font-medium text-gray-900">Add New User</div>
                    <div className="text-sm text-gray-600">Create user account</div>
                  </button>
                  
                  <button className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-left">
                    <div className="text-blue-600 text-2xl mb-2">📊</div>
                    <div className="font-medium text-gray-900">View Reports</div>
                    <div className="text-sm text-gray-600">System analytics</div>
                  </button>
                  
                  <button className="p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-left">
                    <div className="text-green-600 text-2xl mb-2">⚙️</div>
                    <div className="font-medium text-gray-900">System Settings</div>
                    <div className="text-sm text-gray-600">Configuration</div>
                  </button>
                  
                  <button className="p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors text-left">
                    <div className="text-purple-600 text-2xl mb-2">📤</div>
                    <div className="font-medium text-gray-900">Export Data</div>
                    <div className="text-sm text-gray-600">Backup system</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-600">
                      Total: {users.length} users
                    </div>
                    <div className="flex space-x-3">
                      <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Add User
                      </button>
                      <button className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                        📥 Import CSV
                      </button>
                      <button className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                        📤 Export
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4">
                          <input type="checkbox" className="rounded" />
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">👤 Name</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">📧 Email</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">🏢 Role</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b border-gray-100">
                          <td className="py-3 px-4">
                            <input type="checkbox" className="rounded" />
                          </td>
                          <td className="py-3 px-4">{user.first_name} {user.last_name}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{user.email}</td>
                          <td className="py-3 px-4 capitalize">{user.role || 'client'}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              user.is_active !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {user.is_active !== false ? '🟢 Active' : '🔴 Inactive'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex space-x-2">
                              <button className="text-blue-600 hover:text-blue-800 text-sm">✏️</button>
                              <button className="text-green-600 hover:text-green-800 text-sm">👥</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">Bulk Actions</h3>
                  <div className="flex flex-wrap gap-2">
                    <button className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm hover:bg-green-200">
                      🔓 Activate Selected
                    </button>
                    <button className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200">
                      🔒 Deactivate
                    </button>
                    <button className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200">
                      📧 Send Email
                    </button>
                    <button className="px-3 py-1 bg-gray-100 text-gray-800 rounded text-sm hover:bg-gray-200">
                      📤 Export Selected
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* System Tab */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">System Status & Configuration</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900">Sync Status</h3>
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-green-900">PracticePanther Sync</span>
                        <span className="text-xs text-green-700">🟢 Connected</span>
                      </div>
                      <p className="text-xs text-green-700 mt-1">Last sync: 2 hours ago</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900">System Health</h3>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-900">Database</span>
                        <span className="text-xs text-blue-700">✅ Operational</span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-medium text-blue-900">API Services</span>
                        <span className="text-xs text-blue-700">✅ Running</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <ChatBubbleLeftRightIcon className="w-5 h-5 mr-2" />
                    Chat Management
                  </h2>
                  <div className="flex space-x-3">
                    <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      💬 New Chat Room
                    </button>
                    <button className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                      📊 Chat Analytics
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">24</div>
                    <div className="text-sm text-gray-600">Active Chats</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">156</div>
                    <div className="text-sm text-gray-600">Messages Today</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">12</div>
                    <div className="text-sm text-gray-600">Online Users</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Recent Chat Activity</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-white rounded border">
                        <div>
                          <div className="font-medium">Exchange #EX-2024-001 Chat</div>
                          <div className="text-sm text-gray-600">Last message: 5 minutes ago</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Active</span>
                          <button className="text-blue-600 hover:text-blue-800">View</button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white rounded border">
                        <div>
                          <div className="font-medium">General Support Chat</div>
                          <div className="text-sm text-gray-600">Last message: 1 hour ago</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">Pending</span>
                          <button className="text-blue-600 hover:text-blue-800">View</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <FolderIcon className="w-5 h-5 mr-2" />
                    Document Management
                  </h2>
                  <div className="flex space-x-3">
                    <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      📁 Upload Documents
                    </button>
                    <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                      📋 Create Template
                    </button>
                    <button className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                      📤 Export All
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{stats.system.totalDocuments}</div>
                    <div className="text-sm text-gray-600">Total Documents</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">34</div>
                    <div className="text-sm text-gray-600">Templates</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">12</div>
                    <div className="text-sm text-gray-600">Pending Review</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">2.3GB</div>
                    <div className="text-sm text-gray-600">Storage Used</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">Recent Documents</h3>
                    <div className="flex space-x-2">
                      <select className="border border-gray-300 rounded px-3 py-1 text-sm">
                        <option>All Types</option>
                        <option>Exchange Documents</option>
                        <option>Templates</option>
                        <option>System Files</option>
                      </select>
                      <input 
                        type="text" 
                        placeholder="Search documents..." 
                        className="border border-gray-300 rounded px-3 py-1 text-sm w-64"
                      />
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-medium text-gray-900">📄 Document</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">📊 Exchange</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">👤 Uploaded By</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">📅 Date</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">📏 Size</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { name: 'Exchange Agreement - EX001.pdf', exchange: 'EX-2024-001', uploader: 'Admin User', date: '2024-01-15', size: '2.3MB' },
                          { name: '1031 Form Template.docx', exchange: 'Template', uploader: 'System', date: '2024-01-10', size: '156KB' },
                          { name: 'Property Deed - Wilson.pdf', exchange: 'EX-2024-002', uploader: 'Client User', date: '2024-01-12', size: '1.8MB' },
                          { name: 'Tax Records Q4.xlsx', exchange: 'EX-2024-003', uploader: 'Coordinator', date: '2024-01-08', size: '512KB' }
                        ].map((doc, index) => (
                          <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium">{doc.name}</td>
                            <td className="py-3 px-4 text-sm">
                              <span className={`px-2 py-1 rounded text-xs ${
                                doc.exchange === 'Template' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {doc.exchange}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">{doc.uploader}</td>
                            <td className="py-3 px-4 text-sm text-gray-600">{doc.date}</td>
                            <td className="py-3 px-4 text-sm text-gray-600">{doc.size}</td>
                            <td className="py-3 px-4">
                              <div className="flex space-x-2">
                                <button className="text-blue-600 hover:text-blue-800 text-sm">👁️</button>
                                <button className="text-green-600 hover:text-green-800 text-sm">📥</button>
                                <button className="text-red-600 hover:text-red-800 text-sm">🗑️</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Other tabs can be added here */}
          {(activeTab === 'exchanges' || activeTab === 'tasks' || activeTab === 'agencies') && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {activeTab === 'exchanges' && '📊 Exchanges Management'}
                {activeTab === 'tasks' && '✅ Tasks Management'}
                {activeTab === 'agencies' && '🏢 Agencies Management'}
              </h2>
              <p className="text-gray-600">This section is under development.</p>
            </div>
          )}
    </div>
  );
};

export default AdminDashboard;