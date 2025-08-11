import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { CheckCircleIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, refreshToken: refreshAuthToken } = useAuth();
  
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing your invitation...');
  const [exchangeInfo, setExchangeInfo] = useState<any>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check if there's a session from Supabase auth
        const fragment = window.location.hash;
        const params = new URLSearchParams(fragment.replace('#', '?'));
        
        const accessToken = params.get('access_token');
        const refreshTokenValue = params.get('refresh_token');
        const exchangeId = searchParams.get('exchange');

        if (accessToken) {
          // Store tokens and refresh auth state
          localStorage.setItem('supabase.auth.token', accessToken);
          if (refreshTokenValue) {
            localStorage.setItem('supabase.auth.refresh_token', refreshTokenValue);
          }

          // Refresh auth state to get user info
          await refreshAuthToken();
          
          // Get exchange information if provided
          if (exchangeId) {
            try {
              const response = await fetch(`/api/exchanges/${exchangeId}`, {
                headers: {
                  'Authorization': `Bearer ${accessToken}`
                }
              });
              
              if (response.ok) {
                const exchange = await response.json();
                setExchangeInfo(exchange);
              }
            } catch (err) {
              console.error('Error fetching exchange:', err);
            }
          }

          setStatus('success');
          setMessage('Welcome! Your account has been set up successfully.');
          
          // Redirect after a short delay
          setTimeout(() => {
            if (exchangeId) {
              navigate(`/exchanges/${exchangeId}`);
            } else {
              navigate('/dashboard');
            }
          }, 2000);
          
        } else {
          throw new Error('No access token found in callback');
        }
        
      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setMessage('There was an issue setting up your account. Please try again or contact support.');
      }
    };

    handleAuthCallback();
  }, [searchParams, navigate, refreshAuthToken]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {status === 'processing' && (
              <div className="space-y-4">
                <ArrowPathIcon className="mx-auto h-12 w-12 text-blue-500 animate-spin" />
                <h2 className="text-xl font-medium text-gray-900">Setting up your account...</h2>
                <p className="text-gray-600">{message}</p>
              </div>
            )}

            {status === 'success' && (
              <div className="space-y-4">
                <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500" />
                <h2 className="text-xl font-medium text-gray-900">Welcome to Peak 1031!</h2>
                <p className="text-gray-600">{message}</p>
                
                {exchangeInfo && (
                  <div className="mt-6 bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-medium text-blue-900">You've been invited to:</h3>
                    <p className="text-blue-800">{exchangeInfo.name || exchangeInfo.exchange_number}</p>
                    {user?.role && (
                      <p className="text-sm text-blue-600 mt-1">
                        Role: {user.role}
                      </p>
                    )}
                  </div>
                )}
                
                <p className="text-sm text-gray-500">Redirecting you to the platform...</p>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
                <h2 className="text-xl font-medium text-gray-900">Setup Failed</h2>
                <p className="text-gray-600">{message}</p>
                
                <div className="space-y-2">
                  <button
                    onClick={() => navigate('/login')}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Go to Login
                  </button>
                  
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;