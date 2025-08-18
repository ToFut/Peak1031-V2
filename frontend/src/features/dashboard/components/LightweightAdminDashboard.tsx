import React from 'react';
import StandardDashboard from './StandardDashboard';
import {
  ChartBarIcon,
  UsersIcon,
  ServerIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const LightweightAdminOverview: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* CRITICAL SYSTEM ALERTS */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
          <h2 className="text-lg font-bold text-red-900">System-Wide Critical Items</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-white border border-red-300 rounded p-3">
            <p className="font-bold text-red-900">2 Overdue Exchanges</p>
            <p className="text-sm text-red-700">$775K total value at risk</p>
          </div>
          <div className="bg-white border border-orange-300 rounded p-3">
            <p className="font-bold text-orange-900">1 Coordinator Overloaded</p>
            <p className="text-sm text-orange-700">Mike needs support (110% capacity)</p>
          </div>
        </div>
      </div>

      {/* KEY METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
          <DocumentTextIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-blue-900">100</p>
          <p className="text-sm text-gray-600">Total Exchanges</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
          <UsersIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-green-900">95</p>
          <p className="text-sm text-gray-600">Active Exchanges</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
          <ChatBubbleLeftRightIcon className="h-8 w-8 text-orange-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-orange-900">2.0K</p>
          <p className="text-sm text-gray-600">Messages (30d)</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
          <ServerIcon className="h-8 w-8 text-purple-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-purple-900">99.8%</p>
          <p className="text-sm text-gray-600">System Uptime</p>
        </div>
      </div>

      {/* BUSINESS OVERVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5 text-green-600" />
            Business Performance
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Monthly Revenue</span>
              <span className="font-bold text-green-600">$142K (+18%)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pipeline Value</span>
              <span className="font-bold text-blue-600">$2.8M</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Close Rate</span>
              <span className="font-bold text-purple-600">85%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Avg Close Time</span>
              <span className="font-bold text-orange-600">18 days</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-blue-600" />
            Team Health
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Team Efficiency</span>
              <span className="font-bold text-green-600">84%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Coordinators</span>
              <span className="font-bold text-blue-600">3 active</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Overloaded</span>
              <span className="font-bold text-red-600">1 needs help</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Client Satisfaction</span>
              <span className="font-bold text-green-600">4.6/5</span>
            </div>
          </div>
        </div>
      </div>

      {/* RECENT ACTIVITY */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4">Recent System Activity</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 border rounded">
            <div>
              <p className="font-medium">PracticePanther Sync Completed</p>
              <p className="text-sm text-gray-500">45 records updated</p>
            </div>
            <span className="text-xs text-gray-400">15 min ago</span>
          </div>
          <div className="flex justify-between items-center p-3 border rounded">
            <div>
              <p className="font-medium">User Role Updated</p>
              <p className="text-sm text-gray-500">john.doe promoted to coordinator</p>
            </div>
            <span className="text-xs text-gray-400">2 hours ago</span>
          </div>
          <div className="flex justify-between items-center p-3 border rounded">
            <div>
              <p className="font-medium">System Backup Completed</p>
              <p className="text-sm text-gray-500">All data secured</p>
            </div>
            <span className="text-xs text-gray-400">4 hours ago</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const LightweightAdminDashboard: React.FC = () => {
  return <StandardDashboard customContent={<LightweightAdminOverview />} />;
};

export default LightweightAdminDashboard;