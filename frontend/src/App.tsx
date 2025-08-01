import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { SocketProvider } from './hooks/useSocket';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import ClientDashboard from './pages/ClientDashboard';
import CoordinatorDashboard from './pages/CoordinatorDashboard';
import ThirdPartyDashboard from './pages/ThirdPartyDashboard';
import AgencyDashboard from './pages/AgencyDashboard';
import Messages from './pages/Messages';
import Exchanges from './pages/Exchanges';
import ExchangeDetailsPage from './pages/ExchangeDetailsPage';
import Tasks from './pages/Tasks';
import Contacts from './pages/Contacts';
import Documents from './pages/Documents';
import Users from './pages/Users';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

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

// Dashboard Route Component
const DashboardRoute: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Route to appropriate dashboard based on user role
  switch (user.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'coordinator':
      return <CoordinatorDashboard />;
    case 'client':
      return <ClientDashboard />;
    case 'third_party':
      return <ThirdPartyDashboard />;
    case 'agency':
      return <AgencyDashboard />;
    default:
      return <Navigate to="/login" replace />;
  }
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              
              {/* Protected Routes */}
              <Route 
                path="/" 
                element={
                  <ProtectedRoute>
                    <Navigate to="/dashboard" replace />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <DashboardRoute />
                  </ProtectedRoute>
                } 
              />

              {/* Messages - Available to most users */}
              <Route 
                path="/messages" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'coordinator', 'client', 'agency', 'third_party']}>
                    <Messages />
                  </ProtectedRoute>
                } 
              />

              {/* Exchanges - Available to all authenticated users */}
              <Route 
                path="/exchanges" 
                element={
                  <ProtectedRoute>
                    <Exchanges />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/exchanges/:id" 
                element={
                  <ProtectedRoute>
                    <ExchangeDetailsPage />
                  </ProtectedRoute>
                } 
              />

              {/* Tasks - Available to core users */}
              <Route 
                path="/tasks" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'coordinator', 'client']}>
                    <Tasks />
                  </ProtectedRoute>
                } 
              />

              {/* Contacts - Available to all authenticated users */}
              <Route 
                path="/contacts" 
                element={
                  <ProtectedRoute>
                    <Contacts />
                  </ProtectedRoute>
                } 
              />

              {/* Documents - Available to all authenticated users */}
              <Route 
                path="/documents" 
                element={
                  <ProtectedRoute>
                    <Documents />
                  </ProtectedRoute>
                } 
              />

              {/* Users - Admin only */}
              <Route 
                path="/admin/users" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Users />
                  </ProtectedRoute>
                } 
              />

              {/* Admin-specific routes */}
              <Route 
                path="/admin/templates" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Layout>
                      <div className="p-8">
                        <h1 className="text-2xl font-bold mb-4">Document Templates</h1>
                        <p className="text-gray-600">Document template management coming soon...</p>
                      </div>
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
                    <Layout>
                      <div className="p-8">
                        <h1 className="text-2xl font-bold mb-4">System Settings</h1>
                        <p className="text-gray-600">System settings management coming soon...</p>
                      </div>
                    </Layout>
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
