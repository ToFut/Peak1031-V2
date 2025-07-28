import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { SocketProvider } from './hooks/useSocket';
import Layout from './components/Layout';
import AdminDashboard from './pages/AdminDashboard';
import ClientDashboard from './pages/ClientDashboard';
import CoordinatorDashboard from './pages/CoordinatorDashboard';
import ThirdPartyDashboard from './pages/ThirdPartyDashboard';
import AgencyDashboard from './pages/AgencyDashboard';
import Login from './pages/Login';
import './index.css';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ 
  children, 
  allowedRoles 
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};



// Unauthorized Page
const UnauthorizedPage: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
          <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
        <p className="mt-1 text-sm text-gray-500">
          You don't have permission to access this page.
        </p>
        <div className="mt-6">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  </div>
);

// Main App Component
const AppContent: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <SocketProvider>
                <Layout />
              </SocketProvider>
            </ProtectedRoute>
          }
        />
        
        {/* Role-specific Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <SocketProvider>
                <Layout />
              </SocketProvider>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/client"
          element={
            <ProtectedRoute allowedRoles={['client']}>
              <SocketProvider>
                <Layout />
              </SocketProvider>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/coordinator"
          element={
            <ProtectedRoute allowedRoles={['coordinator']}>
              <SocketProvider>
                <Layout />
              </SocketProvider>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/third-party"
          element={
            <ProtectedRoute allowedRoles={['third_party']}>
              <SocketProvider>
                <Layout />
              </SocketProvider>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/agency"
          element={
            <ProtectedRoute allowedRoles={['agency']}>
              <SocketProvider>
                <Layout />
              </SocketProvider>
            </ProtectedRoute>
          }
        />
        
        {/* Error Routes */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        
        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

// Root App Component with Providers
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App; 