import React from 'react';
import Layout from '../components/Layout';
import PPIntegratedDashboard from '../components/PPIntegratedDashboard';

const AgencyDashboard: React.FC = () => {
  return (
    <Layout>
      <PPIntegratedDashboard role="agency" />
    </Layout>
  );
};

export default AgencyDashboard;