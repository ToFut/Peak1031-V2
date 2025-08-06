import React from 'react';
import { useRolePermissions } from '../../hooks/useRolePermissions';

export interface TabDefinition {
  id: string;
  name: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  hidden?: boolean;
}

interface DashboardTabsProps {
  tabs: TabDefinition[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const DashboardTabs: React.FC<DashboardTabsProps> = ({
  tabs,
  activeTab,
  onTabChange
}) => {
  const { getSidebarItems } = useRolePermissions();
  const allowedItems = getSidebarItems();

  const visibleTabs = tabs.filter(tab => 
    !tab.hidden && (allowedItems.includes(tab.id) || tab.id === 'overview')
  );

  return (
    <div className="border-b border-gray-200">
      <nav className="flex space-x-8">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            <span>{tab.name}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};