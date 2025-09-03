import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/shared/hooks/useAuth';
import { SocketProvider } from '@/shared/hooks/useSocket';
import Layout from './shared/ui/organisms/Layout';
import ConnectionStatus from './shared/ui/molecules/ConnectionStatus';
import DebugPanel from './shared/ui/organisms/DebugPanel';

// Pages
import Login from './features/auth/pages/Login';
import DashboardPage from './features/dashboard/pages/DashboardPage';
import Messages from './features/messages/pages/Messages';
import Exchanges from './features/exchanges/pages/Exchanges';
import ExchangeDetailsPage from './features/exchanges/pages/ExchangeDetailsPage';
import Tasks from './features/tasks/pages/Tasks';
import Contacts from './features/contacts/pages/Contacts';
import Documents from './features/documents/pages/Documents';
import Users from './features/users/pages/Users';
import Reports from './features/reports/pages/Reports';
import Settings from './features/settings/pages/Settings';
import Profile from './features/settings/pages/Profile';
import Preferences from './features/settings/pages/Preferences';
import AuthTest from './features/auth/pages/AuthTest';
import TemplateManager from './features/documents/components/TemplateManager';
import TemplateDocumentManager from './features/documents/pages/TemplateDocumentManager';
import AgenciesPage from './features/admin/pages/AgenciesPage';
import DeepDivePage from './features/admin/pages/DeepDivePage';

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Dashboard Route Component - Now uses unified DashboardPage
const DashboardRoute: React.FC = () => {
  return <DashboardPage />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <div className="App">
            <ConnectionStatus />
            {process.env.NODE_ENV === 'development' && <DebugPanel />}
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              
              {/* Protected Routes with Centralized Layout */}
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Navigate to="/dashboard" replace />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <DashboardRoute />
                    </Layout>
                  </ProtectedRoute>
                } 
              />

              {/* Messages - Available to most users */}
              <Route 
                path="/messages" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'coordinator', 'client', 'agency', 'third_party']}>
                    <Layout>
                      <Messages />
                    </Layout>
                  </ProtectedRoute>
                } 
              />

              {/* Exchanges - Available to all authenticated users */}
              <Route 
                path="/exchanges" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Exchanges />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/exchanges/:id" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <ExchangeDetailsPage />
                    </Layout>
                  </ProtectedRoute>
                } 
              />

              {/* Tasks - Available to core users */}
              <Route 
                path="/tasks" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'coordinator', 'client']}>
                    <Layout>
                      <Tasks />
                    </Layout>
                  </ProtectedRoute>
                } 
              />

              {/* Contacts - Available to all authenticated users */}
              <Route 
                path="/contacts" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Contacts />
                    </Layout>
                  </ProtectedRoute>
                } 
              />

              {/* Documents - Available to all authenticated users */}
              <Route 
                path="/documents" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Documents />
                    </Layout>
                  </ProtectedRoute>
                } 
              />

              {/* Users - Admin only */}
              <Route 
                path="/admin/users" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Layout>
                      <Users />
                    </Layout>
                  </ProtectedRoute>
                } 
              />

              {/* Template Document Manager - Admin only */}
              <Route 
                path="/templates" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Layout>
                      <TemplateDocumentManager />
                    </Layout>
                  </ProtectedRoute>
                } 
              />

              {/* Admin-specific routes */}
              <Route 
                path="/admin/agencies" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Layout>
                      <AgenciesPage />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/admin/deepdive" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Layout>
                      <DeepDivePage />
                    </Layout>
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/admin/templates" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Layout>
                      <TemplateManager />
                    </Layout>
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/admin/audit" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Layout>
                      <div className="p-8">
                        <h1 className="text-2xl font-bold mb-4">Audit Logs</h1>
                        <p className="text-gray-600">Audit logs management coming soon...</p>
                      </div>
                    </Layout>
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/admin/system" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/admin/system/sync" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Layout>
                      <div className="p-8">
                        <h1 className="text-2xl font-bold mb-4">Sync Status</h1>
                        <p className="text-gray-600">Sync status management coming soon...</p>
                      </div>
                    </Layout>
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/admin/system/settings" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Layout>
                      <div className="p-8">
                        <h1 className="text-2xl font-bold mb-4">System Settings</h1>
                        <p className="text-gray-600">System settings management coming soon...</p>
                      </div>
                    </Layout>
                  </ProtectedRoute>
                } 
              />

              {/* Reports - Admin and Coordinator */}
              <Route 
                path="/reports" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'coordinator']}>
                    <Reports />
                  </ProtectedRoute>
                } 
              />

              {/* Settings - Available to all authenticated users */}
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } 
              />

              {/* Profile - Available to all authenticated users */}
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } 
              />

              {/* Preferences - Available to all authenticated users */}
              <Route 
                path="/preferences" 
                element={
                  <ProtectedRoute>
                    <Preferences />
                  </ProtectedRoute>
                } 
              />
              
              {/* Auth Test - Development only */}
              <Route 
                path="/auth-test" 
                element={<AuthTest />}
              />

              {/* Catch all - redirect to dashboard */}
              <Route 
                path="*" 
                element={
                  <ProtectedRoute>
                    <Navigate to="/dashboard" replace />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
};

export default App;
