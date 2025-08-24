import React, { useState } from 'react';
import { Task } from '../../../types';
import { Calendar, Clock, RefreshCw, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react';

interface TaskRolloverProps {
  task: Task;
  onRollover: (taskId: string, newDueDate: string, notes?: string) => void;
  disabled?: boolean;
}

interface TaskWithRollover extends Task {
  canRollover?: boolean;
  rolloverHistory?: Array<{
    originalDate: string;
    newDate: string;
    rolledAt: string;
    reason?: string;
  }>;
}

export const TaskRollover: React.FC<TaskRolloverProps> = ({
  task,
  onRollover,
  disabled = false
}) => {
  const [showRollover, setShowRollover] = useState(false);
  const [newDueDate, setNewDueDate] = useState('');
  const [rolloverReason, setRolloverReason] = useState('');
  const [rolloverType, setRolloverType] = useState<'next_day' | 'custom'>('next_day');

  const taskWithRollover = task as TaskWithRollover;
  
  // Check if task can be rolled over
  const canRollover = () => {
    if (disabled) return false;
    if (task.status === 'COMPLETED' || task.status === 'completed') return false;
    
    // Check if task is overdue or due today
    const dueDate = task.dueDate || task.due_date;
    if (!dueDate) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDue = new Date(dueDate);
    taskDue.setHours(0, 0, 0, 0);
    
    return taskDue <= today;
  };

  const getNextBusinessDay = (date: Date = new Date()): string => {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    
    // If it's Saturday (6) or Sunday (0), move to Monday
    const dayOfWeek = nextDay.getDay();
    if (dayOfWeek === 6) { // Saturday
      nextDay.setDate(nextDay.getDate() + 2);
    } else if (dayOfWeek === 0) { // Sunday
      nextDay.setDate(nextDay.getDate() + 1);
    }
    
    return nextDay.toISOString().split('T')[0];
  };

  const handleQuickRollover = () => {
    const nextDay = getNextBusinessDay();
    onRollover(task.id, nextDay, 'Rolled over to next business day');
    setShowRollover(false);
  };

  const handleCustomRollover = () => {
    if (!newDueDate) return;
    
    onRollover(task.id, newDueDate, rolloverReason || 'Custom rollover');
    setShowRollover(false);
    setNewDueDate('');
    setRolloverReason('');
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getDaysOverdue = (): number => {
    const dueDate = task.dueDate || task.due_date;
    if (!dueDate) return 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const taskDue = new Date(dueDate);
    taskDue.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - taskDue.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysOverdue = getDaysOverdue();
  const isOverdue = daysOverdue > 0;
  const isDueToday = daysOverdue === 0;

  if (!canRollover()) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Rollover Status */}
      <div className={`flex items-center gap-2 p-3 rounded-lg border ${
        isOverdue 
          ? 'bg-red-50 border-red-200 text-red-800'
          : 'bg-yellow-50 border-yellow-200 text-yellow-800'
      }`}>
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">
            {isOverdue 
              ? `Task is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`
              : 'Task is due today'
            }
          </p>
          <p className="text-xs mt-1">
            Due: {formatDate(task.dueDate || task.due_date || '')}
          </p>
        </div>
        
        <button
          onClick={() => setShowRollover(!showRollover)}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            isOverdue
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-yellow-600 text-white hover:bg-yellow-700'
          }`}
        >
          <RefreshCw className="w-4 h-4 inline mr-1" />
          Roll Over
        </button>
      </div>

      {/* Rollover History */}
      {taskWithRollover.rolloverHistory && taskWithRollover.rolloverHistory.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-3">
          <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1">
            <Clock className="w-4 h-4" />
            Rollover History
          </h4>
          <div className="space-y-2">
            {taskWithRollover.rolloverHistory.slice(-3).map((rollover, index) => (
              <div key={index} className="flex items-center justify-between text-xs text-gray-600">
                <span>{formatDate(rollover.originalDate)} → {formatDate(rollover.newDate)}</span>
                <span>{formatDate(rollover.rolledAt)}</span>
              </div>
            ))}
            {taskWithRollover.rolloverHistory.length > 3 && (
              <p className="text-xs text-gray-500">+{taskWithRollover.rolloverHistory.length - 3} more</p>
            )}
          </div>
        </div>
      )}

      {/* Rollover Options */}
      {showRollover && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
          <h3 className="font-medium text-gray-900">Roll Over Task</h3>
          
          {/* Rollover Type Selection */}
          <div className="space-y-3">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="rolloverType"
                  value="next_day"
                  checked={rolloverType === 'next_day'}
                  onChange={(e) => setRolloverType(e.target.value as 'next_day')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Next business day</span>
              </label>
              
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="rolloverType"
                  value="custom"
                  checked={rolloverType === 'custom'}
                  onChange={(e) => setRolloverType(e.target.value as 'custom')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Custom date</span>
              </label>
            </div>

            {/* Quick Rollover Option */}
            {rolloverType === 'next_day' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Roll over to {formatDate(getNextBusinessDay())}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Next business day
                    </p>
                  </div>
                  
                  <button
                    onClick={handleQuickRollover}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    <ArrowRight className="w-4 h-4" />
                    Roll Over
                  </button>
                </div>
              </div>
            )}

            {/* Custom Date Option */}
            {rolloverType === 'custom' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Due Date
                  </label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason (Optional)
                  </label>
                  <textarea
                    value={rolloverReason}
                    onChange={(e) => setRolloverReason(e.target.value)}
                    placeholder="Why is this task being rolled over?"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                    rows={2}
                  />
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleCustomRollover}
                    disabled={!newDueDate}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 text-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Roll Over
                  </button>
                  
                  <button
                    onClick={() => setShowRollover(false)}
                    className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskRollover;