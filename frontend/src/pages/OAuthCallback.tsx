import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { practicePartnerOAuth } from '../services/practicePartnerOAuth';

const OAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing OAuth callback...');
  const [errorDetails, setErrorDetails] = useState<string>('');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        console.log('🔄 Processing PracticePanther OAuth callback...');
        
        // Get parameters from URL
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Check for OAuth errors first
        if (error) {
          console.error('❌ OAuth error received:', error, errorDescription);
          setStatus('error');
          setMessage(`OAuth Error: ${error}`);
          setErrorDetails(errorDescription || 'Unknown OAuth error occurred');
          return;
        }

        // Validate required parameters
        if (!code) {
          console.error('❌ No authorization code received');
          setStatus('error');
          setMessage('Missing authorization code');
          setErrorDetails('The authorization code was not provided by PracticePanther. This may indicate an issue with the OAuth flow.');
          return;
        }

        if (!state) {
          console.error('❌ No state parameter received');
          setStatus('error');
          setMessage('Missing state parameter');
          setErrorDetails('The state parameter was not provided. This is required for security.');
          return;
        }

        console.log('✅ Authorization code received:', code.substring(0, 10) + '...');
        console.log('✅ State parameter received:', state.substring(0, 10) + '...');

        // Update status
        setMessage('Exchanging authorization code for access tokens...');

        // OAuth Step 2 - Exchange code for tokens
        console.log('🔄 Starting token exchange (OAuth Step 2)...');
        
        const tokenData = await practicePartnerOAuth.exchangeCodeForToken(code, state);
        
        console.log('✅ OAuth flow completed successfully!');
        console.log('🔑 Access token obtained and stored securely');
        console.log('⏰ Token expires in:', tokenData.expires_in, 'seconds');

        // Success!
        setStatus('success');
        setMessage('Successfully connected to PracticePanther!');

        // Redirect to admin dashboard after a short delay
        setTimeout(() => {
          navigate('/admin', { 
            state: { 
              message: 'PracticePanther integration connected successfully!',
              type: 'success'
            }
          });
        }, 2000);

      } catch (error: any) {
        console.error('❌ OAuth callback error:', error);
        setStatus('error');
        setMessage('Failed to complete OAuth flow');
        
        // Provide detailed error information
        if (error.message.includes('Invalid state parameter')) {
          setErrorDetails('Security validation failed. This may be due to a CSRF attack or session timeout. Please try connecting again.');
        } else if (error.message.includes('Token exchange failed')) {
          setErrorDetails('Failed to exchange authorization code for access tokens. This may indicate an issue with your OAuth configuration or PracticePanther\'s servers.');
        } else if (error.message.includes('Failed to store OAuth tokens')) {
          setErrorDetails('Successfully obtained tokens but failed to store them securely. Please check your database connection.');
        } else {
          setErrorDetails(error.message || 'An unexpected error occurred during the OAuth process.');
        }
      }
    };

    handleOAuthCallback();
  }, [searchParams, navigate]);

  const handleRetry = () => {
    setStatus('processing');
    setMessage('Retrying OAuth connection...');
    setErrorDetails('');
    
    // Redirect back to admin dashboard to restart OAuth flow
    navigate('/admin');
  };

  const handleGoBack = () => {
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {/* Status Icon */}
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4">
              {status === 'processing' && (
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              )}
              {status === 'success' && (
                <div className="bg-green-100 rounded-full p-2">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
              )}
              {status === 'error' && (
                <div className="bg-red-100 rounded-full p-2">
                  <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </div>
              )}
            </div>

            {/* Title */}
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              {status === 'processing' && 'Processing OAuth...'}
              {status === 'success' && 'Connection Successful!'}
              {status === 'error' && 'Connection Failed'}
            </h2>

            {/* Message */}
            <p className="text-sm text-gray-600 mb-4">
              {message}
            </p>

            {/* Error Details */}
            {status === 'error' && errorDetails && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                <p className="text-xs text-red-700 text-left">
                  <strong>Details:</strong> {errorDetails}
                </p>
              </div>
            )}

            {/* Success Details */}
            {status === 'success' && (
              <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
                <p className="text-xs text-green-700 text-left">
                  Your PracticePanther account has been successfully connected. You can now sync data between the systems.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col space-y-2">
              {status === 'error' && (
                <>
                  <button
                    onClick={handleRetry}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={handleGoBack}
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Go Back to Dashboard
                  </button>
                </>
              )}
              
              {status === 'success' && (
                <p className="text-xs text-gray-500">
                  Redirecting to dashboard...
                </p>
              )}
            </div>

            {/* Debug Information (only in development) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <details className="text-left">
                  <summary className="text-xs text-gray-500 cursor-pointer">Debug Information</summary>
                  <div className="mt-2 text-xs text-gray-600 space-y-1">
                    <p><strong>Code:</strong> {searchParams.get('code')?.substring(0, 20)}...</p>
                    <p><strong>State:</strong> {searchParams.get('state')?.substring(0, 20)}...</p>
                    <p><strong>Error:</strong> {searchParams.get('error') || 'None'}</p>
                    <p><strong>Error Description:</strong> {searchParams.get('error_description') || 'None'}</p>
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OAuthCallback; 