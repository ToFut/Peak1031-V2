import React, { useState, useEffect } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { useRolePermissions } from '@/shared/hooks/useRolePermissions';
import { roleBasedApiService } from '@/shared/services/roleBasedApiService';
import RoleSpecificWidgets from '../components/RoleSpecificWidgets';
import PinProtectedAccess from '../../documents/components/PinProtectedAccess';
import {
  DocumentTextIcon,
  EyeIcon,
  StarIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

interface ThirdPartyStats {
  exchanges: {
    total: number;
    active: number;
    completed: number;
    myRole: string;
  };
  performance: {
    successRate: number;
    completedExchanges: number;
    averageDays: number;
  };
}

const ThirdPartyDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'messages' | 'reports'>('overview');
  const [stats, setStats] = useState<ThirdPartyStats>({
    exchanges: { total: 0, active: 0, completed: 0, myRole: 'Third Party' },
    performance: { successRate: 0, completedExchanges: 0, averageDays: 0 }
  });

  useEffect(() => {
    if (user) {
      loadThirdPartyData();
    }
  }, [user]);

  const loadThirdPartyData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Use role-based API service for automatic filtering
      const dashboardData = await roleBasedApiService.getDashboardData({
        id: user.id,
        email: user.email,
        role: user.role as any,
        company: user.company || ''
      });
      
      const myExchanges = dashboardData.exchanges || [];
      
      setExchanges(myExchanges);
      
      // Determine user's role
      let userRole = 'Third Party';
      if (myExchanges.length > 0 && myExchanges[0].exchangeParticipants) {
        const myParticipant = myExchanges[0].exchangeParticipants.find((p: any) => 
          p.user?.id === user.id || p.contact?.email === user.email
        );
        if (myParticipant?.role) {
          userRole = myParticipant.role;
        }
      }
      
      setStats({
        exchanges: {
          total: myExchanges.length,
          active: myExchanges.filter((ex: any) => ['45D', '180D', 'PENDING'].includes(ex.status)).length,
          completed: myExchanges.filter((ex: any) => ex.status === 'COMPLETED').length,
          myRole: userRole
        },
        performance: {
          successRate: myExchanges.length > 0 ? Math.round((myExchanges.filter((ex: any) => ex.status === 'COMPLETED').length / myExchanges.length) * 100) : 0,
          completedExchanges: myExchanges.filter((ex: any) => ex.status === 'COMPLETED').length,
          averageDays: 138 // Mock data
        }
      });
      
    } catch (err) {
      console.error('Failed to load third party data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-100">
        <div className="flex items-center justify-center w-full">
          <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Read-only Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <EyeIcon className="w-5 h-5 text-blue-600 mr-2" />
          <p className="text-blue-800">
            <strong>Read-Only Access:</strong> You can view exchange information and documents, but cannot make changes or upload files.
          </p>
        </div>
      </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Exchanges Involved</p>
                        <p className="text-3xl font-bold text-blue-600">{stats.exchanges.total}</p>
                        <p className="text-xs text-gray-500 mt-1">{stats.exchanges.active} currently active</p>
                      </div>
                      <DocumentTextIcon className="w-12 h-12 text-blue-200" />
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Success Rate</p>
                        <p className="text-3xl font-bold text-green-600">{stats.performance.successRate}%</p>
                        <p className="text-xs text-gray-500 mt-1">{stats.performance.completedExchanges} completed successfully</p>
                      </div>
                      <StarIcon className="w-12 h-12 text-green-200" />
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Avg Completion</p>
                        <p className="text-3xl font-bold text-blue-600">{stats.performance.averageDays}</p>
                        <p className="text-xs text-gray-500 mt-1">days average</p>
                      </div>
                      <CheckCircleIcon className="w-12 h-12 text-blue-200" />
                    </div>
                  </div>
                </div>

                {/* Performance Summary */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">My Performance Summary</h2>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
                    <div>
                      <p className="text-2xl font-bold text-blue-600">{stats.performance.completedExchanges}</p>
                      <p className="text-sm text-gray-600">Successfully completed</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{stats.exchanges.active}</p>
                      <p className="text-sm text-gray-600">Currently active</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-600">{stats.performance.averageDays}</p>
                      <p className="text-sm text-gray-600">Average days</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center space-x-1">
                        <StarIcon className="w-5 h-5 text-yellow-400 fill-current" />
                        <StarIcon className="w-5 h-5 text-yellow-400 fill-current" />
                        <StarIcon className="w-5 h-5 text-yellow-400 fill-current" />
                        <StarIcon className="w-5 h-5 text-yellow-400 fill-current" />
                        <StarIcon className="w-5 h-5 text-yellow-400 fill-current" />
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Client satisfaction</p>
                    </div>
                  </div>
                </div>

                {/* Exchange Participation */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Exchanges I'm Involved In</h2>
                  {exchanges.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {exchanges.map(exchange => (
                        <div key={exchange.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-medium text-gray-900">{exchange.name || exchange.exchangeName}</h3>
                              <p className="text-sm text-gray-600 mt-1">
                                Role: <span className="font-medium text-blue-600">{stats.exchanges.myRole}</span>
                              </p>
                              <div className="mt-2">
                                <p className="text-xs text-gray-500">My responsibilities:</p>
                                <ul className="text-xs text-gray-600 mt-1 space-y-1">
                                  <li>• Monitor exchange progress</li>
                                  <li>• Provide required services</li>
                                  <li>• Ensure compliance requirements</li>
                                </ul>
                              </div>
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              exchange.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                              exchange.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {exchange.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <ShieldCheckIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No exchange participation found</p>
                      <p className="text-sm mt-2">You'll see exchanges here when you're added as a participant</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Messages Tab */}
            {activeTab === 'messages' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Messages</h2>
                <p className="text-gray-600">Message interface will be implemented here.</p>
              </div>
            )}

            {/* Reports Tab */}
            {activeTab === 'reports' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Reports</h2>
                <p className="text-gray-600">Reports interface will be implemented here.</p>
              </div>
            )}
    </div>
  );
};

export default ThirdPartyDashboard;