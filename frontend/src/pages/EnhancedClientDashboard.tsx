import React from 'react';
import Layout from '../components/Layout';
import PPIntegratedDashboard from '../components/PPIntegratedDashboard';

const EnhancedClientDashboard: React.FC = () => {
  return (
    <Layout>
      <PPIntegratedDashboard role="client" />
    </Layout>
  );
};

export default EnhancedClientDashboard;