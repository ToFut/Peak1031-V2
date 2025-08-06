import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

const AuthTest: React.FC = () => {
  const { user, login, logout, isAuthenticated, loading } = useAuth();
  const [loginForm, setLoginForm] = useState({ email: 'admin@peak1031.com', password: 'admin123' });
  const [loginLoading, setLoginLoading] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<any>(null);

  useEffect(() => {
    // Check current token
    const checkToken = () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setTokenInfo({
            userId: payload.userId,
            email: payload.email,
            role: payload.role,
            exp: new Date(payload.exp * 1000).toLocaleString(),
            isExpired: payload.exp < Date.now() / 1000
          });
        } catch (error) {
          setTokenInfo({ error: 'Invalid token format' });
        }
      } else {
        setTokenInfo(null);
      }
    };

    checkToken();
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      await login(loginForm.email, loginForm.password);
    } catch (error: any) {
      alert(`Login failed: ${error.message}`);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const clearTokens = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    window.location.reload();
  };

  if (loading) {
    return <div className="p-8">Loading authentication...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Authentication Test</h1>
      
      <div className="space-y-6">
        {/* Authentication Status */}
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Authentication Status</h2>
          <p>Status: <span className={isAuthenticated ? 'text-green-600' : 'text-red-600'}>
            {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
          </span></p>
          {user && (
            <div className="mt-2">
              <p>User: {user.first_name} {user.last_name} ({user.email})</p>
              <p>Role: {user.role}</p>
              <p>ID: {user.id}</p>
            </div>
          )}
        </div>

        {/* Token Information */}
        {tokenInfo && (
          <div className="bg-blue-50 p-4 rounded">
            <h2 className="font-semibold mb-2">Token Information</h2>
            {tokenInfo.error ? (
              <p className="text-red-600">{tokenInfo.error}</p>
            ) : (
              <div className="text-sm">
                <p>User ID: {tokenInfo.userId}</p>
                <p>Email: {tokenInfo.email}</p>
                <p>Role: {tokenInfo.role}</p>
                <p>Expires: {tokenInfo.exp}</p>
                <p>Expired: <span className={tokenInfo.isExpired ? 'text-red-600' : 'text-green-600'}>
                  {tokenInfo.isExpired ? 'Yes' : 'No'}
                </span></p>
              </div>
            )}
          </div>
        )}

        {/* Login/Logout Actions */}
        {!isAuthenticated ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <h2 className="font-semibold">Login</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loginLoading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loginLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : (
          <div className="space-y-2">
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        )}

        {/* Utility Actions */}
        <div className="space-y-2">
          <h2 className="font-semibold">Utilities</h2>
          <button
            onClick={clearTokens}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Clear All Tokens & Reload
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthTest;