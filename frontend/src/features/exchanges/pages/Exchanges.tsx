import React from 'react';
import { ExchangeList } from '../components/ExchangeList';

const Exchanges: React.FC = () => {
  return (
    <div className="p-6">
      <ExchangeList 
        title="All Exchanges"
        showCreateButton={true}
        showFilters={true}
        showSearch={true}
        showStats={true}
      />
    </div>
  );
};

export default Exchanges;