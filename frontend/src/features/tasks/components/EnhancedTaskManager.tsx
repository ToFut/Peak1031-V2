/**
 * Enhanced Task Manager
 * Uses the same components and patterns as the main Tasks tab
 */

import React, { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  ClockIcon,
  SparklesIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  Squares2X2Icon,
  TableCellsIcon,
  ChartBarIcon,
  PlusIcon,
  XMarkIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { EnhancedTaskBoard } from '../../../components/tasks/EnhancedTaskBoard';
import { SmartTaskCreationModal } from '../../../components/tasks/SmartTaskCreationModal';
import { useEnhancedTasks } from '../../../hooks/useEnhancedTasks';

const EnhancedTaskManager: React.FC<{ exchangeId?: string; exchangeName?: string }> = ({ exchangeId, exchangeName }) => {
  const {
    taskStats,
    tasksByPriority,
    suggestions,
    loading,
    error
  } = useEnhancedTasks(exchangeId);

  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [compactView, setCompactView] = useState(true);

  // Auto-show suggestions for new users or when there are high-priority suggestions
  useEffect(() => {
    if (suggestions.length > 0) {
      const hasHighPriority = suggestions.some(s => s.priority === 'critical' || s.priority === 'high');
      if (hasHighPriority) {
        setShowSuggestions(true);
      }
    }
  }, [suggestions]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <SparklesIcon className="h-6 w-6 text-blue-600 mr-3" />
              Task Management
            </h2>
            <p className="mt-1 text-gray-600">
              {exchangeId ? 'Exchange-specific tasks with AI assistance' : 'AI-powered task management'}
            </p>
          </div>

          <div className="flex items-center space-x-4">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('board')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'board'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Squares2X2Icon className="h-4 w-4" />
                <span>Board</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <TableCellsIcon className="h-4 w-4" />
                <span>List</span>
              </button>
            </div>

            {/* Compact View Toggle */}
            <button
              onClick={() => setCompactView(!compactView)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
                compactView
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Squares2X2Icon className="h-4 w-4" />
              <span>Compact</span>
            </button>

            {/* AI Suggestions Toggle */}
            {suggestions.length > 0 && (
              <button
                onClick={() => setShowSuggestions(!showSuggestions)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                  showSuggestions
                    ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <LightBulbIcon className="h-4 w-4" />
                <span>{suggestions.length} AI Suggestions</span>
              </button>
            )}

            {/* Create Smart Task */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <SparklesIcon className="h-4 w-4" />
              <span>Create Smart Task</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total Tasks */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Tasks</p>
              <p className="text-3xl font-bold text-gray-900">{taskStats.total}</p>
              <p className="text-sm text-gray-500 mt-1">
                {taskStats.completionRate}% completed
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <ChartBarIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-3xl font-bold text-gray-900">{taskStats.pending}</p>
              <p className="text-sm text-gray-500 mt-1">Awaiting action</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-xl">
              <ClockIcon className="h-6 w-6 text-gray-600" />
            </div>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-3xl font-bold text-blue-600">{taskStats.inProgress}</p>
              <p className="text-sm text-gray-500 mt-1">Being worked on</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <SparklesIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Overdue Tasks */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-3xl font-bold text-red-600">{taskStats.overdue}</p>
              <p className="text-sm text-gray-500 mt-1">Need attention</p>
            </div>
            <div className="p-3 bg-red-100 rounded-xl">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Priority Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Tasks by Priority</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Critical</span>
              </div>
              <span className="font-medium">{tasksByPriority.critical || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span className="text-sm text-gray-600">High</span>
              </div>
              <span className="font-medium">{tasksByPriority.high || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Medium</span>
              </div>
              <span className="font-medium">{tasksByPriority.medium || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Low</span>
              </div>
              <span className="font-medium">{tasksByPriority.low || 0}</span>
            </div>
          </div>
        </div>

        {/* AI Features Info */}
        <div className="lg:col-span-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <SparklesIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">AI-Powered Task Management</h3>
              <p className="text-gray-600 text-sm mb-3">
                Create tasks using natural language, get smart suggestions, and auto-complete common actions.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                  Natural Language Processing
                </span>
                <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs rounded-full font-medium">
                  Auto-Complete Actions
                </span>
                <span className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                  Smart Templates
                </span>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">
                  Chat Integration
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Suggestions Panel */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-yellow-900 flex items-center">
              <LightBulbIcon className="h-5 w-5 mr-2" />
              AI Task Suggestions
            </h3>
            <button
              onClick={() => setShowSuggestions(false)}
              className="text-yellow-600 hover:text-yellow-800 text-sm"
            >
              Dismiss
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suggestions.slice(0, 6).map((suggestion, index) => (
              <div
                key={index}
                className="bg-white p-4 border border-yellow-200 rounded-lg cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() => {
                  setShowCreateModal(true);
                  // Pass suggestion data to modal
                }}
              >
                <h4 className="font-medium text-gray-900 mb-2">{suggestion.title}</h4>
                <p className="text-sm text-gray-600 mb-3">{suggestion.description}</p>
                <div className="flex items-center justify-between">
                  <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${
                    suggestion.priority === 'critical' ? 'bg-red-100 text-red-800' :
                    suggestion.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {suggestion.priority}
                  </span>
                  <span className="text-xs text-gray-500 capitalize">{suggestion.category}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      {viewMode === 'board' ? (
        <EnhancedTaskBoard
          showCompact={compactView}
          allowCreation={true}
          exchangeId={exchangeId}
        />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border">
          {/* List view would go here - can use existing TaskManager component */}
          <div className="p-8 text-center text-gray-500">
            <TableCellsIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>List view coming soon. Use Board view for now.</p>
          </div>
        </div>
      )}

      {/* Smart Task Creation Modal */}
      <SmartTaskCreationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        exchangeId={exchangeId}
        exchangeName={exchangeName}
        onTaskCreated={(task) => {
          console.log('Task created:', task);
          // Task list will auto-refresh via the hook
        }}
      />
    </div>
  );
};

export default EnhancedTaskManager;