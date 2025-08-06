import React from 'react';
import Layout from '../../../components/Layout';
import { ExchangeList } from '../components/ExchangeList';

const Exchanges: React.FC = () => {
  return (
    <Layout>
      <div className="p-6">
        <ExchangeList 
          title="All Exchanges"
          showCreateButton={true}
          showFilters={true}
          showSearch={true}
          showStats={true}
        />
      </div>
    </Layout>
  );
};

export default Exchanges;