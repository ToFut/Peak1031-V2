import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useRolePermissions } from '../../hooks/useRolePermissions';

interface DashboardHeaderProps {
  stats?: Array<{
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    label: string;
    value: string | number;
    color?: string;
  }>;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  stats = [],
  subtitle,
  actions
}) => {
  const { user } = useAuth();
  const { getPageTitle } = useRolePermissions();

  const getRoleDisplayName = (role: string): string => {
    const roleNames = {
      admin: 'Administrator',
      client: 'Client',
      coordinator: 'Exchange Coordinator',
      third_party: 'Third Party',
      agency: 'Agency User'
    };
    return roleNames[role as keyof typeof roleNames] || role;
  };

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center space-x-6">
        {stats.map((stat, index) => (
          <React.Fragment key={index}>
            {index > 0 && <div className="h-4 w-px bg-gray-300" />}
            <div className="flex items-center space-x-2">
              <stat.icon className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-600">
                <span className={`font-semibold ${stat.color || 'text-gray-900'}`}>
                  {stat.value}
                </span>{' '}
                {stat.label}
              </span>
            </div>
          </React.Fragment>
        ))}
      </div>
      
      <div className="flex items-center space-x-3">
        {actions}
        <span className="text-sm text-gray-600">
          {subtitle || `${getRoleDisplayName(user?.role || '')}`}
        </span>
      </div>
    </div>
  );
};