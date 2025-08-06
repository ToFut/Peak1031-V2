import React, { ReactNode } from 'react';
import { clsx } from 'clsx';

interface DashboardCardProps {
  title: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
  loading?: boolean;
  error?: string | null;
  icon?: ReactNode;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  children,
  className,
  actions,
  loading = false,
  error = null,
  icon,
}) => {
  return (
    <div className={clsx(
      "bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden",
      className
    )}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {icon && (
              <div className="flex-shrink-0 text-gray-600">
                {icon}
              </div>
            )}
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          {actions && (
            <div className="flex items-center space-x-2">
              {actions}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading && (
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        
        {!loading && !error && children}
      </div>
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: string | number;
  change?: {
    value: string | number;
    type: 'increase' | 'decrease' | 'neutral';
  };
  icon?: ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
  loading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  change,
  icon,
  color = 'blue',
  loading = false,
}) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
  };

  const changeColors = {
    increase: 'text-green-600',
    decrease: 'text-red-600',
    neutral: 'text-gray-600',
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-1"></div>
        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {change && (
            <div className={clsx("flex items-center text-sm mt-2", changeColors[change.type])}>
              <span className="flex items-center">
                {change.type === 'increase' && '↗'}
                {change.type === 'decrease' && '↘'}
                {change.type === 'neutral' && '→'}
                <span className="ml-1">{change.value}</span>
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className={clsx(
            "flex-shrink-0 p-3 rounded-lg border",
            colorClasses[color]
          )}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};