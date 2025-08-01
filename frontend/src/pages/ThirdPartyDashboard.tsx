import React from 'react';
import Layout from '../components/Layout';
import PPIntegratedDashboard from '../components/PPIntegratedDashboard';

const ThirdPartyDashboard: React.FC = () => {
  return (
    <Layout>
      <PPIntegratedDashboard role="third_party" />
    </Layout>
  );
};

export default ThirdPartyDashboard;