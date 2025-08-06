import React from 'react';
import { DashboardCard } from './DashboardCard';
import Badge from '../../ui/atoms/Badge';
import { useDashboard } from './DashboardProvider';
import { 
  BuildingOfficeIcon, 
  CalendarIcon, 
  CurrencyDollarIcon,
  UserIcon,
  ChartBarIcon 
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';

interface ExchangeWidgetProps {
  userRole: string;
  variant?: 'list' | 'grid' | 'table';
  maxItems?: number;
  showActions?: boolean;
}

export const ExchangeWidget: React.FC<ExchangeWidgetProps> = ({
  userRole,
  variant = 'list',
  maxItems = 5,
  showActions = true,
}) => {
  const { data, refetch } = useDashboard();
  const { exchanges, loading, error } = data;

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
      case '45D':
      case '180D':
        return 'info';
      case 'PENDING':
        return 'warning';
      case 'COMPLETED':
        return 'success';
      case 'TERMINATED':
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case 'HIGH':
      case 'URGENT':
        return 'error';
      case 'MEDIUM':
        return 'warning';
      case 'LOW':
        return 'success';
      default:
        return 'default';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getExchangesForRole = () => {
    const displayExchanges = exchanges.slice(0, maxItems);
    
    switch (userRole) {
      case 'admin':
        return displayExchanges; // Admin sees all exchanges
      case 'coordinator':
        return displayExchanges.filter(ex => ex.coordinatorId === data.stats.totalUsers); // Mock filter
      case 'client':
        return displayExchanges.filter(ex => ex.clientId === data.stats.totalUsers); // Mock filter
      default:
        return displayExchanges;
    }
  };

  const roleSpecificExchanges = getExchangesForRole();

  const actions = showActions && (
    <div className="flex space-x-2">
      <button
        onClick={() => refetch()}
        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
      >
        Refresh
      </button>
      <button className="text-sm text-gray-600 hover:text-gray-800 font-medium">
        View All
      </button>
    </div>
  );

  const renderExchangeList = () => (
    <div className="space-y-4">
      {roleSpecificExchanges.map((exchange) => (
        <div
          key={exchange.id}
          className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-2">
                <h4 className="text-sm font-semibold text-gray-900 truncate">
                  #{exchange.exchangeNumber}
                </h4>
                <Badge variant={getStatusColor(exchange.status)}>
                  {exchange.status}
                </Badge>
                {exchange.priority && (
                  <Badge variant={getPriorityColor(exchange.priority)} size="sm">
                    {exchange.priority}
                  </Badge>
                )}
              </div>
              
              <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                {exchange.exchangeName || exchange.name}
              </p>
              
              <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                {exchange.clientName && (
                  <div className="flex items-center">
                    <UserIcon className="w-4 h-4 mr-1" />
                    {exchange.clientName}
                  </div>
                )}
                {exchange.exchangeValue && (
                  <div className="flex items-center">
                    <CurrencyDollarIcon className="w-4 h-4 mr-1" />
                    {formatCurrency(exchange.exchangeValue)}
                  </div>
                )}
                {exchange.identificationDeadline && (
                  <div className="flex items-center">
                    <CalendarIcon className="w-4 h-4 mr-1" />
                    Due: {formatDate(exchange.identificationDeadline)}
                  </div>
                )}
                {exchange.exchangeType && (
                  <div className="flex items-center">
                    <BuildingOfficeIcon className="w-4 h-4 mr-1" />
                    {exchange.exchangeType}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
      
      {roleSpecificExchanges.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          <BuildingOfficeIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No exchanges found</p>
        </div>
      )}
    </div>
  );

  const renderExchangeGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {roleSpecificExchanges.map((exchange) => (
        <div
          key={exchange.id}
          className="p-4 border border-gray-200 rounded-lg hover:shadow-md cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900 text-sm">
              #{exchange.exchangeNumber}
            </h4>
            <Badge variant={getStatusColor(exchange.status)} size="sm">
              {exchange.status}
            </Badge>
          </div>
          
          <p className="text-sm text-gray-700 mb-3 line-clamp-2">
            {exchange.exchangeName || exchange.name}
          </p>
          
          <div className="space-y-2 text-xs text-gray-600">
            {exchange.exchangeValue && (
              <div className="flex justify-between">
                <span>Value:</span>
                <span className="font-medium">{formatCurrency(exchange.exchangeValue)}</span>
              </div>
            )}
            {exchange.identificationDeadline && (
              <div className="flex justify-between">
                <span>Deadline:</span>
                <span className="font-medium">{formatDate(exchange.identificationDeadline)}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderExchangeTable = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Exchange
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Value
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Deadline
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {roleSpecificExchanges.map((exchange) => (
            <tr key={exchange.id} className="hover:bg-gray-50 cursor-pointer">
              <td className="px-4 py-3 whitespace-nowrap">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    #{exchange.exchangeNumber}
                  </div>
                  <div className="text-sm text-gray-500 truncate max-w-xs">
                    {exchange.exchangeName || exchange.name}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <Badge variant={getStatusColor(exchange.status)} size="sm">
                  {exchange.status}
                </Badge>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {exchange.exchangeValue ? formatCurrency(exchange.exchangeValue) : '—'}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {exchange.identificationDeadline ? formatDate(exchange.identificationDeadline) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderContent = () => {
    switch (variant) {
      case 'grid':
        return renderExchangeGrid();
      case 'table':
        return renderExchangeTable();
      default:
        return renderExchangeList();
    }
  };

  const getTitle = () => {
    switch (userRole) {
      case 'admin':
        return 'All Exchanges';
      case 'coordinator':
        return 'Assigned Exchanges';
      case 'client':
        return 'My Exchanges';
      case 'agency':
        return 'Agency Exchanges';
      case 'third_party':
        return 'Third Party Exchanges';
      default:
        return 'Exchanges';
    }
  };

  return (
    <DashboardCard
      title={getTitle()}
      loading={loading}
      error={error}
      actions={actions}
      icon={<ChartBarIcon className="w-5 h-5" />}
    >
      {renderContent()}
    </DashboardCard>
  );
};