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

const EnhancedTaskManager: React.FC<{ 
  exchangeId?: string; 
  exchangeName?: string;
  onTaskCreated?: () => void;
}> = ({ exchangeId, exchangeName, onTaskCreated }) => {
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [compactView, setCompactView] = useState(true);

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
              <ChartBarIcon className="h-4 w-4" />
              <span className="text-sm font-medium">
                {compactView ? 'Compact' : 'Detailed'}
              </span>
            </button>

            {/* Create Task Button */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              <span className="text-sm font-medium">Create Task</span>
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <ClockIcon className="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-blue-900">Pending</p>
                <p className="text-2xl font-bold text-blue-600">0</p>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-yellow-900">In Progress</p>
                <p className="text-2xl font-bold text-yellow-600">0</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-green-900">Completed</p>
                <p className="text-2xl font-bold text-green-600">0</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center">
              <SparklesIcon className="h-5 w-5 text-purple-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-purple-900">AI Suggestions</p>
                <p className="text-2xl font-bold text-purple-600">0</p>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Badges */}
        <div className="mt-4">
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
              AI-Powered
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

      {/* Main Content */}
      {viewMode === 'board' ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">
          <Squares2X2Icon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>Enhanced Task Board coming soon. Use List view for now.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">
          <TableCellsIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p>List view coming soon. Use Board view for now.</p>
        </div>
      )}

      {/* Simple Task Creation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Create Task</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter task title..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Enter task description..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    console.log('Task created');
                    setShowCreateModal(false);
                    if (onTaskCreated) {
                      onTaskCreated();
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedTaskManager;