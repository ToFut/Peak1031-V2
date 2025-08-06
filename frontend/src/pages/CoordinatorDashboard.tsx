import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import PPIntegratedDashboard from '../components/PPIntegratedDashboard';
import { useRolePermissions } from '../hooks/useRolePermissions';
import { roleBasedApiService } from '../services/roleBasedApiService';
import { useAuth } from '../hooks/useAuth';
import {
  DocumentTextIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const CoordinatorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    managedExchanges: 0,
    activeExchanges: 0,
    assignedTasks: 0,
    totalClients: 0
  });

  useEffect(() => {
    loadStats();
  }, [user]);

  const loadStats = async () => {
    if (!user) return;
    
    try {
      // Use role-based API service for automatic filtering
      const dashboardData = await roleBasedApiService.getDashboardData({
        id: user.id,
        email: user.email,
        role: user.role,
        company: user.company
      });
      
      const exchanges = dashboardData.exchanges;
      const tasks = dashboardData.tasks;
      
      // All exchanges are already filtered for coordinator role
      const managedExchanges = exchanges;
      
      // Get unique clients
      const uniqueClients = new Set(managedExchanges.map((ex: any) => ex.clientId).filter(Boolean));
      
      // All tasks are already filtered for coordinator role
      const assignedTasks = tasks;
      
      setStats({
        managedExchanges: managedExchanges.length,
        activeExchanges: managedExchanges.filter((ex: any) => ['45D', '180D'].includes(ex.status)).length,
        assignedTasks: assignedTasks.filter((task: any) => task.status === 'pending').length,
        totalClients: uniqueClients.size
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const headerContent = (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2">
          <DocumentTextIcon className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{stats.managedExchanges}</span> managed exchanges
          </span>
        </div>
        <div className="h-4 w-px bg-gray-300" />
        <div className="flex items-center space-x-2">
          <UserGroupIcon className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-600">
            <span className="font-semibold text-blue-600">{stats.totalClients}</span> clients
          </span>
        </div>
        <div className="h-4 w-px bg-gray-300" />
        <div className="flex items-center space-x-2">
          <CheckCircleIcon className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-600">
            <span className="font-semibold text-orange-600">{stats.assignedTasks}</span> pending tasks
          </span>
        </div>
      </div>
      <div className="flex items-center space-x-3">
        <span className="text-sm text-gray-600">
          Exchange Coordinator
        </span>
      </div>
    </div>
  );

  return (
    <Layout headerContent={headerContent}>
      <PPIntegratedDashboard role="coordinator" />
    </Layout>
  );
};

export default CoordinatorDashboard;