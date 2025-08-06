import React, { useState, useEffect } from 'react';
import { smartApi } from '../../services/smartApi';
import { apiService } from '@/shared/services/api';

const DebugPanel: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const runTests = async () => {
    setLoading(true);
    const results: any = {};
    
    try {
      // Test 1: Check localStorage
      results.localStorage = {
        token: localStorage.getItem('token') ? '✅ Present' : '❌ Missing',
        refreshToken: localStorage.getItem('refreshToken') ? '✅ Present' : '❌ Missing',
      };
      
      // Test 2: Direct API call
      try {
        console.log('🔍 Testing direct API call...');
        const directContacts = await apiService.getContacts();
        results.directApi = {
          status: '✅ Working',
          contactsCount: directContacts.length || 0,
          firstContact: directContacts[0] || null
        };
      } catch (error: any) {
        results.directApi = {
          status: '❌ Failed',
          error: error.message
        };
      }
      
      // Test 3: Smart API call
      try {
        console.log('🔍 Testing smart API call...');
        const smartContacts = await smartApi.getContacts();
        results.smartApi = {
          status: '✅ Working',
          contactsCount: smartContacts.contacts?.length || 0,
          firstContact: smartContacts.contacts?.[0] || null,
          usingFallback: smartContacts.contacts?.[0]?._isFallback || false
        };
      } catch (error: any) {
        results.smartApi = {
          status: '❌ Failed',
          error: error.message
        };
      }
      
      // Test 4: Backend health check
      try {
        const response = await fetch('http://localhost:5001/api/health');
        results.backend = {
          status: response.ok ? '✅ Online' : '❌ Offline',
          statusCode: response.status
        };
      } catch (error) {
        results.backend = {
          status: '❌ Cannot connect',
          error: 'Backend server not reachable'
        };
      }
      
    } catch (error: any) {
      results.error = error.message;
    }
    
    setDebugInfo(results);
    setLoading(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  // Collapsed state - just the button
  if (!isExpanded) {
    return (
      <div style={{
        position: 'fixed',
        bottom: 20,
        left: 20,
        zIndex: 9999,
      }}>
        <button
          onClick={() => setIsExpanded(true)}
          style={{
            width: 50,
            height: 50,
            borderRadius: '50%',
            border: '2px solid #333',
            background: '#fff',
            cursor: 'pointer',
            fontSize: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
          }}
          title="Debug Panel"
        >
          🐛
        </button>
      </div>
    );
  }

  // Expanded state - full debug panel
  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      left: 20,
      background: 'white',
      border: '2px solid #333',
      borderRadius: 8,
      padding: 20,
      maxWidth: 400,
      maxHeight: 600,
      overflow: 'auto',
      zIndex: 9999,
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 10 
      }}>
        <h3 style={{ margin: 0 }}>🐛 Debug Panel</h3>
        <button
          onClick={() => setIsExpanded(false)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '2px 6px',
            borderRadius: '4px',
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f0f0f0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Close"
        >
          ✕
        </button>
      </div>
      
      <button 
        onClick={runTests}
        disabled={loading}
        style={{
          padding: '5px 10px',
          marginBottom: 10,
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Testing...' : 'Run Tests'}
      </button>
      
      <div style={{ fontSize: 14 }}>
        <div style={{ marginBottom: 10 }}>
          <strong>Auth Status:</strong>
          <div style={{ marginLeft: 10 }}>
            Token: {debugInfo.localStorage?.token}<br/>
            Refresh: {debugInfo.localStorage?.refreshToken}
          </div>
        </div>
        
        <div style={{ marginBottom: 10 }}>
          <strong>Backend:</strong>
          <div style={{ marginLeft: 10 }}>
            {debugInfo.backend?.status} {debugInfo.backend?.error && `- ${debugInfo.backend.error}`}
          </div>
        </div>
        
        <div style={{ marginBottom: 10 }}>
          <strong>Direct API:</strong>
          <div style={{ marginLeft: 10 }}>
            Status: {debugInfo.directApi?.status}<br/>
            {debugInfo.directApi?.contactsCount !== undefined && 
              `Contacts: ${debugInfo.directApi.contactsCount}`}<br/>
            {debugInfo.directApi?.error && 
              <span style={{ color: 'red' }}>Error: {debugInfo.directApi.error}</span>}
          </div>
        </div>
        
        <div style={{ marginBottom: 10 }}>
          <strong>Smart API:</strong>
          <div style={{ marginLeft: 10 }}>
            Status: {debugInfo.smartApi?.status}<br/>
            {debugInfo.smartApi?.contactsCount !== undefined && 
              `Contacts: ${debugInfo.smartApi.contactsCount}`}<br/>
            {debugInfo.smartApi?.usingFallback && 
              <span style={{ color: 'orange' }}>⚠️ Using fallback data</span>}<br/>
            {debugInfo.smartApi?.error && 
              <span style={{ color: 'red' }}>Error: {debugInfo.smartApi.error}</span>}
          </div>
        </div>
        
        {debugInfo.directApi?.firstContact && (
          <div style={{ marginBottom: 10 }}>
            <strong>Sample Contact:</strong>
            <pre style={{ 
              fontSize: 11, 
              background: '#f0f0f0', 
              padding: 5,
              overflow: 'auto'
            }}>
              {JSON.stringify(debugInfo.directApi.firstContact, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugPanel;