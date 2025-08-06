import React from 'react';

// Enhanced StatCard combining best features from all dashboard implementations
export interface EnhancedStatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo' | 'pink' | 'gray';
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  urgent?: boolean;
  onClick?: () => void;
  className?: string;
}

export const EnhancedStatCard: React.FC<EnhancedStatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
  trendValue,
  urgent = false,
  onClick,
  className = ''
}) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    yellow: 'text-yellow-600 bg-yellow-50',
    red: 'text-red-600 bg-red-50',
    purple: 'text-purple-600 bg-purple-50',
    indigo: 'text-indigo-600 bg-indigo-50',
    pink: 'text-pink-600 bg-pink-50',
    gray: 'text-gray-600 bg-gray-50'
  };

  const iconColorClasses = {
    blue: 'text-blue-200',
    green: 'text-green-200',
    yellow: 'text-yellow-200',
    red: 'text-red-200',
    purple: 'text-purple-200',
    indigo: 'text-indigo-200',
    pink: 'text-pink-200',
    gray: 'text-gray-200'
  };

  const getTrendIcon = () => {
    if (trend === 'up') return '↗';
    if (trend === 'down') return '↘';
    return '→';
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm border p-6 ${
        urgent 
          ? 'border-red-200 bg-red-50' 
          : 'border-gray-200'
      } ${
        onClick ? 'cursor-pointer hover:shadow-md transition-shadow duration-200' : 'hover:shadow-md transition-shadow duration-200'
      } ${className}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className={`text-sm font-medium ${
            urgent ? 'text-red-700' : 'text-gray-600'
          }`}>
            {title}
          </p>
          <p className={`text-3xl font-bold ${colorClasses[color].split(' ')[0]}`}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && trendValue && (
            <div className={`flex items-center text-xs mt-1 ${getTrendColor()}`}>
              <span className="mr-1">{getTrendIcon()}</span>
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className="flex-shrink-0">
          <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} flex items-center justify-center`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>
  );
};

// QuickAction component from EnhancedAdminDashboard (best implementation)
export interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  onClick: () => void;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo' | 'pink' | 'gray';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export const QuickAction: React.FC<QuickActionProps> = ({
  title,
  description,
  icon: Icon,
  onClick,
  color,
  disabled = false,
  loading = false,
  className = ''
}) => {
  const colorClasses = {
    blue: 'hover:border-blue-200 text-blue-600',
    green: 'hover:border-green-200 text-green-600',
    yellow: 'hover:border-yellow-200 text-yellow-600',
    red: 'hover:border-red-200 text-red-600',
    purple: 'hover:border-purple-200 text-purple-600',
    indigo: 'hover:border-indigo-200 text-indigo-600',
    pink: 'hover:border-pink-200 text-pink-600',
    gray: 'hover:border-gray-200 text-gray-600'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-left hover:shadow-md transition-all duration-200 ${colorClasses[color]} disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <div className="flex items-center space-x-3">
        {loading ? (
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
        ) : (
          <Icon className="w-8 h-8" />
        )}
        <div>
          <h3 className="text-sm font-medium text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>
    </button>
  );
};

// Standard Dashboard Layout Component
export interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  sidebar?: React.ReactNode;
  className?: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title,
  subtitle,
  headerActions,
  sidebar,
  className = ''
}) => {
  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              {subtitle && (
                <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
              )}
            </div>
            {headerActions && (
              <div className="flex items-center space-x-3">
                {headerActions}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {sidebar ? (
          <div className="flex gap-8">
            {/* Sidebar */}
            <div className="w-80 flex-shrink-0">
              {sidebar}
            </div>
            {/* Main content */}
            <div className="flex-1 min-w-0">
              {children}
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

// Standard Tab Navigation
export interface TabItem {
  id: string;
  name: string;
  count?: number;
  disabled?: boolean;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

export interface TabNavigationProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className = ''
}) => {
  return (
    <div className={`border-b border-gray-200 ${className}`}>
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && onTabChange(tab.id)}
            disabled={tab.disabled}
            className={`
              whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 
              ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : tab.disabled
                  ? 'border-transparent text-gray-400 cursor-not-allowed'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
              transition-colors duration-200
            `}
          >
            {tab.icon && (
              <tab.icon className="w-4 h-4" />
            )}
            <span>{tab.name}</span>
            {tab.count !== undefined && (
              <span className={`
                ml-2 py-0.5 px-2 rounded-full text-xs 
                ${
                  activeTab === tab.id 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-gray-100 text-gray-600'
                }
              `}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};

// Loading Skeleton for dashboard components
export const DashboardSkeleton: React.FC<{ cards?: number }> = ({ cards = 4 }) => {
  return (
    <div className="space-y-6">
      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Content Skeleton */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Error State Component
export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Something went wrong",
  message,
  onRetry,
  className = ''
}) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center ${className}`}>
      <div className="w-12 h-12 mx-auto mb-4 flex items-center justify-center rounded-full bg-red-100">
        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Try Again
        </button>
      )}
    </div>
  );
};