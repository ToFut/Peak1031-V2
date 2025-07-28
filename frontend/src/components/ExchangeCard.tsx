import React from 'react';
import { Exchange } from '../types';

interface ExchangeCardProps {
  exchange: Exchange;
  onClick?: () => void;
  selected?: boolean;
}

export const ExchangeCard: React.FC<ExchangeCardProps> = ({ exchange, onClick, selected }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case '45D':
        return 'bg-blue-100 text-blue-800';
      case '180D':
        return 'bg-orange-100 text-orange-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Pending';
      case '45D':
        return '45-Day Period';
      case '180D':
        return '180-Day Period';
      case 'COMPLETED':
        return 'Completed';
      default:
        return status;
    }
  };

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm border p-6 cursor-pointer transition-all hover:shadow-md ${
        selected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {exchange.name}
          </h3>
          
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            {exchange.startDate && (
              <div className="flex items-center">
                <span className="mr-1">📅</span>
                <span>Started: {new Date(exchange.startDate).toLocaleDateString()}</span>
              </div>
            )}
            
            {exchange.completionDate && (
              <div className="flex items-center">
                <span className="mr-1">✅</span>
                <span>Completed: {new Date(exchange.completionDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="ml-4">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(exchange.status)}`}>
            {getStatusLabel(exchange.status)}
          </span>
        </div>
      </div>
      
      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-gray-600">
            <span className="mr-1">👤</span>
            <span>
              {exchange.client?.firstName} {exchange.client?.lastName}
            </span>
          </div>
          
          {exchange.coordinator && (
            <div className="flex items-center text-gray-600">
              <span className="mr-1">Coordinator:</span>
              <span>{exchange.coordinator.firstName} {exchange.coordinator.lastName}</span>
            </div>
          )}
        </div>
      </div>
      
      {exchange.metadata && Object.keys(exchange.metadata).length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex flex-wrap gap-2">
            {Object.entries(exchange.metadata).map(([key, value]) => (
              <span key={key} className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700">
                {key}: {String(value)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 