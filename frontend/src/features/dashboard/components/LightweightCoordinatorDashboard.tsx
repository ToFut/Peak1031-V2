import React from "react";
import StandardDashboard from "./StandardDashboard";
import {
  ExclamationTriangleIcon,
  CalendarIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

const LightweightCoordinatorOverview: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* CRITICAL ITEMS - Simplified */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
          <h2 className="text-lg font-bold text-red-900">Critical Items</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white border border-red-300 rounded p-3">
            <p className="font-bold text-red-900">Smith Holdings - OVERDUE</p>
            <p className="text-sm text-red-700">Due: Aug 16 | $450K</p>
          </div>
          <div className="bg-white border border-orange-300 rounded p-3">
            <p className="font-bold text-orange-900">Johnson Trust - 24H</p>
            <p className="text-sm text-orange-700">Due: Tomorrow | $325K</p>
          </div>
          <div className="bg-white border border-yellow-300 rounded p-3">
            <p className="font-bold text-yellow-900">ABC Corp - 48H</p>
            <p className="text-sm text-yellow-700">Due: Aug 20 | $275K</p>
          </div>
        </div>
      </div>

      {/* QUICK STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
          <DocumentTextIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-blue-900">8</p>
          <p className="text-sm text-gray-600">Active Exchanges</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
          <CalendarIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-green-900">3</p>
          <p className="text-sm text-gray-600">Due Today</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
          <ChatBubbleLeftRightIcon className="h-8 w-8 text-orange-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-orange-900">2</p>
          <p className="text-sm text-gray-600">Urgent Messages</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
          <ChartBarIcon className="h-8 w-8 text-purple-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-purple-900">92%</p>
          <p className="text-sm text-gray-600">Efficiency</p>
        </div>
      </div>

      {/* RECENT EXCHANGES */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Exchanges</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded">
            <div>
              <p className="font-medium">Smith Holdings Retail Property</p>
              <p className="text-sm text-gray-500">$450K • 2 weeks ago</p>
            </div>
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">45D</span>
          </div>
          <div className="flex items-center justify-between p-3 border rounded">
            <div>
              <p className="font-medium">Johnson Trust Apartment</p>
              <p className="text-sm text-gray-500">$325K • 2 weeks ago</p>
            </div>
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Complete</span>
          </div>
          <div className="flex items-center justify-between p-3 border rounded">
            <div>
              <p className="font-medium">ABC Corp Industrial</p>
              <p className="text-sm text-gray-500">$275K • 3 weeks ago</p>
            </div>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const LightweightCoordinatorDashboard: React.FC = () => {
  return <StandardDashboard customContent={<LightweightCoordinatorOverview />} />;
};

export default LightweightCoordinatorDashboard;