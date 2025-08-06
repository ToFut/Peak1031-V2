import React, { useMemo } from 'react';
import { Exchange } from '../../../types';
import { Calendar, DollarSign, User, Clock, Star, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react';

interface ExchangeCardProps {
  exchange: Exchange;
  onClick?: () => void;
  selected?: boolean;
  showProgress?: boolean;
  compact?: boolean;
}

export const ExchangeCard: React.FC<ExchangeCardProps> = ({ 
  exchange, 
  onClick, 
  selected, 
  showProgress = true,
  compact = false 
}) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PENDING':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: Clock,
          label: 'Pending'
        };
      case '45D':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: TrendingUp,
          label: '45-Day Period'
        };
      case '180D':
        return {
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: AlertTriangle,
          label: '180-Day Period'
        };
      case 'COMPLETED':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: CheckCircle,
          label: 'Completed'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: Clock,
          label: status
        };
    }
  };

  // Memoize calculations for performance
  const calculations = useMemo(() => {
    const statusConfig = getStatusConfig(exchange.status);
    const startDate = exchange.startDate ? new Date(exchange.startDate).toLocaleDateString() : null;
    const completionDate = exchange.completionDate ? new Date(exchange.completionDate).toLocaleDateString() : null;
    
    // Calculate progress based on tasks or use exchange.progress if available
    const progress = exchange.progress || 0;
    
    // Format exchange value
    const formattedValue = exchange.exchangeValue ? 
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(exchange.exchangeValue) : 
      null;
    
    return {
      statusConfig,
      startDate,
      completionDate,
      progress,
      formattedValue
    };
  }, [exchange]);

  const clientName = exchange.client ? 
    `${exchange.client.firstName || ''} ${exchange.client.lastName || ''}`.trim() || 'Unknown Client' :
    'Unknown Client';

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm border transition-all hover:shadow-lg cursor-pointer ${
        selected ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200' : 'hover:border-gray-300'
      } ${compact ? 'p-4' : 'p-6'}`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center mb-2">
            <h3 className={`font-semibold text-gray-900 truncate ${
              compact ? 'text-base' : 'text-xl'
            }`}>
              {exchange.name || clientName}
            </h3>
            
            {exchange.ppMatterId && (
              <div className="ml-2 flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                {!compact && (
                  <span className="ml-1 text-xs text-green-600 font-medium">PP</span>
                )}
              </div>
            )}
          </div>
          
          {/* Client info */}
          <div className="flex items-center text-sm text-gray-600 mb-2">
            <User className="w-4 h-4 mr-2 text-gray-400" />
            <span className="truncate">{clientName}</span>
            {exchange.client?.company && (
              <span className="ml-2 text-xs text-gray-500">• {exchange.client.company}</span>
            )}
          </div>
          
          {/* Dates and value */}
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            {calculations.startDate && (
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                <span>Started: {calculations.startDate}</span>
              </div>
            )}
            
            {calculations.formattedValue && (
              <div className="flex items-center">
                <DollarSign className="w-4 h-4 mr-1 text-gray-400" />
                <span className="font-medium">{calculations.formattedValue}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Status badge */}
        <div className="ml-4 flex-shrink-0">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
            calculations.statusConfig.color
          }`}>
            <calculations.statusConfig.icon className="w-3 h-3 mr-1" />
            {calculations.statusConfig.label}
          </div>
        </div>
      </div>
      
      {/* Progress bar */}
      {showProgress && !compact && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Progress</span>
            <span className="text-xs text-gray-600 font-medium">{calculations.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${Math.min(100, Math.max(0, calculations.progress))}%` }}
            ></div>
          </div>
        </div>
      )}
      
      {/* Footer with coordinator */}
      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between text-sm">
          {exchange.coordinator ? (
            <div className="flex items-center text-gray-600">
              <span className="text-gray-500">Coordinator:</span>
              <span className="ml-1 font-medium">
                {exchange.coordinator.first_name} {exchange.coordinator.last_name}
              </span>
            </div>
          ) : (
            <div className="text-gray-400 text-xs">No coordinator assigned</div>
          )}
          
          {calculations.completionDate && (
            <div className="flex items-center text-xs text-gray-500">
              <CheckCircle className="w-3 h-3 mr-1" />
              <span>Completed: {calculations.completionDate}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* PP Sync indicator */}
      {exchange.lastSyncAt && (
        <div className="mt-2 pt-2 border-t border-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Last synced: {new Date(exchange.lastSyncAt).toLocaleDateString()}</span>
            <Star className="w-3 h-3 text-yellow-500" />
          </div>
        </div>
      )}
      
      {/* Metadata tags */}
      {exchange.metadata && Object.keys(exchange.metadata).length > 0 && !compact && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex flex-wrap gap-1">
            {Object.entries(exchange.metadata).slice(0, 3).map(([key, value]) => (
              <span key={key} className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
                {key}: {String(value)}
              </span>
            ))}
            {Object.keys(exchange.metadata).length > 3 && (
              <span className="text-xs text-gray-400">+{Object.keys(exchange.metadata).length - 3} more</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};