import React, { useState, useEffect } from 'react';
import StandardDashboard from './StandardDashboard';
import { EnhancedStatCard } from './SharedDashboardComponents';
import { ExchangeList } from '../../exchanges/components/ExchangeList';
import { useDashboardData } from '../../../shared/hooks/useDashboardData';
import { ModernTaskUI } from '../../tasks/components/ModernTaskUI';
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
  BuildingOfficeIcon,
  XMarkIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  ChartPieIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import Layout from '../../../components/Layout';

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

// New Third Party Performance Modal Component
const ThirdPartyPerformanceModal: React.FC<{
  thirdParty: ThirdParty | null;
  isOpen: boolean;
  onClose: () => void;
}> = ({ thirdParty, isOpen, onClose }) => {
  if (!isOpen || !thirdParty) return null;

  const performanceTrend = thirdParty.performance_score > 75 ? 'up' : thirdParty.performance_score > 50 ? 'stable' : 'down';
  const successRateColor = thirdParty.success_rate >= 80 ? 'text-green-600' : thirdParty.success_rate >= 60 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <UserGroupIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{thirdParty.name}</h2>
              <p className="text-sm text-gray-600">{thirdParty.company}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <EnvelopeIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">{thirdParty.email}</span>
            </div>
            {thirdParty.phone && (
              <div className="flex items-center gap-3">
                <PhoneIcon className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-600">{thirdParty.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <CalendarIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">
                Assigned since {new Date(thirdParty.assignment_date).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="h-5 w-5 text-gray-400" />
              <span className={`text-sm font-medium ${
                thirdParty.status === 'active' ? 'text-green-600' : 'text-gray-600'
              }`}>
                {thirdParty.status.charAt(0).toUpperCase() + thirdParty.status.slice(1)}
              </span>
            </div>
          </div>

          {/* Performance Overview */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{thirdParty.performance_score}</div>
                <div className="text-sm text-gray-600">Performance Score</div>
                <div className="flex items-center justify-center gap-1 mt-1">
                  {performanceTrend === 'up' && <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />}
                  {performanceTrend === 'down' && <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />}
                  <span className={`text-xs ${
                    performanceTrend === 'up' ? 'text-green-600' : 
                    performanceTrend === 'down' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {performanceTrend === 'up' ? '+12%' : performanceTrend === 'down' ? '-5%' : 'Stable'}
                  </span>
                </div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${successRateColor}`}>{thirdParty.success_rate}%</div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{thirdParty.avg_completion_time}</div>
                <div className="text-sm text-gray-600">Avg. Days to Complete</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{thirdParty.total_revenue}</div>
                <div className="text-sm text-gray-600">Total Revenue</div>
              </div>
            </div>
          </div>

          {/* Exchange Statistics */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Exchange Portfolio</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-xl font-bold text-blue-600">{thirdParty.assigned_exchanges}</div>
                <div className="text-sm text-blue-700">Total Assigned</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-xl font-bold text-green-600">{thirdParty.active_exchanges}</div>
                <div className="text-sm text-green-700">Currently Active</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-xl font-bold text-purple-600">{thirdParty.completed_exchanges}</div>
                <div className="text-sm text-purple-700">Completed</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-xl font-bold text-yellow-600">{thirdParty.pending_exchanges}</div>
                <div className="text-sm text-yellow-700">Pending</div>
              </div>
            </div>

            {/* Recent Exchanges */}
            {thirdParty.exchanges && thirdParty.exchanges.length > 0 && (
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Recent Exchanges</h4>
                <div className="space-y-3">
                  {thirdParty.exchanges.slice(0, 5).map((exchange) => (
                    <div key={exchange.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{exchange.title}</div>
                        <div className="text-sm text-gray-600">{exchange.client_name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">{exchange.value}</div>
                        <div className={`text-xs px-2 py-1 rounded-full ${
                          exchange.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          exchange.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {exchange.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Performance Charts Placeholder */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends</h3>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <ChartPieIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Performance charts coming soon</p>
                <p className="text-sm text-gray-400">Monthly trends, success rates, and revenue analytics</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
              View All Exchanges
            </button>
            <button className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors">
              Export Performance Report
            </button>
            <button className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors">
              Send Performance Review
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// New Third Party Assignment Management Component
const ThirdPartyAssignmentModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onRequestAssignment: (data: any) => void;
}> = ({ isOpen, onClose, onRequestAssignment }) => {
  const [formData, setFormData] = useState({
    thirdPartyName: '',
    email: '',
    company: '',
    phone: '',
    reason: '',
    expectedExchanges: '',
    priority: 'medium'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRequestAssignment(formData);
    setFormData({
      thirdPartyName: '',
      email: '',
      company: '',
      phone: '',
      reason: '',
      expectedExchanges: '',
      priority: 'medium'
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Request Third Party Assignment</h2>
            <p className="text-sm text-gray-600 mt-1">Request a new third party to be assigned to your agency</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Third Party Name *
              </label>
              <input
                type="text"
                required
                value={formData.thirdPartyName}
                onChange={(e) => setFormData({ ...formData, thirdPartyName: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Company name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Assignment *
            </label>
            <textarea
              required
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Explain why this third party should be assigned to your agency..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expected Number of Exchanges
              </label>
              <input
                type="number"
                value={formData.expectedExchanges}
                onChange={(e) => setFormData({ ...formData, expectedExchanges: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="5"
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority Level
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Submit Request
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ThirdPartiesContent: React.FC<{ thirdParties: ThirdParty[]; onThirdPartySelect?: (id: string) => void }> = ({ 
  thirdParties, 
  onThirdPartySelect 
}) => {
  const [selectedThirdParty, setSelectedThirdParty] = useState<ThirdParty | null>(null);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);

  const handleThirdPartyClick = (thirdParty: ThirdParty) => {
    setSelectedThirdParty(thirdParty);
    setShowPerformanceModal(true);
  };

  const handleRequestAssignment = (data: any) => {
    // Here you would typically send the request to the backend
    console.log('Requesting third party assignment:', data);
    // You could add a toast notification here
    alert('Assignment request submitted successfully!');
  };

  return (
    <div className="space-y-6">
      {/* Third Party Performance Modal */}
      <ThirdPartyPerformanceModal
        thirdParty={selectedThirdParty}
        isOpen={showPerformanceModal}
        onClose={() => {
          setShowPerformanceModal(false);
          setSelectedThirdParty(null);
        }}
      />

      {/* Third Party Assignment Modal */}
      <ThirdPartyAssignmentModal
        isOpen={showAssignmentModal}
        onClose={() => setShowAssignmentModal(false)}
        onRequestAssignment={handleRequestAssignment}
      />

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
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">Total Third Parties:</span>
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                {thirdParties.length}
              </span>
              <button
                onClick={() => setShowAssignmentModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Request Assignment
              </button>
            </div>
          </div>
        </div>
        
        {/* Third Party Cards Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {thirdParties.map((thirdParty) => (
              <div key={thirdParty.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                   onClick={() => handleThirdPartyClick(thirdParty)}>
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
              <button
                onClick={() => setShowAssignmentModal(true)}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Request Assignment
              </button>
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

// New Agency Analytics Component
const AgencyAnalyticsContent: React.FC<{ thirdParties: ThirdParty[] }> = ({ thirdParties }) => {
  const totalRevenue = thirdParties.reduce((sum, tp) => sum + tp.total_revenue_numeric, 0);
  const avgPerformanceScore = thirdParties.length > 0 
    ? Math.round(thirdParties.reduce((sum, tp) => sum + tp.performance_score, 0) / thirdParties.length)
    : 0;
  const totalExchanges = thirdParties.reduce((sum, tp) => sum + tp.assigned_exchanges, 0);
  const activeExchanges = thirdParties.reduce((sum, tp) => sum + tp.active_exchanges, 0);

  // Calculate performance distribution
  const performanceDistribution = {
    excellent: thirdParties.filter(tp => tp.performance_score >= 80).length,
    good: thirdParties.filter(tp => tp.performance_score >= 60 && tp.performance_score < 80).length,
    average: thirdParties.filter(tp => tp.performance_score >= 40 && tp.performance_score < 60).length,
    poor: thirdParties.filter(tp => tp.performance_score < 40).length
  };

  // Top performers
  const topPerformers = [...thirdParties]
    .sort((a, b) => b.performance_score - a.performance_score)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Analytics Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Agency Analytics & Performance</h2>
              <p className="text-sm text-gray-600 mt-1">
                Comprehensive analytics and performance insights for your third party network
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                Export Report
              </button>
              <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                Schedule Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Portfolio Value</p>
              <p className="text-2xl font-bold text-gray-900">${(totalRevenue / 1000000).toFixed(1)}M</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center">
              <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-600 ml-1">+12.5% from last month</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Performance Score</p>
              <p className="text-2xl font-bold text-gray-900">{avgPerformanceScore}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center">
              <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-600 ml-1">+3.2 points from last month</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Exchanges</p>
              <p className="text-2xl font-bold text-gray-900">{activeExchanges}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <DocumentTextIcon className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center">
              <span className="text-sm text-gray-600">of {totalExchanges} total</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Network Size</p>
              <p className="text-2xl font-bold text-gray-900">{thirdParties.length}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <UserGroupIcon className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center">
              <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-600 ml-1">+2 this quarter</span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Distribution Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Excellent (80+)</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{performanceDistribution.excellent}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Good (60-79)</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{performanceDistribution.good}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Average (40-59)</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{performanceDistribution.average}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Poor (&lt;40)</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{performanceDistribution.poor}</span>
              </div>
            </div>
          </div>
          <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <ChartPieIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Performance distribution chart</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
        <div className="space-y-4">
          {topPerformers.map((thirdParty, index) => (
            <div key={thirdParty.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{thirdParty.name}</h4>
                  <p className="text-sm text-gray-600">{thirdParty.company}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-600">{thirdParty.performance_score}</div>
                <div className="text-sm text-gray-600">Performance Score</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Trends */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends</h3>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Performance trends over time</p>
            <p className="text-sm text-gray-400">Monthly performance tracking and forecasting</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <UserGroupIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Add Third Party</h4>
                <p className="text-sm text-gray-600">Request new assignment</p>
              </div>
            </div>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <ChartBarIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Performance Review</h4>
                <p className="text-sm text-gray-600">Schedule reviews</p>
              </div>
            </div>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <DocumentTextIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Generate Report</h4>
                <p className="text-sm text-gray-600">Create custom reports</p>
              </div>
            </div>
          </button>
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
        // Use intelligent URL detection
        let baseUrl = process.env.REACT_APP_API_URL;
        
        if (!baseUrl) {
          const isProduction = window.location.hostname !== 'localhost';
          if (isProduction && window.location.hostname.includes('vercel.app')) {
            baseUrl = 'https://peak1031-production.up.railway.app/api';
          } else {
            baseUrl = 'http://localhost:5001/api';
          }
        }

        const response = await fetch(`${baseUrl}/agency/third-parties`, {
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
      case 'analytics':
        return <AgencyAnalyticsContent thirdParties={mockThirdParties} />;
      case 'tasks':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Agency Task Management</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manage tasks across all third parties and exchanges with timeline and calendar views
                </p>
              </div>
              <div className="p-6">
                <ModernTaskUI
                  initialView="timeline"
                  onTaskSelect={(task) => console.log('Task selected:', task)}
                  onCreateClick={() => console.log('Create task clicked')}
                />
              </div>
            </div>
          </div>
        );
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
            <button
              onClick={() => setActiveSection('analytics')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeSection === 'analytics'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ChartPieIcon className="h-5 w-5 inline mr-2" />
              Analytics
            </button>
            <button
              onClick={() => setActiveSection('tasks')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeSection === 'tasks'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <CalendarIcon className="h-5 w-5 inline mr-2" />
              Tasks
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
    <Layout>
    <StandardDashboard 
      role="agency" 
      customContent={customContent}
    />
    </Layout>
  );
};

export default StandardizedAgencyDashboard;