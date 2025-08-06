import React, { useState } from 'react';
import StandardDashboard from './StandardDashboard';
import { EnhancedStatCard } from './SharedDashboardComponents';
import { ExchangeList } from '../ExchangeList';
import {
  ChartBarIcon,
  DocumentTextIcon,
  UsersIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  SignalIcon,
  StarIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';

interface AgencyTabContentProps {
  activeTab: string;
  role: string;
}

const AgencyTabContent: React.FC<AgencyTabContentProps> = ({ activeTab, role }) => {
  const renderTabContent = () => {
    switch (activeTab) {
      case 'exchanges':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Client Exchanges</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Monitor exchanges for all your agency clients
                </p>
              </div>
              <div className="p-6">
                <ExchangeList 
                  title="Agency Client Exchanges"
                  showFilters={true}
                  showStats={true}
                />
              </div>
            </div>
          </div>
        );

      case 'clients':
        return (
          <div className="space-y-6">
            {/* Client Portfolio */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Client Portfolio</h2>
              <div className="space-y-4">
                {[
                  { name: 'ABC Real Estate Group', exchanges: 12, revenue: '$2.4M', status: 'Active', rating: 5 },
                  { name: 'Summit Property Investors', exchanges: 8, revenue: '$1.8M', status: 'Active', rating: 4 },
                  { name: 'Metro Development Co', exchanges: 15, revenue: '$3.2M', status: 'Active', rating: 5 },
                  { name: 'Coastal Properties LLC', exchanges: 6, revenue: '$1.2M', status: 'Pending', rating: 4 }
                ].map((client, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <span className="text-purple-600 font-medium text-sm">
                          {client.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{client.name}</p>
                        <p className="text-sm text-gray-600">{client.exchanges} exchanges • {client.revenue} revenue</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: client.rating }).map((_, i) => (
                          <StarIcon key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                        ))}
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        client.status === 'Active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {client.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'performance':
        return (
          <div className="space-y-6">
            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <EnhancedStatCard
                title="Network Health"
                value="98.5%"
                subtitle="System uptime"
                icon={SignalIcon}
                color="green"
                trend="up"
                trendValue="+0.2% this month"
              />
              <EnhancedStatCard
                title="Avg. Deal Size"
                value="$1.8M"
                subtitle="Per exchange"
                icon={BanknotesIcon}
                color="blue"
                trend="up"
                trendValue="+12% YoY"
              />
              <EnhancedStatCard
                title="Client Satisfaction"
                value="4.7/5"
                subtitle="Average rating"
                icon={StarIcon}
                color="green"
                trend="up"
                trendValue="+0.3 this quarter"
              />
            </div>

            {/* Revenue Breakdown */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Breakdown</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">By Quarter</h3>
                  <div className="space-y-3">
                    {[
                      { quarter: 'Q1 2024', amount: '$2.1M', change: '+15%' },
                      { quarter: 'Q2 2024', amount: '$2.8M', change: '+33%' },
                      { quarter: 'Q3 2024', amount: '$3.2M', change: '+14%' },
                      { quarter: 'Q4 2024', amount: '$2.9M', change: 'Projected' }
                    ].map((item, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{item.quarter}</span>
                        <div className="text-right">
                          <span className="text-sm font-medium text-gray-900">{item.amount}</span>
                          <span className={`ml-2 text-xs ${
                            item.change.includes('+') ? 'text-green-600' : 'text-gray-500'
                          }`}>
                            {item.change}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Top Performers</h3>
                  <div className="space-y-3">
                    {[
                      { client: 'Metro Development Co', amount: '$3.2M', percentage: '32%' },
                      { client: 'ABC Real Estate Group', amount: '$2.4M', percentage: '24%' },
                      { client: 'Summit Property Investors', amount: '$1.8M', percentage: '18%' },
                      { client: 'Others', amount: '$2.6M', percentage: '26%' }
                    ].map((item, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">{item.client}</span>
                        <div className="text-right">
                          <span className="text-sm font-medium text-gray-900">{item.amount}</span>
                          <span className="ml-2 text-xs text-gray-500">({item.percentage})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Management
            </h3>
            <p className="text-gray-600">
              Agency management tools for this section are being enhanced.
            </p>
          </div>
        );
    }
  };

  return renderTabContent();
};

const StandardizedAgencyDashboard: React.FC = () => {
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
      id: 'clients',
      name: 'Clients',
      icon: UsersIcon
    },
    {
      id: 'performance',
      name: 'Performance',
      icon: ArrowTrendingUpIcon
    }
  ];

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  const customOverviewContent = (
    <div className="space-y-6">
      {/* Agency KPIs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Agency Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <EnhancedStatCard
            title="Total Revenue"
            value="$10.2M"
            subtitle="This year"
            icon={CurrencyDollarIcon}
            color="green"
            trend="up"
            trendValue="+22% YoY"
          />
          <EnhancedStatCard
            title="Active Clients"
            value="24"
            subtitle="Portfolio size"
            icon={UsersIcon}
            color="blue"
            trend="up"
            trendValue="+3 this quarter"
          />
          <EnhancedStatCard
            title="Success Rate"
            value="97.2%"
            subtitle="Completed exchanges"
            icon={ArrowTrendingUpIcon}
            color="green"
            trend="up"
            trendValue="+1.2% this month"
          />
          <EnhancedStatCard
            title="Avg. Timeline"
            value="32 days"
            subtitle="Exchange completion"
            icon={SignalIcon}
            color="yellow"
            trend="down"
            trendValue="-3 days improved"
          />
        </div>
      </div>
    </div>
  );

  return (
    <StandardDashboard
      role="agency"
      customTabs={customTabs}
      onTabChange={handleTabChange}
      customContent={activeTab === 'overview' ? customOverviewContent : undefined}
    >
      {activeTab !== 'overview' && (
        <AgencyTabContent activeTab={activeTab} role="agency" />
      )}
    </StandardDashboard>
  );
};

export default StandardizedAgencyDashboard;