import React from 'react';
import Layout from '../components/Layout';
import UnifiedChatInterface from '../components/UnifiedChatInterface';
import { useAuth } from '../hooks/useAuth';

const Messages: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Required</h2>
            <p className="text-gray-600">Please log in to access messages.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-600">Communicate with your exchange team in real-time</p>
        </div>
        
        <div className="h-[calc(100vh-200px)]">
          <UnifiedChatInterface />
        </div>
      </div>
    </Layout>
  );
};

export default Messages;