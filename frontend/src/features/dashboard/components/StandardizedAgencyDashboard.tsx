import React, { useState, useEffect } from 'react';
import StandardDashboard from './StandardDashboard';
import { EnhancedStatCard } from './SharedDashboardComponents';
import { ExchangeList } from '../../exchanges/components/ExchangeList';
import { useDashboardData } from '../../../shared/hooks/useDashboardData';
import {
  ChartBarIcon,
  DocumentTextIcon,
  UsersIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

interface ThirdParty {
  id: string;
  contact_id: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  assignment_date: string;
  can_view_performance: boolean;
  assigned_exchanges: number;
  active_exchanges: number;
  completed_exchanges: number;
  pending_exchanges: number;
  success_rate: number;
  performance_score: number;
  total_revenue: string;
  total_revenue_numeric: number;
  avg_completion_time: number;
  upcoming_deadlines: number;
  last_activity: string;
  status: 'active' | 'inactive' | 'pending';
  exchanges: Exchange[];
}

interface Exchange {
  id: string;
  title: string;
  client_name: string;
  status: string;
  value: string;
  days_remaining?: number;
  completion_percentage?: number;
  created_at: string;
  updated_at: string;
}

// Agency-specific custom content components
const AgencyOverviewContent: React.FC<{ thirdParties: ThirdParty[] }> = ({ thirdParties }) => {
  const totalThirdParties = thirdParties.length;
  const totalAssignedExchanges = thirdParties.reduce((sum, tp) => sum + tp.assigned_exchanges, 0);
  const totalActiveExchanges = thirdParties.reduce((sum, tp) => sum + tp.active_exchanges, 0);
  const totalRevenue = thirdParties.reduce((sum, tp) => sum + tp.total_revenue_numeric, 0);
  const avgPerformanceScore = thirdParties.length > 0 
    ? Math.round(thirdParties.reduce((sum, tp) => sum + tp.performance_score, 0) / thirdParties.length)
    : 0;
  const totalUpcomingDeadlines = thirdParties.reduce((sum, tp) => sum + tp.upcoming_deadlines, 0);

  return (
    <div className="space-y-6">
      {/* Agency Control Center Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Agency Control Center</h1>
              <p className="text-gray-600 mt-1">Manage your third party network and exchange portfolio</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                {totalThirdParties} Third Parties
              </div>
              <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                {totalAssignedExchanges} Total Exchanges
              </div>
            </div>
          </div>
        </div>
        
        {/* Quick Stats Row */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <BuildingOfficeIcon className="h-8 w-8 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold text-blue-900">{totalThirdParties}</div>
                  <div className="text-sm text-blue-700">Third Parties</div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
                <div>
                  <div className="text-2xl font-bold text-green-900">{totalActiveExchanges}</div>
                  <div className="text-sm text-green-700">Active Exchanges</div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <CurrencyDollarIcon className="h-8 w-8 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold text-purple-900">${(totalRevenue / 1000000).toFixed(1)}M</div>
                  <div className="text-sm text-purple-700">Total Portfolio Value</div>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <ArrowTrendingUpIcon className="h-8 w-8 text-yellow-600" />
                <div>
                  <div className="text-2xl font-bold text-yellow-900">{avgPerformanceScore}</div>
                  <div className="text-sm text-yellow-700">Avg Performance</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Agency KPIs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Agency Performance Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <EnhancedStatCard
            title="Total Revenue"
            value={`$${(totalRevenue / 1000000).toFixed(1)}M`}
            subtitle="This year"
            icon={CurrencyDollarIcon}
            color="green"
            trend="up"
            trendValue="+22% YoY"
          />
          <EnhancedStatCard
            title="Network Size"
            value={totalThirdParties.toString()}
            subtitle="Third parties"
            icon={UserGroupIcon}
            color="blue"
            trend="up"
            trendValue="+2 this quarter"
          />
          <EnhancedStatCard
            title="Portfolio Volume"
            value={totalAssignedExchanges.toString()}
            subtitle="Total exchanges"
            icon={DocumentTextIcon}
            color="purple"
            trend="up"
            trendValue="+18% this month"
          />
          <EnhancedStatCard
            title="Urgent Deadlines"
            value={totalUpcomingDeadlines.toString()}
            subtitle="Within 30 days"
            icon={ExclamationTriangleIcon}
            color={totalUpcomingDeadlines > 0 ? "red" : "green"}
            trend={totalUpcomingDeadlines > 0 ? "up" : "neutral"}
            trendValue={totalUpcomingDeadlines > 0 ? "Requires attention" : "All on track"}
          />
        </div>
      </div>
      
      {/* Third Party Summary Cards */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Third Party Network Overview</h2>
          <p className="text-sm text-gray-600 mt-1">Quick overview of your third party performance</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {thirdParties.slice(0, 3).map((thirdParty) => (
              <div key={thirdParty.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <UserGroupIcon className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{thirdParty.name}</h3>
                    <p className="text-sm text-gray-600">{thirdParty.assigned_exchanges} exchanges</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Active:</span>
                    <span className="ml-1 font-medium text-green-600">{thirdParty.active_exchanges}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Score:</span>
                    <span className="ml-1 font-medium text-blue-600">{thirdParty.performance_score}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ThirdPartiesContent: React.FC<{ thirdParties: ThirdParty[]; onThirdPartySelect?: (id: string) => void }> = ({ 
  thirdParties, 
  onThirdPartySelect 
}) => {
  return (
    <div className="space-y-6">
      {/* Third Party Management Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Third Party Management</h2>
              <p className="text-sm text-gray-600 mt-1">
                Manage your assigned third parties and their exchange portfolios
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Total Third Parties:</span>
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                {thirdParties.length}
              </span>
            </div>
          </div>
        </div>
        
        {/* Third Party Cards Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {thirdParties.map((thirdParty) => (
              <div key={thirdParty.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                   onClick={() => onThirdPartySelect?.(thirdParty.id)}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <UserGroupIcon className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{thirdParty.name}</h3>
                      <p className="text-sm text-gray-600">{thirdParty.email}</p>
                      {thirdParty.company && (
                        <p className="text-xs text-gray-500">{thirdParty.company}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      thirdParty.status === 'active' 
                        ? 'bg-green-100 text-green-800'
                        : thirdParty.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {thirdParty.status.charAt(0).toUpperCase() + thirdParty.status.slice(1)}
                    </span>
                    <div className="mt-2 text-right">
                      <div className="text-lg font-bold text-blue-600">{thirdParty.performance_score}</div>
                      <div className="text-xs text-gray-500">Performance Score</div>
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Exchange Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">{thirdParty.assigned_exchanges}</div>
                    <div className="text-xs text-gray-600">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">{thirdParty.active_exchanges}</div>
                    <div className="text-xs text-gray-600">Active</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">{thirdParty.success_rate}%</div>
                    <div className="text-xs text-gray-600">Success</div>
                  </div>
                </div>
                
                {/* Performance Metrics */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Revenue:</span>
                    <span className="text-sm font-medium text-gray-900">{thirdParty.total_revenue}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Avg. Completion:</span>
                    <span className="text-sm text-gray-900">{thirdParty.avg_completion_time} days</span>
                  </div>
                  {thirdParty.upcoming_deadlines > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-yellow-600">Upcoming Deadlines:</span>
                      <span className="text-sm font-medium text-yellow-800">{thirdParty.upcoming_deadlines}</span>
                    </div>
                  )}
                </div>
                
                {/* Status Indicators */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    {thirdParty.active_exchanges > 0 && (
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    )}
                    {thirdParty.upcoming_deadlines > 0 && (
                      <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                    )}
                    <span className="text-xs text-gray-500">
                      Last active: {new Date(thirdParty.last_activity).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                {/* Action Button */}
                <div className="mt-4">
                  <button className="w-full bg-blue-50 text-blue-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
                    View Performance & Exchanges →
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {/* Empty State */}
          {thirdParties.length === 0 && (
            <div className="text-center py-12">
              <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No third parties assigned</h3>
              <p className="mt-1 text-sm text-gray-500">
                Contact your administrator to assign third parties to your agency.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ExchangesContent: React.FC<{ thirdParties: ThirdParty[]; selectedThirdParty?: string; onThirdPartySelect?: (id: string) => void }> = ({ 
  thirdParties, 
  selectedThirdParty, 
  onThirdPartySelect 
}) => {
  return (
    <div className="space-y-6">
      {/* Filter by Third Party */}
      {thirdParties.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-4">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filter by Third Party:</span>
            <select 
              value={selectedThirdParty || ''}
              onChange={(e) => onThirdPartySelect?.(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Third Parties</option>
              {thirdParties.map((tp) => (
                <option key={tp.id} value={tp.id}>{tp.name}</option>
              ))}
            </select>
            {selectedThirdParty && (
              <span className="text-sm text-gray-500">
                Showing exchanges for: <strong>{thirdParties.find(tp => tp.id === selectedThirdParty)?.name}</strong>
              </span>
            )}
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Agency Exchanges Portfolio</h2>
          <p className="text-sm text-gray-600 mt-1">
            Monitor all exchanges across your third party network
          </p>
        </div>
        <div className="p-6">
          <ExchangeList 
            title="Agency Exchange Portfolio"
            showFilters={true}
            showStats={true}
          />
        </div>
      </div>
    </div>
  );
};

const StandardizedAgencyDashboard: React.FC = () => {
  const [selectedThirdParty, setSelectedThirdParty] = useState<string>('');
  const [mockThirdParties, setMockThirdParties] = useState<ThirdParty[]>([]);
  const [activeSection, setActiveSection] = useState<string>('overview');
  
  // Load third party data from API
  useEffect(() => {
    const loadThirdParties = async () => {
      try {
        const response = await fetch('/api/agency/third-parties', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            // Format the enhanced data to match our interface
            const formattedData: ThirdParty[] = result.data.map((tp: any) => ({
              id: tp.contact_id,
              contact_id: tp.contact_id,
              name: tp.name,
              email: tp.email,
              company: tp.company,
              phone: tp.phone,
              assignment_date: tp.assignment_date,
              can_view_performance: tp.can_view_performance,
              assigned_exchanges: tp.assigned_exchanges,
              active_exchanges: tp.active_exchanges,
              completed_exchanges: tp.completed_exchanges,
              pending_exchanges: tp.pending_exchanges,
              success_rate: tp.success_rate,
              performance_score: tp.performance_score,
              total_revenue: tp.total_revenue,
              total_revenue_numeric: tp.total_revenue_numeric,
              avg_completion_time: tp.avg_completion_time,
              upcoming_deadlines: tp.upcoming_deadlines,
              last_activity: tp.last_activity,
              status: tp.status,
              exchanges: tp.exchanges || []
            }));
            setMockThirdParties(formattedData);
          }
        } else {
          console.error('Failed to load third party data:', response.statusText);
          setMockThirdParties([]);
        }
      } catch (error) {
        console.error('Error loading third party data:', error);
        setMockThirdParties([]);
      }
    };
    
    loadThirdParties();
  }, []);

  // Render appropriate content based on active section
  const renderSectionContent = () => {
    switch (activeSection) {
      case 'third-parties':
        return <ThirdPartiesContent thirdParties={mockThirdParties} onThirdPartySelect={setSelectedThirdParty} />;
      case 'exchanges':
        return <ExchangesContent thirdParties={mockThirdParties} selectedThirdParty={selectedThirdParty} onThirdPartySelect={setSelectedThirdParty} />;
      default:
        return <AgencyOverviewContent thirdParties={mockThirdParties} />;
    }
  };

  // Custom content with section navigation
  const customContent = (
    <div className="space-y-6">
      {/* Section Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveSection('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeSection === 'overview'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ChartBarIcon className="h-5 w-5 inline mr-2" />
              Overview
            </button>
            <button
              onClick={() => setActiveSection('third-parties')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeSection === 'third-parties'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <UserGroupIcon className="h-5 w-5 inline mr-2" />
              Third Parties
            </button>
            <button
              onClick={() => setActiveSection('exchanges')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeSection === 'exchanges'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <DocumentTextIcon className="h-5 w-5 inline mr-2" />
              Exchanges
            </button>
          </nav>
        </div>
      </div>
      
      {/* Section Content */}
      {renderSectionContent()}
    </div>
  );

  // Use StandardDashboard with agency role and custom content
  return (
    <StandardDashboard 
      role="agency" 
      customContent={customContent}
    />
  );
};

export default StandardizedAgencyDashboard;