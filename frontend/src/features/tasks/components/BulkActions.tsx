import React, { useState } from 'react';
import { CheckIcon, XMarkIcon, UserIcon, CalendarIcon, FlagIcon, TrashIcon } from '@heroicons/react/24/outline';

interface BulkActionsProps {
  selectedTasks: string[];
  onBulkAction: (action: string, value?: any) => Promise<void>;
  onCancel: () => void;
}

export const BulkActions: React.FC<BulkActionsProps> = ({ 
  selectedTasks, 
  onBulkAction, 
  onCancel 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [action, setAction] = useState<string>('');

  const handleAction = async (actionType: string, value?: any) => {
    setIsLoading(true);
    setAction(actionType);
    try {
      await onBulkAction(actionType, value);
      onCancel(); // Close bulk actions after success
    } catch (error) {
      console.error('Bulk action failed:', error);
    } finally {
      setIsLoading(false);
      setAction('');
    }
  };

  const bulkActions = [
    {
      group: 'Status',
      actions: [
        { 
          id: 'mark-completed', 
          label: 'Mark Complete', 
          icon: CheckIcon, 
          color: 'text-green-600 hover:bg-green-50',
          action: () => handleAction('updateStatus', 'COMPLETED')
        },
        { 
          id: 'mark-progress', 
          label: 'In Progress', 
          icon: UserIcon, 
          color: 'text-blue-600 hover:bg-blue-50',
          action: () => handleAction('updateStatus', 'IN_PROGRESS')
        },
        { 
          id: 'mark-pending', 
          label: 'To Do', 
          icon: CalendarIcon, 
          color: 'text-gray-600 hover:bg-gray-50',
          action: () => handleAction('updateStatus', 'PENDING')
        }
      ]
    },
    {
      group: 'Priority',
      actions: [
        { 
          id: 'high-priority', 
          label: 'High Priority', 
          icon: FlagIcon, 
          color: 'text-red-600 hover:bg-red-50',
          action: () => handleAction('updatePriority', 'HIGH')
        },
        { 
          id: 'medium-priority', 
          label: 'Medium Priority', 
          icon: FlagIcon, 
          color: 'text-yellow-600 hover:bg-yellow-50',
          action: () => handleAction('updatePriority', 'MEDIUM')
        },
        { 
          id: 'low-priority', 
          label: 'Low Priority', 
          icon: FlagIcon, 
          color: 'text-green-600 hover:bg-green-50',
          action: () => handleAction('updatePriority', 'LOW')
        }
      ]
    },
    {
      group: 'Other',
      actions: [
        { 
          id: 'delete', 
          label: 'Delete Tasks', 
          icon: TrashIcon, 
          color: 'text-red-600 hover:bg-red-50',
          action: () => {
            if (window.confirm(`Are you sure you want to delete ${selectedTasks.length} tasks?`)) {
              handleAction('delete');
            }
          }
        }
      ]
    }
  ];

  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
              <CheckIcon className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''} selected
            </span>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {bulkActions.map((group) => (
          <div key={group.group}>
            <h4 className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
              {group.group}
            </h4>
            <div className="flex flex-wrap gap-2">
              {group.actions.map((actionItem) => {
                const Icon = actionItem.icon;
                const isCurrentAction = action === actionItem.id.split('-')[0] || 
                                      (actionItem.id.includes('update') && action.startsWith('update'));
                
                return (
                  <button
                    key={actionItem.id}
                    onClick={actionItem.action}
                    disabled={isLoading}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                      actionItem.color
                    } ${isCurrentAction ? 'animate-pulse' : ''}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{actionItem.label}</span>
                    {isCurrentAction && isLoading && (
                      <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin ml-1"></div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="text-xs text-gray-500">
          Actions will be applied to all {selectedTasks.length} selected tasks
        </div>
      </div>
    </div>
  );
};