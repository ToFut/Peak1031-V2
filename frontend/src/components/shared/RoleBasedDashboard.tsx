import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useRolePermissions } from '../../hooks/useRolePermissions';
import { useRoleBasedData } from '../../hooks/useRoleBasedData';
import { apiService } from '../../services/api';
import {
  ArrowPathIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface RoleBasedDashboardProps {
  children?: React.ReactNode;
}

export interface DashboardData {
  exchanges: any[];
  tasks: any[];
  contacts: any[];
  documents: any[];
  messages: any[];
  loading: boolean;
  error: string | null;
}

export const RoleBasedDashboard: React.FC<RoleBasedDashboardProps> = ({ children }) => {
  const { user } = useAuth();
  const { getDashboardWidgets, getPageTitle } = useRolePermissions();
  const { filterExchanges, filterTasks, filterContacts, filterDocuments, filterMessages } = useRoleBasedData();

  const [data, setData] = useState<DashboardData>({
    exchanges: [],
    tasks: [],
    contacts: [],
    documents: [],
    messages: [],
    loading: true,
    error: null
  });

  const [activeTab, setActiveTab] = useState<string>('overview');

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;
    
    setData(prev => ({ ...prev, loading: true, error: null }));

    try {
      const [exchangesRes, tasksRes, contactsRes] = await Promise.all([
        apiService.getExchanges().catch(err => { console.error('Exchanges error:', err); return []; }),
        apiService.getTasks().catch(err => { console.error('Tasks error:', err); return []; }),
        apiService.getContacts().catch(err => { console.error('Contacts error:', err); return []; })
      ]);

      // Handle different response formats from apiService
      const allExchanges = Array.isArray(exchangesRes) ? exchangesRes : [];
      const allTasks = Array.isArray(tasksRes) ? tasksRes : [];
      const allContacts = Array.isArray(contactsRes) ? contactsRes : [];

      setData({
        exchanges: filterExchanges(allExchanges),
        tasks: filterTasks(allTasks),
        contacts: filterContacts(allContacts),
        documents: [], // TODO: Add documents API
        messages: [], // TODO: Add messages API
        loading: false,
        error: null
      });

    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setData(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load dashboard data'
      }));
    }
  };

  if (data.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {data.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-800">{data.error}</p>
          </div>
        </div>
      )}

      {React.Children.map(children, child => 
        React.isValidElement(child) 
          ? React.cloneElement(child, { 
              dashboardData: data, 
              activeTab, 
              setActiveTab,
              onRefresh: loadDashboardData
            } as any)
          : child
      )}
    </div>
  );
};