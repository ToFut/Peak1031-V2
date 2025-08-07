import React from 'react';
import { Eye, Users, CheckSquare, FileText, MessageSquare, BarChart3, Shield, Activity, Clock } from 'lucide-react';

export type TabId = 'overview' | 'members' | 'tasks' | 'documents' | 'financial' | 'compliance' | 'chat' | 'timeline' | 'audit';

interface Tab {
  id: TabId;
  label: string;
  icon: React.FC<{ className?: string }>;
}

interface ExchangeTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  showEnterpriseFeatures?: boolean;
}

export const ExchangeTabs: React.FC<ExchangeTabsProps> = ({
  activeTab,
  onTabChange,
  showEnterpriseFeatures = false
}) => {
  const tabs: Tab[] = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'documents', label: 'Documents', icon: FileText },
    ...(showEnterpriseFeatures ? [
      { id: 'financial' as TabId, label: 'Financial', icon: BarChart3 },
      { id: 'compliance' as TabId, label: 'Compliance', icon: Shield }
    ] : []),
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'timeline', label: 'Timeline', icon: Activity },
    { id: 'audit', label: 'Audit Log', icon: Clock }
  ];

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};