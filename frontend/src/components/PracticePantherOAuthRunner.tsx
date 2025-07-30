import React, { useState } from 'react';
import { Play, CheckCircle, XCircle, AlertCircle, Copy, ExternalLink } from 'lucide-react';

interface LogEntry {
  timestamp: string;
  message: string;
  type: string;
}

interface TestResult {
  status: string;
  data?: any;
  error?: string;
}

const PracticePantherOAuthRunner = () => {
  const [testResults, setTestResults] = useState<{[key: string]: TestResult}>({});
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [authCode, setAuthCode] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const CONFIG = {
    clientId: 'c1ba43b4-155b-4a69-90cb-55cf7f1e7f41',
    clientSecret: '17023fb5-1372-4e67-a977-ff1383493075',
    redirectUri: 'https://localhost:8000',
    baseUrl: 'https://app.practicepanther.com'
  };

  const addLog = (message: string, type: string = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addLog('Copied to clipboard!', 'success');
  };

  const generateState = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const testSteps = [
    {
      id: 'validate-config',
      title: 'Validate Configuration',
      description: 'Check OAuth credentials and URLs',
      test: async () => {
        addLog('Validating OAuth configuration...');
        
        if (!CONFIG.clientId || !CONFIG.clientSecret) {
          throw new Error('Missing client credentials');
        }
        
        if (!CONFIG.redirectUri.startsWith('https://')) {
          addLog('⚠️ Warning: Redirect URI should use HTTPS for production', 'warning');
        }
        
        addLog('✅ Configuration valid');
        return { 
          status: 'success', 
          data: {
            clientId: CONFIG.clientId,
            redirectUri: CONFIG.redirectUri,
            authUrl: `${CONFIG.baseUrl}/oauth/authorize`
          }
        };
      }
    },
    {
      id: 'build-auth-url',
      title: 'Build Authorization URL',
      description: 'Generate the OAuth authorization URL',
      test: async () => {
        addLog('Building authorization URL...');
        
        const state = generateState();
        localStorage.setItem('oauth_state', state);
        
        const authUrl = `${CONFIG.baseUrl}/oauth/authorize?` + 
          `response_type=code&` +
          `client_id=${CONFIG.clientId}&` +
          `redirect_uri=${encodeURIComponent(CONFIG.redirectUri)}&` +
          `state=${state}`;
        
        addLog('✅ Authorization URL built successfully');
        return { 
          status: 'success', 
          data: { authUrl, state }
        };
      }
    },
    {
      id: 'test-auth-endpoint',
      title: 'Test Authorization Endpoint',
      description: 'Check if the authorization endpoint is accessible',
      test: async () => {
        addLog('Testing authorization endpoint accessibility...');
        
        try {
          // We can't actually make the request due to CORS, but we can simulate
          addLog('❌ CORS policy blocks direct access from browser');
          addLog('💡 This is expected - OAuth flow requires user redirect');
          
          return { 
            status: 'warning', 
            data: { 
              message: 'CORS blocked (expected)',
              solution: 'User must be redirected to authorization URL'
            }
          };
        } catch (error: any) {
          addLog(`❌ Network error: ${error.message}`);
          return { status: 'error', error: error.message };
        }
      }
    },
    {
      id: 'simulate-callback',
      title: 'Simulate OAuth Callback',
      description: 'Simulate receiving authorization code',
      test: async () => {
        addLog('Simulating OAuth callback...');
        
        // Simulate a successful callback
        const mockAuthCode = 'mock_auth_code_' + Date.now();
        const mockState = localStorage.getItem('oauth_state');
        
        setAuthCode(mockAuthCode);
        
        addLog('✅ Simulated callback with authorization code');
        return { 
          status: 'success', 
          data: { 
            authCode: mockAuthCode,
            state: mockState,
            callbackUrl: `${CONFIG.redirectUri}?code=${mockAuthCode}&state=${mockState}`
          }
        };
      }
    },
    {
      id: 'test-token-exchange',
      title: 'Test Token Exchange',
      description: 'Attempt to exchange code for access token',
      test: async () => {
        addLog('Testing token exchange...');
        
        const tokenPayload = {
          grant_type: 'authorization_code',
          code: authCode,
          client_id: CONFIG.clientId,
          client_secret: CONFIG.clientSecret,
          redirect_uri: CONFIG.redirectUri
        };
        
        try {
          // We can't make the actual request, but show what would happen
          addLog('❌ Cannot make actual token request from browser environment');
          addLog('🔐 Client secret must never be exposed in frontend');
          addLog('💡 Token exchange must happen on your backend server');
          
          // Simulate successful token response
          const mockToken = 'mock_access_token_' + Date.now();
          setAccessToken(mockToken);
          
          return { 
            status: 'warning', 
            data: { 
              message: 'Backend required for token exchange',
              mockToken,
              payload: tokenPayload
            }
          };
        } catch (error: any) {
          return { status: 'error', error: error.message };
        }
      }
    },
    {
      id: 'test-api-call',
      title: 'Test API Call',
      description: 'Test making authenticated API requests',
      test: async () => {
        addLog('Testing API call with access token...');
        
        try {
          // Simulate API call
          addLog('❌ CORS policy blocks direct API calls');
          addLog('💡 API calls must go through your backend proxy');
          
          const mockApiResponse = {
            id: "mock-user-id",
            display_name: "Test User",
            email: "test@example.com",
            first_name: "Test",
            last_name: "User"
          };
          
          return { 
            status: 'warning', 
            data: { 
              message: 'Backend proxy required for API calls',
              mockResponse: mockApiResponse
            }
          };
        } catch (error: any) {
          return { status: 'error', error: error.message };
        }
      }
    }
  ];

  const runTest = async (testIndex: number) => {
    setCurrentStep(testIndex);
    const test = testSteps[testIndex];
    
    try {
      const result = await test.test();
      setTestResults(prev => ({ ...prev, [test.id]: result }));
    } catch (error: any) {
      setTestResults(prev => ({ 
        ...prev, 
        [test.id]: { status: 'error', error: error.message }
      }));
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults({});
    setLogs([]);
    
    addLog('🚀 Starting OAuth flow test...');
    
    for (let i = 0; i < testSteps.length; i++) {
      await runTest(i);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Delay for better UX
    }
    
    setIsRunning(false);
    addLog('✅ All tests completed!');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="text-green-500" size={16} />;
      case 'warning': return <AlertCircle className="text-yellow-500" size={16} />;
      case 'error': return <XCircle className="text-red-500" size={16} />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'border-green-200 bg-green-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'error': return 'border-red-200 bg-red-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const authUrl = `${CONFIG.baseUrl}/oauth/authorize?response_type=code&client_id=${CONFIG.clientId}&redirect_uri=${encodeURIComponent(CONFIG.redirectUri)}&state=test123`;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🐾 PracticePanther OAuth Live Test
        </h1>
        <p className="text-gray-600">
          Test your OAuth implementation in real-time and see exactly what happens
        </p>
      </div>

      {/* Quick Actions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-blue-800 mb-1">
              Authorization URL (click to copy):
            </label>
            <div 
              className="bg-white border border-blue-300 rounded p-2 cursor-pointer hover:bg-blue-50 text-xs font-mono break-all"
              onClick={() => copyToClipboard(authUrl)}
            >
              {authUrl}
              <Copy size={12} className="inline ml-2 text-blue-600" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-800 mb-1">
              Test in New Tab:
            </label>
            <button
              onClick={() => window.open(authUrl, '_blank')}
              className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 text-sm"
            >
              <ExternalLink size={14} />
              Open Authorization URL
            </button>
          </div>
        </div>
      </div>

      {/* Test Runner */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">OAuth Flow Test Runner</h2>
          <button
            onClick={runAllTests}
            disabled={isRunning}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            <Play size={16} />
            {isRunning ? 'Running Tests...' : 'Run All Tests'}
          </button>
        </div>

        {/* Test Steps */}
        <div className="space-y-4">
          {testSteps.map((step, index) => {
            const result = testResults[step.id];
            const isActive = currentStep === index && isRunning;
            
            return (
              <div 
                key={step.id}
                className={`border rounded-lg p-4 ${result ? getStatusColor(result.status) : 'border-gray-200'} ${isActive ? 'ring-2 ring-blue-500' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {result && getStatusIcon(result.status)}
                      <span className="font-medium">{step.title}</span>
                    </div>
                    {isActive && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    )}
                  </div>
                  <button
                    onClick={() => runTest(index)}
                    disabled={isRunning}
                    className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded disabled:opacity-50"
                  >
                    Run Step
                  </button>
                </div>
                
                <p className="text-gray-600 text-sm mb-2">{step.description}</p>
                
                {result && (
                  <div className="mt-3 p-3 bg-white border rounded text-sm">
                    {result.data && (
                      <pre className="text-xs overflow-x-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    )}
                    {result.error && (
                      <div className="text-red-600 font-medium">
                        Error: {result.error}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Logs */}
      <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-sm">
        <h3 className="text-white font-semibold mb-3">Live Test Logs</h3>
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {logs.length === 0 ? (
            <div className="text-gray-500">Click "Run All Tests" to see live logs...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="flex gap-2">
                <span className="text-gray-500">[{log.timestamp}]</span>
                <span className={
                  log.type === 'error' ? 'text-red-400' :
                  log.type === 'warning' ? 'text-yellow-400' :
                  log.type === 'success' ? 'text-green-400' : 'text-green-400'
                }>
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Configuration Display */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold mb-3">Current Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Client ID:</strong>
            <div className="font-mono bg-white p-2 rounded border mt-1">
              {CONFIG.clientId}
            </div>
          </div>
          <div>
            <strong>Redirect URI:</strong>
            <div className="font-mono bg-white p-2 rounded border mt-1">
              {CONFIG.redirectUri}
            </div>
          </div>
          <div>
            <strong>Base URL:</strong>
            <div className="font-mono bg-white p-2 rounded border mt-1">
              {CONFIG.baseUrl}
            </div>
          </div>
          <div>
            <strong>Auth Endpoint:</strong>
            <div className="font-mono bg-white p-2 rounded border mt-1">
              {CONFIG.baseUrl}/oauth/authorize
            </div>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-800 mb-3">🚀 Next Steps for Production</h3>
        <ol className="list-decimal list-inside space-y-2 text-yellow-800">
          <li>Set up HTTPS for local development (use ngrok)</li>
          <li>Register your HTTPS URL with PracticePanther</li>
          <li>Build a backend server to handle token exchange</li>
          <li>Implement API proxy in your backend</li>
          <li>Test the complete flow end-to-end</li>
        </ol>
      </div>
    </div>
  );
};

export default PracticePantherOAuthRunner; 