import React from 'react';

export interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo' | 'pink' | 'gray';
  trend?: string;
  urgent?: boolean;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
  urgent = false,
  onClick
}) => {
  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
    purple: 'text-purple-600',
    indigo: 'text-indigo-600',
    pink: 'text-pink-600',
    gray: 'text-gray-600'
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

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm border p-6 ${
        urgent 
          ? 'border-red-200 bg-red-50' 
          : 'border-gray-200'
      } ${
        onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${
            urgent ? 'text-red-700' : 'text-gray-600'
          }`}>
            {title}
          </p>
          <p className={`text-3xl font-bold ${colorClasses[color]}`}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <p className="text-xs text-green-600 mt-1">{trend}</p>
          )}
        </div>
        <Icon className={`w-12 h-12 ${iconColorClasses[color]}`} />
      </div>
    </div>
  );
};