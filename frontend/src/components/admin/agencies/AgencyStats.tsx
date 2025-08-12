/**
 * Agency Stats Component
 * Display agency statistics overview
 */

import React from 'react';
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { formatCurrency } from '../../../utils/agencyUtils';

interface AgencyStatsProps {
  summary: {
    total: number;
    active: number;
    inactive: number;
    totalThirdParties: number;
    totalExchanges: number;
    totalValue: number;
    averagePerformance: number;
  };
}

const AgencyStats: React.FC<AgencyStatsProps> = ({ summary }) => {
  const stats = [
    {
      name: 'Total Agencies',
      value: summary.total,
      subtext: `${summary.active} active, ${summary.inactive} inactive`,
      icon: BuildingOfficeIcon,
      color: 'blue',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      iconColor: 'text-blue-600'
    },
    {
      name: 'Third Parties',
      value: summary.totalThirdParties,
      subtext: 'Total assigned',
      icon: UserGroupIcon,
      color: 'purple',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      iconColor: 'text-purple-600'
    },
    {
      name: 'Total Exchanges',
      value: summary.totalExchanges,
      subtext: 'All agencies',
      icon: ChartBarIcon,
      color: 'green',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      iconColor: 'text-green-600'
    },
    {
      name: 'Total Value',
      value: formatCurrency(summary.totalValue),
      subtext: 'Combined portfolio',
      icon: CurrencyDollarIcon,
      color: 'yellow',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-600',
      iconColor: 'text-yellow-600'
    },
    {
      name: 'Avg Performance',
      value: `${Math.round(summary.averagePerformance)}%`,
      subtext: 'Agency average',
      icon: CheckCircleIcon,
      color: 'indigo',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-600',
      iconColor: 'text-indigo-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {stats.map((stat) => (
        <div key={stat.name} className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-5">
            <div className="flex items-center">
              <div className={`flex-shrink-0 ${stat.bgColor} rounded-md p-3`}>
                <stat.icon className={`h-6 w-6 ${stat.iconColor}`} aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                  <dd className="flex items-baseline">
                    <div className={`text-2xl font-semibold ${stat.textColor}`}>
                      {stat.value}
                    </div>
                  </dd>
                  {stat.subtext && (
                    <dd className="text-xs text-gray-500 mt-1">{stat.subtext}</dd>
                  )}
                </dl>
              </div>
            </div>
          </div>
          <div className={`${stat.bgColor} px-5 py-1`}>
            <div className="text-xs">
              <span className={`font-medium ${stat.textColor}`}>
                {/* Additional stat info could go here */}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AgencyStats;