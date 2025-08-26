import React, { useState } from 'react';
import StandardDashboard from './StandardDashboard';
import { EnhancedStatCard } from './SharedDashboardComponents';
import UnifiedChatInterface from '../../messages/components/UnifiedChatInterface';
import { ExchangeList } from '../../exchanges/components/ExchangeList';
import { TaskBoard } from '../../tasks/components/TaskBoard';
import { ModernTaskUI } from '../../tasks/components/ModernTaskUI';
import {
  ChartBarIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ChatBubbleLeftRightIcon,
  FolderIcon,
  CalendarIcon,
  EyeIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import Layout from '../../../components/Layout';

interface ClientTabContentProps {
  activeTab: string;
  role: string;
}

const ClientTabContent: React.FC<ClientTabContentProps> = ({ activeTab, role }) => {
  const renderTabContent = () => {
    switch (activeTab) {
      case 'my_exchanges':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">My Exchanges</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Track your active and completed 1031 exchanges
                </p>
              </div>
              <div className="p-6">
                <ExchangeList 
                  title="My Exchanges"
                  showFilters={false}
                  showStats={true}
                />
              </div>
            </div>
          </div>
        );

      case 'my_tasks':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">My Tasks</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manage your tasks with timeline, calendar, and kanban views
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

      case 'documents':
        return (
          <div className="space-y-6">
            {/* Document Upload Area */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Document Upload</h2>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                <FolderIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900">Upload Required Documents</p>
                <p className="text-gray-600 mt-2">Drag and drop files here, or click to browse</p>
                <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                  Choose Files
                </button>
              </div>
            </div>

            {/* Recent Documents */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Documents</h3>
              <div className="space-y-3">
                {[1, 2, 3].map((doc) => (
                  <div key={doc} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Document {doc}</p>
                        <p className="text-xs text-gray-600">Uploaded 2 days ago</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="text-blue-600 hover:text-blue-800 text-sm">
                        <EyeIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'messages':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Communication with your exchange team
                </p>
              </div>
              <div className="p-0">
                <UnifiedChatInterface />
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Content
            </h3>
            <p className="text-gray-600">
              This section is being enhanced with new features.
            </p>
          </div>
        );
    }
  };

  return renderTabContent();
};

const StandardizedClientDashboard: React.FC = () => {

  const customOverviewContent = (
    <div className="space-y-6">
      {/* Important Deadlines */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Important Deadlines</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <CalendarIcon className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">45-Day Period Deadline</p>
                <p className="text-xs text-gray-600">Exchange ABC123 - Due in 12 days</p>
              </div>
            </div>
            <span className="text-yellow-800 text-sm font-medium">Urgent</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <ClockIcon className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Document Review</p>
                <p className="text-xs text-gray-600">Purchase agreement - Due in 5 days</p>
              </div>
            </div>
            <span className="text-blue-800 text-sm font-medium">Pending</span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
            <div>
              <p className="text-sm text-gray-900">Document approved: Purchase Agreement</p>
              <p className="text-xs text-gray-600">2 hours ago</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <div>
              <p className="text-sm text-gray-900">New message from coordinator</p>
              <p className="text-xs text-gray-600">4 hours ago</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
            <div>
              <p className="text-sm text-gray-900">Task assigned: Property inspection review</p>
              <p className="text-xs text-gray-600">Yesterday</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Layout>
    <StandardDashboard
      role="client"
      customContent={customOverviewContent}
    />
    </Layout>
  );
};

export default StandardizedClientDashboard;