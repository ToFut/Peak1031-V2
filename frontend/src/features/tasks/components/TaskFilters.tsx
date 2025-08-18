import React, { useState } from 'react';
import { FunnelIcon, ClockIcon, CheckCircleIcon, ExclamationTriangleIcon, UserIcon } from '@heroicons/react/24/outline';

interface TaskFiltersProps {
  activeFilters: {
    status?: string;
    priority?: string;
    assignee?: string;
    timeframe?: string;
  };
  onFilterChange: (filters: any) => void;
  taskCounts?: {
    total: number;
    overdue: number;
    today: number;
    thisWeek: number;
    mine: number;
  };
}

export const TaskFilters: React.FC<TaskFiltersProps> = ({ 
  activeFilters, 
  onFilterChange,
  taskCounts = { total: 0, overdue: 0, today: 0, thisWeek: 0, mine: 0 }
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const quickFilters = [
    {
      key: 'overdue',
      label: 'Overdue',
      count: taskCounts.overdue,
      icon: ExclamationTriangleIcon,
      color: 'text-red-600 bg-red-50 border-red-200',
      action: () => onFilterChange({ ...activeFilters, timeframe: 'overdue' })
    },
    {
      key: 'today',
      label: 'Due Today',
      count: taskCounts.today,
      icon: ClockIcon,
      color: 'text-orange-600 bg-orange-50 border-orange-200',
      action: () => onFilterChange({ ...activeFilters, timeframe: 'today' })
    },
    {
      key: 'thisWeek',
      label: 'This Week',
      count: taskCounts.thisWeek,
      icon: ClockIcon,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      action: () => onFilterChange({ ...activeFilters, timeframe: 'thisWeek' })
    },
    {
      key: 'mine',
      label: 'Assigned to Me',
      count: taskCounts.mine,
      icon: UserIcon,
      color: 'text-purple-600 bg-purple-50 border-purple-200',
      action: () => onFilterChange({ ...activeFilters, assignee: 'me' })
    }
  ];

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'PENDING', label: 'To Do' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'BLOCKED', label: 'Blocked' }
  ];

  const priorityOptions = [
    { value: '', label: 'All Priorities' },
    { value: 'HIGH', label: 'High Priority' },
    { value: 'MEDIUM', label: 'Medium Priority' },
    { value: 'LOW', label: 'Low Priority' }
  ];

  const clearAllFilters = () => {
    onFilterChange({});
  };

  const hasActiveFilters = Object.values(activeFilters).some(value => value);

  return (
    <div className="bg-white border-b border-gray-200">
      {/* Quick Filters */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-700">Quick Filters</h3>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear all
            </button>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2">
          {quickFilters.map((filter) => (
            <button
              key={filter.key}
              onClick={filter.action}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                activeFilters.timeframe === filter.key || activeFilters.assignee === filter.key
                  ? filter.color
                  : 'text-gray-600 bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <filter.icon className="w-3.5 h-3.5" />
              <span>{filter.label}</span>
              {filter.count > 0 && (
                <span className="px-1.5 py-0.5 bg-white rounded text-xs font-medium">
                  {filter.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="p-4">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 mb-3"
        >
          <FunnelIcon className="w-4 h-4" />
          <span>Advanced Filters</span>
          <span className={`transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select
                value={activeFilters.status || ''}
                onChange={(e) => onFilterChange({ ...activeFilters, status: e.target.value || undefined })}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={activeFilters.priority || ''}
                onChange={(e) => onFilterChange({ ...activeFilters, priority: e.target.value || undefined })}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {priorityOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Time Frame</label>
              <select
                value={activeFilters.timeframe || ''}
                onChange={(e) => onFilterChange({ ...activeFilters, timeframe: e.target.value || undefined })}
                className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Time</option>
                <option value="overdue">Overdue</option>
                <option value="today">Due Today</option>
                <option value="tomorrow">Due Tomorrow</option>
                <option value="thisWeek">This Week</option>
                <option value="nextWeek">Next Week</option>
                <option value="thisMonth">This Month</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};