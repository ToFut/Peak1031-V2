import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color = 'blue',
  className = ''
}) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    yellow: 'text-yellow-600 bg-yellow-50',
    red: 'text-red-600 bg-red-50',
    purple: 'text-purple-600 bg-purple-50',
    gray: 'text-gray-600 bg-gray-50'
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
    <div className={`bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-200 ${className}`}>
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center`}>
              <Icon className="w-5 h-5" />
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd className="text-2xl font-bold text-gray-900">
                {value}
              </dd>
            </dl>
          </div>
        </div>
      </div>
      {(subtitle || trend) && (
        <div className="bg-gray-50 px-5 py-3">
          <div className="text-sm flex items-center justify-between">
            {subtitle && (
              <span className="text-gray-600">{subtitle}</span>
            )}
            {trend && trendValue && (
              <span className={`flex items-center ${getTrendColor()}`}>
                <span className="mr-1">{getTrendIcon()}</span>
                {trendValue}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatCard;