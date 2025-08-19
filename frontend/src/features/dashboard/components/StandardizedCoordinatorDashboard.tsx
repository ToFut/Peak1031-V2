import React, { useState } from 'react';
import StandardDashboard from './StandardDashboard';
import { EnhancedStatCard } from './SharedDashboardComponents';
import { TaskBoard } from '../../tasks/components/TaskBoard';
import { ExchangeList } from '../../exchanges/components/ExchangeList';
import { ModernTaskUI } from '../../tasks/components/ModernTaskUI';
// import KanbanTaskBoard from '../../../components/dashboard/KanbanTaskBoard';
import {
  ChartBarIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  UsersIcon,
  CalendarIcon,
  ClockIcon,
  TrophyIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';

interface CoordinatorTabContentProps {
  activeTab: string;
  role: string;
}

const CoordinatorTabContent: React.FC<CoordinatorTabContentProps> = ({ activeTab, role }) => {
  const renderTabContent = () => {
    switch (activeTab) {
      case 'exchanges':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Exchange Management</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Monitor and coordinate all assigned exchanges
                </p>
              </div>
              <div className="p-6">
                <ExchangeList 
                  title="Assigned Exchanges"
                  showCreateButton={true}
                  showFilters={true}
                  showStats={true}
                />
              </div>
            </div>
          </div>
        );

      case 'tasks':
        return (
          <div className="space-y-6">
            {/* Modern Task UI with Timeline/Calendar */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Task Management</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manage tasks with timeline, calendar, and kanban views
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

      case 'team':
        return (
          <div className="space-y-6">
            {/* Team Performance */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <EnhancedStatCard
                title="Team Members"
                value={8}
                subtitle="Active coordinators"
                icon={UsersIcon}
                color="blue"
              />
              <EnhancedStatCard
                title="Avg. Response Time"
                value="2.4h"
                subtitle="Client communications"
                icon={ClockIcon}
                color="green"
                trend="down"
                trendValue="-0.3h improved"
              />
              <EnhancedStatCard
                title="Success Rate"
                value="94%"
                subtitle="Completed exchanges"
                icon={ArrowTrendingUpIcon}
                color="green"
                trend="up"
                trendValue="+2% this month"
              />
            </div>

            {/* Team Workload */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Team Workload</h2>
              <div className="space-y-4">
                {[
                  { name: 'Sarah Johnson', exchanges: 8, tasks: 24, workload: 85 },
                  { name: 'Mike Chen', exchanges: 6, tasks: 18, workload: 72 },
                  { name: 'Lisa Rodriguez', exchanges: 10, tasks: 31, workload: 92 },
                  { name: 'David Wilson', exchanges: 5, tasks: 15, workload: 58 }
                ].map((member, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-sm">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{member.name}</p>
                        <p className="text-sm text-gray-600">{member.exchanges} exchanges, {member.tasks} tasks</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            member.workload > 90 ? 'bg-red-500' : 
                            member.workload > 75 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(member.workload, 100)}%` }}
                        />
                      </div>
                      <span className={`text-sm font-medium ${
                        member.workload > 90 ? 'text-red-600' : 
                        member.workload > 75 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {member.workload}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'documents':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Document Review Queue</h2>
              <div className="space-y-3">
                {[
                  { title: 'Purchase Agreement - Exchange ABC123', status: 'Pending Review', urgent: true },
                  { title: 'Property Inspection - Exchange DEF456', status: 'Awaiting Signature', urgent: false },
                  { title: 'Title Report - Exchange GHI789', status: 'Under Review', urgent: false }
                ].map((doc, index) => (
                  <div key={index} className={`p-4 border rounded-lg ${
                    doc.urgent ? 'border-red-200 bg-red-50' : 'border-gray-200'
                  }`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">{doc.title}</p>
                        <p className="text-sm text-gray-600">{doc.status}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {doc.urgent && (
                          <span className="text-red-600 text-sm font-medium">Urgent</span>
                        )}
                        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                          Review
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
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
              Advanced coordination tools for this section are being enhanced.
            </p>
          </div>
        );
    }
  };

  return renderTabContent();
};

const StandardizedCoordinatorDashboard: React.FC = () => {

  const customOverviewContent = (
    <div className="space-y-6">
      {/* Performance Metrics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Analytics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <EnhancedStatCard
            title="This Month"
            value="12"
            subtitle="Exchanges completed"
            icon={TrophyIcon}
            color="green"
            trend="up"
            trendValue="+3 from last month"
          />
          <EnhancedStatCard
            title="Avg. Completion"
            value="28 days"
            subtitle="45-day period average"
            icon={CalendarIcon}
            color="blue"
            trend="down"
            trendValue="-2 days improved"
          />
          <EnhancedStatCard
            title="Client Satisfaction"
            value="4.8/5"
            subtitle="Average rating"
            icon={ArrowTrendingUpIcon}
            color="green"
            trend="up"
            trendValue="+0.2 this quarter"
          />
          <EnhancedStatCard
            title="Active Workload"
            value="78%"
            subtitle="Team capacity"
            icon={UsersIcon}
            color="yellow"
            trend="neutral"
            trendValue="Optimal range"
          />
        </div>
      </div>
    </div>
  );

  return (
    <StandardDashboard
      role="coordinator"
      customContent={customOverviewContent}
    />
  );
};

export default StandardizedCoordinatorDashboard;