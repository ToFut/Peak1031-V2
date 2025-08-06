import React from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { DashboardProvider } from '@/shared/components/Dashboard/DashboardProvider';
import {
  AdminDashboard,
  ClientDashboard,
  CoordinatorDashboard,
  AgencyDashboard,
  ThirdPartyDashboard,
} from '@/shared/components/Dashboard/RoleDashboards';

const DashboardPage: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Authentication Required</h1>
          <p className="mt-2 text-gray-600">Please log in to access the dashboard.</p>
        </div>
      </div>
    );
  }

  const renderDashboard = () => {
    switch (user.role) {
      case 'admin':
        return <AdminDashboard />;
      case 'client':
        return <ClientDashboard />;
      case 'coordinator':
        return <CoordinatorDashboard />;
      case 'agency':
        return <AgencyDashboard />;
      case 'third_party':
        return <ThirdPartyDashboard />;
      default:
        return <ClientDashboard />; // Default fallback
    }
  };

  const getRoleDisplayName = (role?: string): string => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'client': return 'Client';
      case 'coordinator': return 'Coordinator';
      case 'agency': return 'Agency';
      case 'third_party': return 'Third Party';
      default: return 'User';
    }
  };

  return (
    <DashboardProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {getRoleDisplayName(user.role)} Dashboard
                </h1>
                <p className="mt-2 text-gray-600">
                  Welcome back, {user.firstName || user.first_name || user.email}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                  {user.role}
                </span>
              </div>
            </div>
          </div>

          {/* Role-based dashboard content */}
          {renderDashboard()}
        </div>
      </div>
    </DashboardProvider>
  );
};

export default DashboardPage;