import React, { useState, useCallback, useMemo } from 'react';
import { Task, TaskStatus, TaskPriority } from '../../../types';
import { apiService } from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';
import {
  CalendarIcon, ClockIcon, UserCircleIcon, ExclamationTriangleIcon,
  CheckCircleIcon, PlusIcon, ChevronLeftIcon, ChevronRightIcon
} from '@heroicons/react/24/outline';

interface CalendarViewProps {
  tasks: Task[];
  onTaskSelect?: (task: Task) => void;
  onCreateTask?: (date: Date) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
  exchangeId?: string;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks, onTaskSelect, onCreateTask, onTaskUpdate, exchangeId
}) => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  // Get current month's calendar data
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    while (current <= lastDay || current.getDay() !== 0) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [currentDate]);

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    tasks.forEach(task => {
      const date = task.dueDate ? new Date(task.dueDate) : new Date(task.createdAt || '');
      const dateKey = date.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(task);
    });
    return grouped;
  }, [tasks]);

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getTaskColor = (task: Task) => {
    if (task.priority === 'HIGH') return 'bg-red-500';
    if (task.priority === 'MEDIUM') return 'bg-yellow-500';
    if (task.priority === 'LOW') return 'bg-green-500';
    return 'bg-blue-500';
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-gray-900">Calendar</h2>
          
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('month')}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'month'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'week'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'day'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Day
            </button>
          </div>
        </div>

        <button
          onClick={() => onCreateTask?.(new Date())}
          className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
        >
          <PlusIcon className="w-3 h-3" />
          New Task
        </button>
      </div>

      {/* Calendar Legend & Navigation */}
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs">
            <span className="font-medium text-gray-700">Priority:</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded"></div>
              <span>High</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-500 rounded"></div>
              <span>Medium</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded"></div>
              <span>Low</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            
            <span className="text-sm font-medium text-gray-900">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            
            <button
              onClick={() => navigateMonth('next')}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 p-2">
        <div className="grid grid-cols-7 gap-0.5 h-full">
          {/* Day Headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-1 text-center text-xs font-medium text-gray-500 bg-gray-50 rounded">
              {day}
            </div>
          ))}
          
          {/* Calendar Days */}
          {calendarData.map((date, index) => {
            const dateKey = date.toISOString().split('T')[0];
            const dayTasks = tasksByDate[dateKey] || [];
            const isCurrentMonthDay = isCurrentMonth(date);
            const isTodayDate = isToday(date);
            
            return (
              <div
                key={index}
                className={`min-h-[80px] p-1 border border-gray-200 ${
                  isCurrentMonthDay ? 'bg-white' : 'bg-gray-50'
                } ${isTodayDate ? 'ring-1 ring-purple-500' : ''}`}
                onClick={() => onCreateTask?.(date)}
              >
                <div className={`text-xs font-medium mb-1 ${
                  isCurrentMonthDay ? 'text-gray-900' : 'text-gray-400'
                } ${isTodayDate ? 'text-purple-600' : ''}`}>
                  {date.getDate()}
                </div>
                
                {/* Tasks for this day - Compact */}
                <div className="space-y-0.5">
                  {dayTasks.slice(0, 2).map(task => (
                    <div
                      key={task.id}
                      className={`px-1 py-0.5 rounded text-xs cursor-pointer transition-colors hover:opacity-80 ${
                        getTaskColor(task)
                      } text-white`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTaskSelect?.(task);
                      }}
                    >
                      <div className="truncate font-medium">{task.title}</div>
                    </div>
                  ))}
                  
                  {dayTasks.length > 2 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{dayTasks.length - 2}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-3">
            <span>Total: {tasks.length}</span>
            <span>Today: {tasks.filter(t => {
              const today = new Date().toDateString();
              const taskDate = t.dueDate ? new Date(t.dueDate).toDateString() : '';
              return taskDate === today;
            }).length}</span>
            <span>Overdue: {tasks.filter(t => 
              t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED'
            ).length}</span>
          </div>
          <span>View: {viewMode}</span>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
