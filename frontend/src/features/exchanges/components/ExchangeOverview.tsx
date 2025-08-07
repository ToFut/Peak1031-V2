import React from 'react';
import { Users, CheckSquare, FileText, TrendingUp, Calendar, DollarSign, Target, Shield } from 'lucide-react';
import { EnterpriseExchange, ExchangeParticipant } from '../../types/exchange-details.types';
import { Task, Document } from '../../types';
import { formatDate, formatDateTime, getDaysUntil } from '../../utils/date.utils';
import { formatExchangeValue, getExchangeStage, getRiskColorClass, getComplianceColorClass } from '../../utils/exchange.utils';

interface ExchangeOverviewProps {
  exchange: EnterpriseExchange;
  participants: ExchangeParticipant[];
  tasks: Task[];
  documents: Document[];
  exchangeStage: ReturnType<typeof getExchangeStage>;
}

export const ExchangeOverview: React.FC<ExchangeOverviewProps> = ({
  exchange,
  participants,
  tasks,
  documents,
  exchangeStage
}) => {
  const activeTasks = Array.isArray(tasks) ? tasks.filter(t => t.status === 'PENDING').length : 0;
  const completedTasks = Array.isArray(tasks) ? tasks.filter(t => t.status === 'COMPLETED').length : 0;
  const daysUntil45 = getDaysUntil(exchange.identificationDeadline);
  const daysUntil180 = getDaysUntil(exchange.exchangeDeadline);

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Members</p>
              <p className="text-2xl font-bold text-blue-900">{Array.isArray(participants) ? participants.length : 0}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Active Tasks</p>
              <p className="text-2xl font-bold text-green-900">{activeTasks}</p>
            </div>
            <CheckSquare className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Documents</p>
              <p className="text-2xl font-bold text-purple-900">{Array.isArray(documents) ? documents.length : 0}</p>
            </div>
            <FileText className="w-8 h-8 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Progress</p>
              <p className="text-2xl font-bold text-orange-900">{exchange.progress || 0}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Exchange Information */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Exchange Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-500">Exchange Type</h4>
            <p className="mt-1 text-sm text-gray-900">{exchange.exchangeType || 'Standard Exchange'}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500">Status</h4>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              exchange.status === 'Completed' || exchange.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
              exchange.status === 'In Progress' || exchange.status === '45D' || exchange.status === '180D' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {exchange.status}
            </span>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500">Start Date</h4>
            <p className="mt-1 text-sm text-gray-900">{formatDate(exchange.startDate)}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500">Exchange Value</h4>
            <p className="mt-1 text-sm text-gray-900">{formatExchangeValue(exchange.exchangeValue)}</p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500">45-Day Deadline</h4>
            <p className="mt-1 text-sm text-gray-900">
              {formatDate(exchange.identificationDeadline)}
              <span className={`ml-2 text-xs ${daysUntil45 < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                ({daysUntil45 < 0 ? `${Math.abs(daysUntil45)} days overdue` : `${daysUntil45} days remaining`})
              </span>
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500">180-Day Deadline</h4>
            <p className="mt-1 text-sm text-gray-900">
              {formatDate(exchange.exchangeDeadline)}
              <span className={`ml-2 text-xs ${daysUntil180 < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                ({daysUntil180 < 0 ? `${Math.abs(daysUntil180)} days overdue` : `${daysUntil180} days remaining`})
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Exchange Stage Progress */}
      {exchangeStage && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Exchange Stage</h3>
          <div className="flex items-center justify-between mb-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${exchangeStage.color}`}>
              {exchangeStage.stage}
            </span>
            <span className="text-sm text-gray-500">{exchangeStage.progress}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                exchangeStage.stage === '45 Days' ? 'bg-yellow-500' :
                exchangeStage.stage === '180 Days' ? 'bg-orange-500' :
                exchangeStage.stage === 'Closeup' ? 'bg-green-500' :
                'bg-gray-400'
              }`}
              style={{ width: `${exchangeStage.progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Enterprise Features */}
      {exchange.lifecycle_stage && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Risk Assessment */}
          {exchange.risk_level && (
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Risk Assessment</h3>
                <Target className="w-5 h-5 text-gray-400" />
              </div>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRiskColorClass(exchange.risk_level)}`}>
                {exchange.risk_level} Risk
              </div>
            </div>
          )}

          {/* Compliance Status */}
          {exchange.compliance_status && (
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Compliance</h3>
                <Shield className="w-5 h-5 text-gray-400" />
              </div>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getComplianceColorClass(exchange.compliance_status)}`}>
                {exchange.compliance_status.replace('_', ' ')}
              </div>
            </div>
          )}

          {/* Total Replacement Value */}
          {exchange.total_replacement_value !== undefined && (
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Replacement Value</h3>
                <DollarSign className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {formatExchangeValue(exchange.total_replacement_value)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Task Summary */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Summary</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total Tasks</span>
            <span className="font-medium">{Array.isArray(tasks) ? tasks.length : 0}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Completed</span>
            <span className="font-medium text-green-600">{completedTasks}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">In Progress</span>
            <span className="font-medium text-blue-600">{activeTasks}</span>
          </div>
        </div>
      </div>
    </div>
  );
};