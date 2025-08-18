import React, { useState, useMemo } from 'react';
import { 
  XMarkIcon,
  FunnelIcon,
  CalendarIcon,
  UserIcon,
  FlagIcon,
  TagIcon,
  BookmarkIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

import { Task } from '../../../types';

interface SmartFiltersProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
  onClose: () => void;
  tasks: Task[];
}

interface SavedView {
  id: string;
  name: string;
  filters: any;
  isDefault?: boolean;
}

export const SmartFilters: React.FC<SmartFiltersProps> = ({
  filters,
  onFiltersChange,
  onClose,
  tasks
}) => {
  const [activeTab, setActiveTab] = useState<'filters' | 'views'>('filters');
  const [savedViews, setSavedViews] = useState<SavedView[]>([
    { id: 'all', name: 'All Tasks', filters: {}, isDefault: true },
    { id: 'my-tasks', name: 'My Tasks', filters: { assignee: ['me'] } },
    { id: 'overdue', name: 'Overdue', filters: { timeframe: 'overdue' } },
    { id: 'this-week', name: 'Due This Week', filters: { timeframe: 'thisWeek' } }
  ]);
  const [newViewName, setNewViewName] = useState('');
  const [showSaveView, setShowSaveView] = useState(false);

  // Calculate filter statistics
  const filterStats = useMemo(() => {
    const stats = {
      status: {} as Record<string, number>,
      priority: {} as Record<string, number>,
      assignee: {} as Record<string, number>,
      timeframe: {
        overdue: 0,
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        noDate: 0
      }
    };

    tasks.forEach(task => {
      // Status stats
      const status = task.status || 'PENDING';
      stats.status[status] = (stats.status[status] || 0) + 1;

      // Priority stats
      const priority = task.priority || 'MEDIUM';
      stats.priority[priority] = (stats.priority[priority] || 0) + 1;

      // Assignee stats
      const assignee = task.assignedUser 
        ? `${task.assignedUser.first_name} ${task.assignedUser.last_name}`.trim()
        : task.assignedTo || 'Unassigned';
      stats.assignee[assignee] = (stats.assignee[assignee] || 0) + 1;

      // Timeframe stats
      const dueDate = task.due_date || task.dueDate;
      if (!dueDate) {
        stats.timeframe.noDate++;
      } else {
        const date = new Date(dueDate);
        const now = new Date();
        const diffTime = date.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0 && task.status !== 'COMPLETED') {
          stats.timeframe.overdue++;
        } else if (diffDays === 0) {
          stats.timeframe.today++;
        } else if (diffDays <= 7) {
          stats.timeframe.thisWeek++;
        } else if (diffDays <= 30) {
          stats.timeframe.thisMonth++;
        }
      }
    });

    return stats;
  }, [tasks]);

  // Handle filter changes
  const updateFilter = (key: string, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleArrayFilter = (key: string, value: string) => {
    const current = filters[key] || [];
    const updated = current.includes(value)
      ? current.filter((v: string) => v !== value)
      : [...current, value];
    updateFilter(key, updated.length > 0 ? updated : undefined);
  };

  // Save current filters as a view
  const saveCurrentView = () => {
    if (!newViewName.trim()) return;

    const newView: SavedView = {
      id: `custom-${Date.now()}`,
      name: newViewName.trim(),
      filters: { ...filters }
    };

    setSavedViews(prev => [...prev, newView]);
    setNewViewName('');
    setShowSaveView(false);
  };

  // Load saved view
  const loadSavedView = (view: SavedView) => {
    onFiltersChange(view.filters);
  };

  // Clear all filters
  const clearAllFilters = () => {
    onFiltersChange({});
  };

  // Quick filter presets
  const quickFilters = [
    {
      name: 'Overdue Tasks',
      icon: ClockIcon,
      color: 'text-red-600 bg-red-50 border-red-200',
      filters: { timeframe: 'overdue' },
      count: filterStats.timeframe.overdue
    },
    {
      name: 'Due Today',
      icon: CalendarIcon,
      color: 'text-orange-600 bg-orange-50 border-orange-200',
      filters: { timeframe: 'today' },
      count: filterStats.timeframe.today
    },
    {
      name: 'High Priority',
      icon: FlagIcon,
      color: 'text-red-600 bg-red-50 border-red-200',
      filters: { priority: ['HIGH'] },
      count: filterStats.priority.HIGH || 0
    },
    {
      name: 'In Progress',
      icon: UserIcon,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      filters: { status: ['IN_PROGRESS'] },
      count: filterStats.status.IN_PROGRESS || 0
    }
  ];

  const hasActiveFilters = Object.values(filters).some(value => value);

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <FunnelIcon className="w-5 h-5" />
              Smart Filters
            </h3>
            
            {/* Tab Navigation */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('filters')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'filters'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Filters
              </button>
              <button
                onClick={() => setActiveTab('views')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'views'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Saved Views
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Clear all
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-4">
        {activeTab === 'filters' ? (
          <div className="space-y-6">
            {/* Quick Filters */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Filters</h4>
              <div className="flex flex-wrap gap-2">
                {quickFilters.map((quickFilter) => (
                  <button
                    key={quickFilter.name}
                    onClick={() => onFiltersChange(quickFilter.filters)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      quickFilter.color
                    }`}
                  >
                    <quickFilter.icon className="w-4 h-4" />
                    <span>{quickFilter.name}</span>
                    {quickFilter.count > 0 && (
                      <span className="px-1.5 py-0.5 bg-white rounded text-xs">
                        {quickFilter.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Detailed Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Status Filter */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Status</h4>
                <div className="space-y-2">
                  {Object.entries(filterStats.status).map(([status, count]) => (
                    <label key={status} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={(filters.status || []).includes(status)}
                        onChange={() => toggleArrayFilter('status', status)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="flex-1">
                        {status === 'PENDING' ? 'To Do' : 
                         status === 'IN_PROGRESS' ? 'In Progress' : 
                         status}
                      </span>
                      <span className="text-gray-500">({count})</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Priority Filter */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Priority</h4>
                <div className="space-y-2">
                  {Object.entries(filterStats.priority).map(([priority, count]) => (
                    <label key={priority} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={(filters.priority || []).includes(priority)}
                        onChange={() => toggleArrayFilter('priority', priority)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="flex-1">{priority}</span>
                      <span className="text-gray-500">({count})</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Assignee Filter */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Assignee</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {Object.entries(filterStats.assignee).map(([assignee, count]) => (
                    <label key={assignee} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={(filters.assignee || []).includes(assignee)}
                        onChange={() => toggleArrayFilter('assignee', assignee)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="flex-1 truncate">{assignee}</span>
                      <span className="text-gray-500">({count})</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Time Frame Filter */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Due Date</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="timeframe"
                      checked={filters.timeframe === 'overdue'}
                      onChange={() => updateFilter('timeframe', 'overdue')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="flex-1">Overdue</span>
                    <span className="text-gray-500">({filterStats.timeframe.overdue})</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="timeframe"
                      checked={filters.timeframe === 'today'}
                      onChange={() => updateFilter('timeframe', 'today')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="flex-1">Due Today</span>
                    <span className="text-gray-500">({filterStats.timeframe.today})</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="timeframe"
                      checked={filters.timeframe === 'thisWeek'}
                      onChange={() => updateFilter('timeframe', 'thisWeek')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="flex-1">This Week</span>
                    <span className="text-gray-500">({filterStats.timeframe.thisWeek})</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="timeframe"
                      checked={filters.timeframe === 'thisMonth'}
                      onChange={() => updateFilter('timeframe', 'thisMonth')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="flex-1">This Month</span>
                    <span className="text-gray-500">({filterStats.timeframe.thisMonth})</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="timeframe"
                      checked={!filters.timeframe}
                      onChange={() => updateFilter('timeframe', undefined)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="flex-1">All</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Save View */}
            {hasActiveFilters && (
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowSaveView(!showSaveView)}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    <BookmarkIcon className="w-4 h-4" />
                    Save as View
                  </button>
                  
                  {showSaveView && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="View name"
                        value={newViewName}
                        onChange={(e) => setNewViewName(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={saveCurrentView}
                        disabled={!newViewName.trim()}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Saved Views */
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700">Saved Views</h4>
              <span className="text-xs text-gray-500">{savedViews.length} views</span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {savedViews.map((view) => (
                <button
                  key={view.id}
                  onClick={() => loadSavedView(view)}
                  className="p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <BookmarkIcon className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-sm text-gray-900">{view.name}</span>
                    {view.isDefault && (
                      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {Object.keys(view.filters).length === 0 
                      ? 'No filters' 
                      : `${Object.keys(view.filters).length} filter${Object.keys(view.filters).length !== 1 ? 's' : ''}`
                    }
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};