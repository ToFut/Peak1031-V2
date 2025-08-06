import React from 'react';

interface PPIntegratedDashboardProps {
  role: string;
}

const PPIntegratedDashboard: React.FC<PPIntegratedDashboardProps> = ({ role }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Practice Panther Integrated Dashboard ({role})
      </h2>
      <p className="text-gray-600">
        This dashboard integrates with Practice Panther data for {role} role.
      </p>
    </div>
  );
};

export default PPIntegratedDashboard; 