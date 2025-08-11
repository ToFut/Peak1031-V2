import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { SocketProvider } from './hooks/useSocket';
import Layout from './components/Layout';
import ConnectionStatus from './components/ConnectionStatus';
import DebugPanel from './components/DebugPanel';
import { ErrorBoundary, RouteErrorBoundary } from './components/ErrorBoundary';

// Feature imports
import Messages from './features/messages/pages/Messages';
import Exchanges from './features/exchanges/pages/Exchanges';
import ExchangeDetailEnhanced from './features/exchanges/pages/ExchangeDetailEnhanced';
import Tasks from './features/tasks/pages/Tasks';
import Contacts from './features/contacts/pages/Contacts';
import Documents from './features/documents/pages/Documents';
import Users from './features/users/pages/Users';
import Reports from './features/reports/pages/Reports';
import Settings from './features/settings/pages/Settings';
import Profile from './features/settings/pages/Profile';
import UserProfile from './features/users/pages/UserProfile';
import Preferences from './features/settings/pages/Preferences';
import AuthTest from './features/auth/pages/AuthTest';
import TemplateManager from './features/documents/components/TemplateManager';
import TemplateDocumentManager from './pages/TemplateDocumentManager';
import { AdminGPT, PracticePantherManager } from './features/admin/components';
import AuditLogSystem from './features/admin/components/AuditLogSystem';
import { AgencyManagement } from './features/agency/components';

// Lazy load heavy components for better performance
const Login = lazy(() => import('./features/auth/pages/Login'));
const AdminDashboard = lazy(() => import('./features/dashboard/components/StandardizedAdminDashboard'));
const ClientDashboard = lazy(() => import('./features/dashboard/components/StandardizedClientDashboard'));
const CoordinatorDashboard = lazy(() => import('./features/dashboard/components/StandardizedCoordinatorDashboard'));
const ThirdPartyDashboard = lazy(() => import('./features/dashboard/components/StandardizedThirdPartyDashboard'));
const AgencyDashboard = lazy(() => import('./features/dashboard/components/StandardizedAgencyDashboard'));
const InvitationSignup = lazy(() => import('./pages/InvitationSignup'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

// Loading fallback for lazy components
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingFallback />;
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

// Debug Panel wrapper that checks authentication
const AuthenticatedDebugPanel: React.FC = () => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <DebugPanel /> : null;
};

const App: React.FC = () => {
  return (
    <ErrorBoundary onError={(error, errorInfo) => {
      console.error('Global app error:', error, errorInfo);
      // In production, send to error monitoring service
    }}>
      <AuthProvider>
        <SocketProvider>
          <Router>
            <div className="App">
              <ConnectionStatus />
              {process.env.NODE_ENV === 'development' && <AuthenticatedDebugPanel />}
              <Suspense fallback={<LoadingFallback />}>
              <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/invite/:token" element={<InvitationSignup />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              
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
                    <Layout>
                      <RouteErrorBoundary routeName="Dashboard">
                        <DashboardRoute />
                      </RouteErrorBoundary>
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
                      <RouteErrorBoundary routeName="Messages">
                        <Messages />
                      </RouteErrorBoundary>
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
                      <RouteErrorBoundary routeName="Exchanges">
                        <Exchanges />
                      </RouteErrorBoundary>
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/exchanges/:id" 
                element={
                  <ProtectedRoute>
                    <RouteErrorBoundary routeName="ExchangeDetails">
                      <ExchangeDetailEnhanced />
                    </RouteErrorBoundary>
                  </ProtectedRoute>
                } 
              />

              {/* Tasks - Available to core users */}
              <Route 
                path="/tasks" 
                element={
                  <ProtectedRoute allowedRoles={['admin', 'coordinator', 'client']}>
                    <Layout>
                      <RouteErrorBoundary routeName="Tasks">
                        <Tasks />
                      </RouteErrorBoundary>
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
                      <RouteErrorBoundary routeName="Contacts">
                        <Contacts />
                      </RouteErrorBoundary>
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
                      <RouteErrorBoundary routeName="Documents">
                        <Documents />
                      </RouteErrorBoundary>
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
                      <RouteErrorBoundary routeName="Users">
                        <Users />
                      </RouteErrorBoundary>
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
                      <RouteErrorBoundary routeName="TemplateDocumentManager">
                        <TemplateDocumentManager />
                      </RouteErrorBoundary>
                    </Layout>
                  </ProtectedRoute>
                } 
              />

              {/* Admin-specific routes */}
              <Route 
                path="/admin/templates" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Layout>
                      <RouteErrorBoundary routeName="TemplateManager">
                        <TemplateManager />
                      </RouteErrorBoundary>
                    </Layout>
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/admin/audit" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Layout>
                      <RouteErrorBoundary routeName="AuditLogSystem">
                        <AuditLogSystem />
                      </RouteErrorBoundary>
                    </Layout>
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/admin/gpt" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Layout>
                      <RouteErrorBoundary routeName="AdminGPT">
                        <AdminGPT />
                      </RouteErrorBoundary>
                    </Layout>
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/admin/ai-gpt" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Layout>
                      <RouteErrorBoundary routeName="AdminGPT">
                        <AdminGPT />
                      </RouteErrorBoundary>
                    </Layout>
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/admin/practice-panther" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Layout>
                      <RouteErrorBoundary routeName="PracticePantherManager">
                        <PracticePantherManager />
                      </RouteErrorBoundary>
                    </Layout>
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/admin/agencies" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <Layout>
                      <RouteErrorBoundary routeName="AgencyManagement">
                        <AgencyManagement />
                      </RouteErrorBoundary>
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

              {/* Profile - Available to all authenticated users */}
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } 
              />

              {/* User Profile with Analytics - Available to all authenticated users */}
              <Route 
                path="/user-profile" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <RouteErrorBoundary routeName="UserProfile">
                        <UserProfile />
                      </RouteErrorBoundary>
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              
              {/* Specific User Profile - Admin only */}
              <Route 
                path="/users/user-profile/:userId" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <RouteErrorBoundary routeName="UserProfile">
                        <UserProfile />
                      </RouteErrorBoundary>
                    </Layout>
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
            </Suspense>
          </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
