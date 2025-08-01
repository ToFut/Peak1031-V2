import React from 'react';
import Layout from '../components/Layout';
import PPIntegratedDashboard from '../components/PPIntegratedDashboard';

const EnhancedCoordinatorDashboard: React.FC = () => {
  return (
    <Layout>
      <PPIntegratedDashboard role="coordinator" />
    </Layout>
  );
};

export default EnhancedCoordinatorDashboard;