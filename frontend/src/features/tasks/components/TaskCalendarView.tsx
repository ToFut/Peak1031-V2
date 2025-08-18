import React, { useState, useMemo } from 'react';
import { 
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  ClockIcon,
  PlusIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

import { Task } from '../../../types';
import { TaskCard } from './TaskCard';

interface TaskCalendarViewProps {
  tasks: Task[];
  loading: boolean;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskCreate: (task: Task) => void;
}

export const TaskCalendarView: React.FC<TaskCalendarViewProps> = ({
  tasks,
  loading,
  onTaskUpdate,
  onTaskCreate
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    
    tasks.forEach(task => {
      const dueDate = task.due_date || task.dueDate;
      if (dueDate) {
        const dateKey = new Date(dueDate).toDateString();
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(task);
      }
    });
    
    return grouped;
  }, [tasks]);

  // Generate calendar days for month view
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  }, [currentDate]);

  // Navigation functions
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentDate(newDate);
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const navigate = (direction: 'prev' | 'next') => {
    switch (viewMode) {
      case 'month': navigateMonth(direction); break;
      case 'week': navigateWeek(direction); break;
      case 'day': navigateDay(direction); break;
    }
  };

  // Get tasks for a specific date
  const getTasksForDate = (date: Date) => {
    const dateKey = date.toDateString();
    return tasksByDate[dateKey] || [];
  };

  // Check if date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Check if date is in current month
  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  // Get date color based on tasks
  const getDateColor = (date: Date, dayTasks: Task[]) => {
    if (!dayTasks.length) return '';
    
    const overdue = dayTasks.some(task => 
      new Date(task.due_date || task.dueDate || '') < new Date() && 
      task.status !== 'COMPLETED'
    );
    const completed = dayTasks.every(task => task.status === 'COMPLETED');
    const hasHigh = dayTasks.some(task => task.priority === 'HIGH');
    
    if (overdue) return 'bg-red-100 border-red-300';
    if (completed) return 'bg-green-100 border-green-300';
    if (hasHigh) return 'bg-yellow-100 border-yellow-300';
    return 'bg-blue-100 border-blue-300';
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatWeekRange = (date: Date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const formatDay = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getViewTitle = () => {
    switch (viewMode) {
      case 'month': return formatMonthYear(currentDate);
      case 'week': return formatWeekRange(currentDate);
      case 'day': return formatDay(currentDate);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900">{getViewTitle()}</h2>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate('prev')}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => navigate('next')}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['month', 'week', 'day'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors capitalize ${
                  viewMode === mode
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            New Task
          </button>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'month' && (
          <div className="p-6">
            {/* Month View */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="p-2 text-center text-sm font-medium text-gray-700">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, index) => {
                const dayTasks = getTasksForDate(date);
                const isCurrentMonthDate = isCurrentMonth(date);
                const isTodayDate = isToday(date);
                
                return (
                  <div
                    key={index}
                    className={`min-h-[120px] p-2 border border-gray-200 rounded-lg transition-colors cursor-pointer hover:bg-gray-50 ${
                      !isCurrentMonthDate ? 'bg-gray-50 text-gray-400' : ''
                    } ${isTodayDate ? 'bg-blue-50 border-blue-300' : ''} ${
                      getDateColor(date, dayTasks)
                    }`}
                    onClick={() => setSelectedDate(date.toISOString())}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      isTodayDate ? 'text-blue-600' : isCurrentMonthDate ? 'text-gray-900' : 'text-gray-400'
                    }`}>
                      {date.getDate()}
                    </div>
                    
                    <div className="space-y-1">
                      {dayTasks.slice(0, 3).map((task) => {
                        const isOverdue = new Date(task.due_date || task.dueDate || '') < new Date() && task.status !== 'COMPLETED';
                        return (
                          <div
                            key={task.id}
                            className={`text-xs p-1 rounded truncate ${
                              task.status === 'COMPLETED' ? 'bg-green-100 text-green-800 line-through' :
                              isOverdue ? 'bg-red-100 text-red-800' :
                              task.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                              task.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}
                            title={task.title}
                          >
                            {isOverdue && <ExclamationTriangleIcon className="w-3 h-3 inline mr-1" />}
                            {task.title}
                          </div>
                        );
                      })}
                      {dayTasks.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{dayTasks.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === 'week' && (
          <div className="p-6">
            {/* Week View */}
            <div className="grid grid-cols-7 gap-4">
              {Array.from({ length: 7 }, (_, i) => {
                const date = new Date(currentDate);
                date.setDate(currentDate.getDate() - currentDate.getDay() + i);
                const dayTasks = getTasksForDate(date);
                const isTodayDate = isToday(date);
                
                return (
                  <div key={i} className="space-y-2">
                    <div className={`text-center p-2 rounded-lg ${
                      isTodayDate ? 'bg-blue-100 text-blue-800 font-medium' : 'text-gray-700'
                    }`}>
                      <div className="text-sm font-medium">
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className="text-lg">
                        {date.getDate()}
                      </div>
                    </div>
                    
                    <div className="space-y-2 min-h-[400px]">
                      {dayTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          selected={false}
                          onSelect={() => {}}
                          onUpdate={(updates) => onTaskUpdate(task.id, updates)}
                          onDelete={() => {}}
                          compact={true}
                          showExchange={false}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === 'day' && (
          <div className="p-6">
            {/* Day View */}
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {formatDay(currentDate)}
                </h3>
                
                {isToday(currentDate) && (
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <ClockIcon className="w-4 h-4" />
                    <span>Today</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                {getTasksForDate(currentDate).map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    selected={false}
                    onSelect={() => {}}
                    onUpdate={(updates) => onTaskUpdate(task.id, updates)}
                    onDelete={() => {}}
                    compact={false}
                    showExchange={true}
                  />
                ))}
                
                {getTasksForDate(currentDate).length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks scheduled</h3>
                    <p className="text-gray-600">
                      No tasks are scheduled for this day.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Task Summary */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            Total tasks with due dates: {Object.values(tasksByDate).flat().length}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
              <span>Overdue</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
              <span>High Priority</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
              <span>Completed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};