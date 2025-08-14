import React, { useState, useMemo } from 'react';
import { Task, TaskStatus } from '../../../types';
import { Clock, AlertTriangle, CheckCircle, User, Calendar, Star, Flag, ArrowRight } from 'lucide-react';

interface TaskBoardProps {
  tasks: Task[];
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
  onTaskSelect?: (task: Task) => void;
  showExchangeInfo?: boolean;
  showPPInfo?: boolean;
  compact?: boolean;
}

export const TaskBoard: React.FC<TaskBoardProps> = ({ 
  tasks, 
  onTaskUpdate, 
  onTaskSelect,
  showExchangeInfo = true,
  showPPInfo = true,
  compact = false
}) => {
  const [draggedTask, setDraggedTask] = useState<string | null>(null);

  const columns = [
    { 
      id: 'PENDING' as TaskStatus, 
      title: 'Pending', 
      color: 'bg-yellow-50 border-yellow-200',
      icon: Clock,
      headerColor: 'text-yellow-700'
    },
    { 
      id: 'IN_PROGRESS' as TaskStatus, 
      title: 'In Progress', 
      color: 'bg-blue-50 border-blue-200',
      icon: ArrowRight,
      headerColor: 'text-blue-700'
    },
    { 
      id: 'COMPLETED' as TaskStatus, 
      title: 'Completed', 
      color: 'bg-green-50 border-green-200',
      icon: CheckCircle,
      headerColor: 'text-green-700'
    }
  ];
  
  // Map lowercase to uppercase for column matching
  const normalizeStatus = (status: string): TaskStatus => {
    const statusMap: Record<string, TaskStatus> = {
      'pending': 'PENDING',
      'in_progress': 'IN_PROGRESS', 
      'completed': 'COMPLETED',
      'PENDING': 'PENDING',
      'IN_PROGRESS': 'IN_PROGRESS',
      'COMPLETED': 'COMPLETED'
    };
    return statusMap[status] || 'PENDING';
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: AlertTriangle,
          label: 'High'
        };
      case 'MEDIUM':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: Flag,
          label: 'Medium'
        };
      case 'LOW':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: Flag,
          label: 'Low'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: Flag,
          label: priority
        };
    }
  };

  // Memoize task statistics for performance
  const taskStats = useMemo(() => {
    const stats = {
      pending: tasks.filter(t => t.status === 'PENDING').length,
      inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
      completed: tasks.filter(t => t.status === 'COMPLETED').length,
      overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED').length
    };
    return stats;
  }, [tasks]);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    if (draggedTask && onTaskUpdate) {
      onTaskUpdate(draggedTask, { status });
    }
    setDraggedTask(null);
  };

  const filteredTasks = (status: TaskStatus) => {
    return tasks.filter(task => {
      // Normalize both statuses for comparison
      const normalizedTaskStatus = normalizeStatus(task.status);
      const normalizedColumnStatus = normalizeStatus(status);
      return normalizedTaskStatus === normalizedColumnStatus;
    });
  };

  const isOverdue = (task: Task) => {
    return task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED';
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Task Statistics */}
      {!compact && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-yellow-600 mr-2" />
              <div>
                <div className="text-lg font-semibold text-yellow-700">{taskStats.pending}</div>
                <div className="text-xs text-yellow-600">Pending</div>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <ArrowRight className="w-5 h-5 text-blue-600 mr-2" />
              <div>
                <div className="text-lg font-semibold text-blue-700">{taskStats.inProgress}</div>
                <div className="text-xs text-blue-600">In Progress</div>
              </div>
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <div>
                <div className="text-lg font-semibold text-green-700">{taskStats.completed}</div>
                <div className="text-xs text-green-600">Completed</div>
              </div>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
              <div>
                <div className="text-lg font-semibold text-red-700">{taskStats.overdue}</div>
                <div className="text-xs text-red-600">Overdue</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="flex space-x-4 flex-1">
        {columns.map(column => {
          const columnTasks = filteredTasks(column.id);
          const ColumnIcon = column.icon;
          
          return (
            <div
              key={column.id}
              className={`flex-1 ${column.color} border rounded-lg ${compact ? 'p-3' : 'p-4'} min-h-[400px]`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <ColumnIcon className={`w-5 h-5 mr-2 ${column.headerColor}`} />
                  <h3 className={`font-semibold ${column.headerColor} ${compact ? 'text-sm' : 'text-base'}`}>
                    {column.title}
                  </h3>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full bg-white ${column.headerColor} font-medium`}>
                  {columnTasks.length}
                </span>
              </div>
              
              <div className="space-y-3">
                {columnTasks.map(task => {
                  const priorityConfig = getPriorityConfig(task.priority);
                  const overdue = isOverdue(task);
                  const daysUntilDue = task.dueDate ? getDaysUntilDue(task.dueDate) : null;
                  
                  return (
                    <div
                      key={task.id}
                      className={`bg-white rounded-lg shadow-sm border transition-all hover:shadow-md cursor-pointer ${
                        overdue ? 'border-red-200 bg-red-50' : 'hover:border-gray-300'
                      } ${compact ? 'p-3' : 'p-4'}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onClick={() => onTaskSelect?.(task)}
                    >
                      {/* Task Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-medium text-gray-900 truncate ${
                            compact ? 'text-sm' : 'text-base'
                          }`}>
                            {task.title}
                          </h4>
                          {/* Source indicators */}
                          <div className="flex items-center mt-1 space-x-2">
                            {showPPInfo && task.ppTaskId && (
                              <div className="flex items-center">
                                <div className="w-2 h-2 bg-green-400 rounded-full mr-1"></div>
                                <span className="text-xs text-green-600 font-medium">PP</span>
                              </div>
                            )}
                            {task.source === 'chat' && (
                              <div className="flex items-center">
                                <div className="w-2 h-2 bg-purple-400 rounded-full mr-1"></div>
                                <span className="text-xs text-purple-600 font-medium">Chat</span>
                              </div>
                            )}
                            {task.metadata?.agent && (
                              <span className="text-xs text-blue-600 bg-blue-50 px-1 rounded">
                                Agent: {task.metadata.agent}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                          priorityConfig.color
                        }`}>
                          <priorityConfig.icon className="w-3 h-3 mr-1" />
                          {priorityConfig.label}
                        </div>
                      </div>
                      
                      {/* Description */}
                      {task.description && !compact && (
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      
                      {/* Task Details */}
                      <div className="space-y-2 mb-3">
                        {/* Created by and When */}
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                          {task.createdByUser && (
                            <div className="flex items-center">
                              <User className="w-3 h-3 mr-1" />
                              <span>By: {task.createdByUser.first_name} {task.createdByUser.last_name}</span>
                            </div>
                          )}
                          {task.created_at && (
                            <div className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              <span>Created: {new Date(task.created_at).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>

                        {/* Due Date */}
                        {task.dueDate && (
                          <div className={`flex items-center text-xs ${
                            overdue ? 'text-red-600' : 'text-gray-500'
                          }`}>
                            <Calendar className="w-3 h-3 mr-1" />
                            <span>
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                              {daysUntilDue !== null && (
                                <span className={`ml-1 ${
                                  overdue ? 'text-red-600' : daysUntilDue <= 3 ? 'text-orange-600' : 'text-gray-500'
                                }`}>
                                  ({overdue ? `${Math.abs(daysUntilDue)} days overdue` : 
                                    daysUntilDue === 0 ? 'Due today' : 
                                    `${daysUntilDue} days left`})
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                        
                        {/* Assigned to */}
                        {task.assignedUser && (
                          <div className="flex items-center text-xs text-gray-500">
                            <User className="w-3 h-3 mr-1" />
                            <span>
                              Assigned: {task.assignedUser.first_name} {task.assignedUser.last_name}
                            </span>
                          </div>
                        )}

                        {/* Chat task specific info */}
                        {task.source === 'chat' && task.metadata && (
                          <div className="bg-purple-50 p-2 rounded text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-purple-700 font-medium">Chat Task</span>
                              {task.metadata.agent && (
                                <span className="text-purple-600">Agent: {task.metadata.agent}</span>
                              )}
                            </div>
                            {task.metadata.original_mentions && task.metadata.original_mentions.length > 0 && (
                              <div className="mt-1 text-purple-600">
                                Mentions: @{task.metadata.original_mentions.join(', @')}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Exchange Info */}
                      {showExchangeInfo && task.exchange && (
                        <div className="pt-2 border-t border-gray-100">
                          <div className="flex items-center text-xs text-gray-500">
                            <span className="truncate">
                              Exchange: {task.exchange.name}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* PP Sync Info */}
                      {showPPInfo && task.lastSyncAt && (
                        <div className="pt-2 border-t border-gray-50 mt-2">
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>Synced: {new Date(task.lastSyncAt).toLocaleDateString()}</span>
                            <Star className="w-3 h-3" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* Empty State */}
                {columnTasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <ColumnIcon className="w-8 h-8 mb-2" />
                    <span className="text-sm">No {column.title.toLowerCase()} tasks</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}; 