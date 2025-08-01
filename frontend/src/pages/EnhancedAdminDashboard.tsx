import React from 'react';
import Layout from '../components/Layout';
import PPIntegratedDashboard from '../components/PPIntegratedDashboard';

const EnhancedAdminDashboard: React.FC = () => {
  return (
    <Layout>
      <PPIntegratedDashboard role="admin" />
    </Layout>
  );
};

export default EnhancedAdminDashboard;