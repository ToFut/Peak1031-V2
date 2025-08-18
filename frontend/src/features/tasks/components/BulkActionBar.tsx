import React, { useState } from 'react';
import { 
  CheckIcon,
  XMarkIcon,
  UserIcon,
  CalendarIcon,
  FlagIcon,
  TrashIcon,
  ArrowPathIcon,
  TagIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface BulkActionBarProps {
  selectedCount: number;
  onBulkAction: (action: string, value?: any) => Promise<void>;
  onCancel: () => void;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  onBulkAction,
  onCancel
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentAction, setCurrentAction] = useState<string>('');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);

  const handleAction = async (action: string, value?: any) => {
    setIsLoading(true);
    setCurrentAction(action);
    
    try {
      await onBulkAction(action, value);
    } catch (error) {
      console.error('Bulk action failed:', error);
    } finally {
      setIsLoading(false);
      setCurrentAction('');
      setShowStatusMenu(false);
      setShowPriorityMenu(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedCount} tasks? This action cannot be undone.`)) {
      handleAction('delete');
    }
  };

  const statusOptions = [
    { value: 'PENDING', label: 'To Do', color: 'text-gray-600', icon: ClockIcon },
    { value: 'IN_PROGRESS', label: 'In Progress', color: 'text-blue-600', icon: ArrowPathIcon },
    { value: 'COMPLETED', label: 'Completed', color: 'text-green-600', icon: CheckIcon },
    { value: 'BLOCKED', label: 'Blocked', color: 'text-red-600', icon: XMarkIcon }
  ];

  const priorityOptions = [
    { value: 'HIGH', label: 'High Priority', color: 'text-red-600' },
    { value: 'MEDIUM', label: 'Medium Priority', color: 'text-yellow-600' },
    { value: 'LOW', label: 'Low Priority', color: 'text-green-600' }
  ];

  return (
    <div className="bg-blue-50 border-b border-blue-200 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Selection Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
              <CheckIcon className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-blue-900">
              {selectedCount} task{selectedCount !== 1 ? 's' : ''} selected
            </span>
          </div>
          
          <button
            onClick={onCancel}
            className="text-blue-600 hover:text-blue-800 p-1 rounded"
            title="Clear selection"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Bulk Actions */}
        <div className="flex items-center gap-2">
          {/* Status Actions */}
          <div className="relative">
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
            >
              <ClockIcon className="w-4 h-4" />
              Update Status
              {currentAction === 'updateStatus' && isLoading && (
                <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              )}
            </button>

            {showStatusMenu && (
              <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px]">
                {statusOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleAction('updateStatus', option.value)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm"
                    >
                      <Icon className={`w-4 h-4 ${option.color}`} />
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Priority Actions */}
          <div className="relative">
            <button
              onClick={() => setShowPriorityMenu(!showPriorityMenu)}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
            >
              <FlagIcon className="w-4 h-4" />
              Set Priority
              {currentAction === 'updatePriority' && isLoading && (
                <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              )}
            </button>

            {showPriorityMenu && (
              <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px]">
                {priorityOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleAction('updatePriority', option.value)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm"
                  >
                    <FlagIcon className={`w-4 h-4 ${option.color}`} />
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <button
            onClick={() => handleAction('updateStatus', 'COMPLETED')}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 bg-green-100 border border-green-200 rounded-lg text-sm font-medium text-green-700 hover:bg-green-200 disabled:opacity-50"
          >
            <CheckIcon className="w-4 h-4" />
            Mark Complete
            {currentAction === 'markComplete' && isLoading && (
              <div className="w-3 h-3 border border-green-600 border-t-transparent rounded-full animate-spin"></div>
            )}
          </button>

          {/* Separator */}
          <div className="h-6 w-px bg-blue-200"></div>

          {/* Assign Actions */}
          <button
            onClick={() => {}} // TODO: Implement bulk assignment modal
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
          >
            <UserIcon className="w-4 h-4" />
            Assign
          </button>

          {/* Due Date Actions */}
          <button
            onClick={() => {}} // TODO: Implement bulk due date modal
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
          >
            <CalendarIcon className="w-4 h-4" />
            Set Due Date
          </button>

          {/* Tag Actions */}
          <button
            onClick={() => {}} // TODO: Implement bulk tagging modal
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
          >
            <TagIcon className="w-4 h-4" />
            Add Tags
          </button>

          {/* Separator */}
          <div className="h-6 w-px bg-blue-200"></div>

          {/* Delete Action */}
          <button
            onClick={handleDelete}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 bg-red-100 border border-red-200 rounded-lg text-sm font-medium text-red-700 hover:bg-red-200 disabled:opacity-50"
          >
            <TrashIcon className="w-4 h-4" />
            Delete
            {currentAction === 'delete' && isLoading && (
              <div className="w-3 h-3 border border-red-600 border-t-transparent rounded-full animate-spin"></div>
            )}
          </button>
        </div>
      </div>

      {/* Action Feedback */}
      {isLoading && (
        <div className="mt-2 flex items-center gap-2 text-sm text-blue-700">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span>
            {currentAction === 'delete' ? 'Deleting tasks...' :
             currentAction === 'updateStatus' ? 'Updating status...' :
             currentAction === 'updatePriority' ? 'Updating priority...' :
             'Processing...'}
          </span>
        </div>
      )}

      {/* Keyboard Shortcuts Hint */}
      <div className="mt-2 text-xs text-blue-600">
        Tip: Use keyboard shortcuts for faster bulk actions:
        <span className="ml-2 space-x-2">
          <kbd className="px-1 py-0.5 bg-blue-100 rounded">Shift + C</kbd> Mark Complete
          <kbd className="px-1 py-0.5 bg-blue-100 rounded">Shift + P</kbd> Set Priority
          <kbd className="px-1 py-0.5 bg-blue-100 rounded">Delete</kbd> Delete Selected
        </span>
      </div>
    </div>
  );
};