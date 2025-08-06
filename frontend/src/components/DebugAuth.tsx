import React from 'react';
import { useAuth } from '../hooks/useAuth';

export const DebugAuth: React.FC = () => {
  const { user, isAuthenticated, loading, login } = useAuth();
  
  const handleQuickLogin = async () => {
    try {
      await login('admin@peak1031.com', 'admin123');
      console.log('✅ Quick login successful');
    } catch (error) {
      console.error('❌ Quick login failed:', error);
    }
  };
  
  return (
    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4 text-sm">
      <h3 className="font-bold mb-2">🔍 Auth Debug Info:</h3>
      <div className="space-y-1 mb-3">
        <div><strong>Loading:</strong> {loading ? 'true' : 'false'}</div>
        <div><strong>Is Authenticated:</strong> {isAuthenticated ? 'true' : 'false'}</div>
        <div><strong>User Role:</strong> {user?.role || 'none'}</div>
        <div><strong>User Email:</strong> {user?.email || 'none'}</div>
        <div><strong>Local Storage Token:</strong> {localStorage.getItem('token') ? 'Present' : 'Missing'}</div>
      </div>
      
      {!isAuthenticated && (
        <button 
          onClick={handleQuickLogin}
          className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600"
        >
          🔑 Quick Admin Login
        </button>
      )}
      
      {isAuthenticated && user?.role === 'admin' && (
        <div className="text-green-700 font-medium">✅ Logged in as Admin</div>
      )}
    </div>
  );
};