import React, { useState } from 'react';
import StandardDashboard from './StandardDashboard';
import { EnhancedStatCard } from './SharedDashboardComponents';
import { ExchangeList } from '../../exchanges/components/ExchangeList';
import {
  ChartBarIcon,
  DocumentTextIcon,
  EyeIcon,
  ShieldCheckIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface ThirdPartyTabContentProps {
  activeTab: string;
  role: string;
}

const ThirdPartyTabContent: React.FC<ThirdPartyTabContentProps> = ({ activeTab, role }) => {
  const renderTabContent = () => {
    switch (activeTab) {
      case 'exchanges':
        return (
          <div className="space-y-6">
            {/* Read-only Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-amber-800">Limited Access</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    As a third party, you have read-only access to exchanges where you are a participant.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">My Exchanges</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Exchanges where you are listed as a participant
                </p>
              </div>
              <div className="p-6">
                <ExchangeList 
                  title="Participating Exchanges"
                  showFilters={false}
                  showStats={false}
                />
              </div>
            </div>
          </div>
        );

      case 'documents':
        return (
          <div className="space-y-6">
            {/* Access Control Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <ShieldCheckIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-blue-800">Secure Document Access</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Documents may require PIN verification for additional security.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Available Documents</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Documents shared with you from active exchanges
                </p>
              </div>
              <div className="p-6">
                <div className="text-center text-gray-600">
                  <p>Protected documents will appear here when available.</p>
                  <p className="text-sm mt-2">Contact your coordinator for document access.</p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center rounded-full bg-gray-100">
              <EyeIcon className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Limited Access</h3>
            <p className="text-gray-600 max-w-sm mx-auto">
              This section is not available for third-party users. Contact your exchange coordinator for more information.
            </p>
          </div>
        );
    }
  };

  return renderTabContent();
};

const StandardizedThirdPartyDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const customTabs = [
    {
      id: 'overview',
      name: 'Overview',
      icon: ChartBarIcon
    },
    {
      id: 'exchanges',
      name: 'Exchanges',
      icon: DocumentTextIcon
    },
    {
      id: 'documents',
      name: 'Documents',
      icon: DocumentTextIcon
    }
  ];

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  const customOverviewContent = (
    <div className="space-y-6">
      {/* Third Party Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Participation Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <EnhancedStatCard
            title="Active Exchanges"
            value={5}
            subtitle="Currently participating"
            icon={DocumentTextIcon}
            color="blue"
          />
          <EnhancedStatCard
            title="Pending Actions"
            value={2}
            subtitle="Awaiting your input"
            icon={ClockIcon}
            color="yellow"
            urgent={true}
          />
          <EnhancedStatCard
            title="Completed"
            value={28}
            subtitle="Total exchanges"
            icon={ShieldCheckIcon}
            color="green"
            trend="up"
            trendValue="Historical performance"
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">Document request received</p>
              <p className="text-xs text-gray-600">Exchange ABC123 - Property inspection report</p>
              <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">Document approved</p>
              <p className="text-xs text-gray-600">Exchange DEF456 - Title commitment review</p>
              <p className="text-xs text-gray-500 mt-1">1 day ago</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">New exchange participation</p>
              <p className="text-xs text-gray-600">Exchange GHI789 - Added as qualified intermediary</p>
              <p className="text-xs text-gray-500 mt-1">3 days ago</p>
            </div>
          </div>
        </div>
      </div>

      {/* Access Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Third Party Access Guidelines</h2>
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">View-Only Access</p>
              <p className="text-xs text-gray-600">You can view exchanges where you are a registered participant</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 bg-yellow-100 rounded-full flex items-center justify-center mt-0.5">
              <span className="w-2 h-2 bg-yellow-600 rounded-full"></span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Document Security</p>
              <p className="text-xs text-gray-600">Some documents may require PIN verification for access</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
              <span className="w-2 h-2 bg-green-600 rounded-full"></span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Support</p>
              <p className="text-xs text-gray-600">Contact the exchange coordinator if you need additional access</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <StandardDashboard
      role="third_party"
      customTabs={customTabs}
      onTabChange={handleTabChange}
      customContent={activeTab === 'overview' ? customOverviewContent : undefined}
    >
      {activeTab !== 'overview' && (
        <ThirdPartyTabContent activeTab={activeTab} role="third_party" />
      )}
    </StandardDashboard>
  );
};

export default StandardizedThirdPartyDashboard;