import React, { useState, useMemo } from 'react';
import { 
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  ClockIcon,
  FlagIcon,
  UserIcon,
  ExclamationTriangleIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';

import { Task } from '../../../types';

interface TaskTimelineViewProps {
  tasks: Task[];
  loading: boolean;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  filters: any;
}

interface TimelineTask extends Task {
  startDate: Date;
  endDate: Date;
  duration: number;
  position: number;
  width: number;
}

export const TaskTimelineView: React.FC<TaskTimelineViewProps> = ({
  tasks,
  loading,
  onTaskUpdate,
  filters
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [timelineRange, setTimelineRange] = useState<'week' | 'month' | 'quarter'>('month');
  const [groupBy, setGroupBy] = useState<'assignee' | 'priority' | 'exchange' | 'none'>('assignee');
  const [showMilestones, setShowMilestones] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Calculate timeline dates and tasks
  const timelineData = useMemo(() => {
    // Determine timeline start and end dates
    let startDate: Date, endDate: Date, totalDays: number;
    
    switch (timelineRange) {
      case 'week':
        startDate = new Date(currentDate);
        startDate.setDate(currentDate.getDate() - currentDate.getDay());
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        totalDays = 7;
        break;
      case 'month':
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1;
        break;
      case 'quarter':
        const quarter = Math.floor(currentDate.getMonth() / 3);
        startDate = new Date(currentDate.getFullYear(), quarter * 3, 1);
        endDate = new Date(currentDate.getFullYear(), quarter * 3 + 3, 0);
        totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1;
        break;
    }

    // Filter and process tasks
    const timelineTasks: TimelineTask[] = tasks
      .filter(task => {
        const dueDate = task.due_date || task.dueDate;
        if (!dueDate) return false;
        
        const taskDate = new Date(dueDate);
        return taskDate >= startDate && taskDate <= endDate;
      })
      .map(task => {
        const dueDate = new Date(task.due_date || task.dueDate!);
        
        // Estimate start date (for now, assume 3 days before due date)
        const estimatedStartDate = new Date(dueDate);
        estimatedStartDate.setDate(dueDate.getDate() - 3);
        const taskStartDate = estimatedStartDate < startDate ? startDate : estimatedStartDate;
        
        // Calculate position and width
        const daysSinceStart = Math.max(0, (taskStartDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const duration = Math.max(1, (dueDate.getTime() - taskStartDate.getTime()) / (1000 * 60 * 60 * 24));
        const position = (daysSinceStart / totalDays) * 100;
        const width = Math.max(2, (duration / totalDays) * 100);

        return {
          ...task,
          startDate: taskStartDate,
          endDate: dueDate,
          duration,
          position,
          width
        };
      });

    // Group tasks
    const groups: Record<string, TimelineTask[]> = {};
    
    if (groupBy === 'none') {
      groups['All Tasks'] = timelineTasks;
    } else {
      timelineTasks.forEach(task => {
        let groupKey = '';
        
        switch (groupBy) {
          case 'assignee':
            groupKey = task.assignedUser 
              ? `${task.assignedUser.first_name} ${task.assignedUser.last_name}`.trim()
              : task.assignedTo || 'Unassigned';
            break;
          case 'priority':
            groupKey = task.priority || 'No Priority';
            break;
          case 'exchange':
            groupKey = task.exchange?.exchange_number || 'No Exchange';
            break;
        }
        
        if (!groups[groupKey]) {
          groups[groupKey] = [];
        }
        groups[groupKey].push(task);
      });
    }

    return {
      startDate,
      endDate,
      totalDays,
      groups,
      timelineTasks
    };
  }, [tasks, currentDate, timelineRange, groupBy]);

  // Navigation functions
  const navigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    
    switch (timelineRange) {
      case 'week':
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'month':
        newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      case 'quarter':
        newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 3 : -3));
        break;
    }
    
    setCurrentDate(newDate);
  };

  // Generate timeline grid
  const generateTimelineGrid = () => {
    const { startDate, totalDays } = timelineData;
    const days = [];
    
    for (let i = 0; i < totalDays; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    
    return days;
  };

  // Get task colors
  const getTaskColor = (task: TimelineTask) => {
    const now = new Date();
    const isOverdue = task.endDate < now && task.status !== 'COMPLETED';
    const isCompleted = task.status === 'COMPLETED';
    
    if (isCompleted) return 'bg-green-500';
    if (isOverdue) return 'bg-red-500';
    
    switch (task.priority) {
      case 'HIGH': return 'bg-red-400';
      case 'MEDIUM': return 'bg-yellow-400';
      case 'LOW': return 'bg-green-400';
      default: return 'bg-blue-400';
    }
  };

  const formatTimelineHeader = () => {
    const { startDate, endDate } = timelineData;
    
    switch (timelineRange) {
      case 'week':
        return `Week of ${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      case 'month':
        return startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      case 'quarter':
        const quarter = Math.floor(startDate.getMonth() / 3) + 1;
        return `Q${quarter} ${startDate.getFullYear()}`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const timelineGrid = generateTimelineGrid();

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Timeline Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900">{formatTimelineHeader()}</h2>
          
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
          {/* Timeline Range */}
          <select
            value={timelineRange}
            onChange={(e) => setTimelineRange(e.target.value as any)}
            className="text-sm border border-gray-300 rounded px-3 py-1.5"
          >
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="quarter">Quarter</option>
          </select>

          {/* Group By */}
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as any)}
            className="text-sm border border-gray-300 rounded px-3 py-1.5"
          >
            <option value="none">No Grouping</option>
            <option value="assignee">Group by Assignee</option>
            <option value="priority">Group by Priority</option>
            <option value="exchange">Group by Exchange</option>
          </select>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
              className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
            >
              -
            </button>
            <span className="text-xs text-gray-600 px-2">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.25))}
              className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[800px]" style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top left' }}>
          {/* Timeline Header Grid */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
            <div className="flex">
              <div className="w-64 p-4 border-r border-gray-200 bg-gray-50">
                <span className="text-sm font-medium text-gray-700">
                  {groupBy === 'none' ? 'Tasks' : `Grouped by ${groupBy}`}
                </span>
              </div>
              <div className="flex-1 relative">
                <div className="flex">
                  {timelineGrid.map((date, index) => (
                    <div
                      key={index}
                      className={`flex-1 p-2 border-r border-gray-200 text-center text-xs ${
                        date.toDateString() === new Date().toDateString() ? 'bg-blue-50' : ''
                      }`}
                      style={{ minWidth: timelineRange === 'quarter' ? '20px' : '40px' }}
                    >
                      <div className="font-medium text-gray-900">
                        {timelineRange === 'week' 
                          ? date.toLocaleDateString('en-US', { weekday: 'short' })
                          : date.getDate()
                        }
                      </div>
                      {timelineRange !== 'quarter' && (
                        <div className="text-gray-500">
                          {date.toLocaleDateString('en-US', { month: 'short' })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Today indicator */}
                {(() => {
                  const today = new Date();
                  if (today >= timelineData.startDate && today <= timelineData.endDate) {
                    const todayPosition = ((today.getTime() - timelineData.startDate.getTime()) / (1000 * 60 * 60 * 24)) / timelineData.totalDays * 100;
                    return (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                        style={{ left: `${todayPosition}%` }}
                        title="Today"
                      />
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          </div>

          {/* Timeline Body */}
          <div className="space-y-0">
            {Object.entries(timelineData.groups).map(([groupName, groupTasks]) => (
              <div key={groupName} className="border-b border-gray-100">
                {/* Group Header */}
                {groupBy !== 'none' && (
                  <div className="flex bg-gray-50">
                    <div className="w-64 p-3 border-r border-gray-200">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{groupName}</span>
                        <span className="text-xs text-gray-500">({groupTasks.length})</span>
                      </div>
                    </div>
                    <div className="flex-1 relative">
                      {/* Group timeline background */}
                      <div className="h-full bg-gray-50"></div>
                    </div>
                  </div>
                )}

                {/* Group Tasks */}
                {groupTasks.map((task, taskIndex) => (
                  <div key={task.id} className="flex hover:bg-gray-50">
                    <div className="w-64 p-3 border-r border-gray-200">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900 truncate" title={task.title}>
                          {task.title}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {task.assignedUser && (
                            <div className="flex items-center gap-1">
                              <UserIcon className="w-3 h-3" />
                              <span>{task.assignedUser.first_name}</span>
                            </div>
                          )}
                          <div className={`px-1.5 py-0.5 rounded text-xs ${
                            task.priority === 'HIGH' ? 'bg-red-100 text-red-700' :
                            task.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {task.priority || 'Med'}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-1 relative p-2">
                      {/* Task bar */}
                      <div
                        className={`absolute top-1/2 transform -translate-y-1/2 h-6 rounded-md ${getTaskColor(task)} opacity-80 hover:opacity-100 transition-opacity cursor-pointer`}
                        style={{
                          left: `${task.position}%`,
                          width: `${Math.max(2, task.width)}%`
                        }}
                        onClick={() => {
                          // Handle task click - could open details modal
                          console.log('Task clicked:', task.title);
                        }}
                        title={`${task.title} (${task.startDate.toLocaleDateString()} - ${task.endDate.toLocaleDateString()})`}
                      >
                        <div className="px-2 py-1 text-xs text-white font-medium truncate">
                          {task.title}
                        </div>
                        
                        {/* Overdue indicator */}
                        {task.endDate < new Date() && task.status !== 'COMPLETED' && (
                          <ExclamationTriangleIcon className="absolute -top-1 -right-1 w-3 h-3 text-red-600 bg-white rounded-full" />
                        )}
                      </div>
                      
                      {/* Milestone indicators */}
                      {showMilestones && task.status === 'COMPLETED' && (
                        <div
                          className="absolute top-1/2 transform -translate-y-1/2 w-2 h-2 bg-green-600 rounded-full"
                          style={{ right: '4px' }}
                          title="Completed"
                        />
                      )}
                    </div>
                  </div>
                ))}
                
                {groupTasks.length === 0 && (
                  <div className="flex">
                    <div className="w-64 p-3 border-r border-gray-200">
                      <div className="text-sm text-gray-500">No tasks in this period</div>
                    </div>
                    <div className="flex-1 p-3">
                      <div className="text-center text-gray-400 text-sm">
                        No tasks scheduled
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline Legend */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-400 rounded"></div>
              <span>High Priority</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-400 rounded"></div>
              <span>Medium Priority</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-400 rounded"></div>
              <span>Low Priority</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Overdue</span>
            </div>
          </div>
          
          <div className="text-xs text-gray-500">
            {timelineData.timelineTasks.length} tasks in timeline
          </div>
        </div>
      </div>
    </div>
  );
};