import React from 'react';
import { XMarkIcon, CommandLineIcon } from '@heroicons/react/24/outline';

interface KeyboardShortcutsProps {
  onClose: () => void;
}

interface ShortcutGroup {
  title: string;
  shortcuts: {
    keys: string[];
    description: string;
    context?: string;
  }[];
}

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({ onClose }) => {
  const shortcutGroups: ShortcutGroup[] = [
    {
      title: 'Navigation',
      shortcuts: [
        { keys: ['⌘', '1'], description: 'Switch to List view' },
        { keys: ['⌘', '2'], description: 'Switch to Board view' },
        { keys: ['⌘', '3'], description: 'Switch to Calendar view' },
        { keys: ['⌘', '4'], description: 'Switch to Timeline view' },
        { keys: ['⌘', 'K'], description: 'Focus search' },
        { keys: ['⌘', 'F'], description: 'Toggle filters' },
        { keys: ['Esc'], description: 'Close modals and clear selection' }
      ]
    },
    {
      title: 'Task Creation',
      shortcuts: [
        { keys: ['⌘', 'N'], description: 'Create new task' },
        { keys: ['⌘', 'Enter'], description: 'Save task', context: 'In create/edit mode' },
        { keys: ['Esc'], description: 'Cancel creation', context: 'In create mode' }
      ]
    },
    {
      title: 'Task Management',
      shortcuts: [
        { keys: ['Space'], description: 'Select/deselect task', context: 'When focused on task' },
        { keys: ['⌘', 'A'], description: 'Select all tasks' },
        { keys: ['Enter'], description: 'Open task details', context: 'When focused on task' },
        { keys: ['C'], description: 'Mark task complete', context: 'When focused on task' },
        { keys: ['Delete'], description: 'Delete task', context: 'When focused on task' }
      ]
    },
    {
      title: 'Bulk Actions',
      shortcuts: [
        { keys: ['Shift', 'C'], description: 'Mark selected tasks complete' },
        { keys: ['Shift', 'P'], description: 'Set priority for selected tasks' },
        { keys: ['Shift', 'S'], description: 'Update status for selected tasks' },
        { keys: ['Shift', 'A'], description: 'Assign selected tasks' },
        { keys: ['Shift', 'D'], description: 'Set due date for selected tasks' },
        { keys: ['Delete'], description: 'Delete selected tasks', context: 'With selection' }
      ]
    },
    {
      title: 'List Navigation',
      shortcuts: [
        { keys: ['↑', '↓'], description: 'Navigate between tasks' },
        { keys: ['J', 'K'], description: 'Navigate between tasks (Vim-style)' },
        { keys: ['⌘', '↑'], description: 'Go to first task' },
        { keys: ['⌘', '↓'], description: 'Go to last task' },
        { keys: ['Shift', '↑'], description: 'Extend selection up' },
        { keys: ['Shift', '↓'], description: 'Extend selection down' }
      ]
    },
    {
      title: 'Filtering & Sorting',
      shortcuts: [
        { keys: ['F', 'S'], description: 'Filter by status' },
        { keys: ['F', 'P'], description: 'Filter by priority' },
        { keys: ['F', 'A'], description: 'Filter by assignee' },
        { keys: ['F', 'D'], description: 'Filter by due date' },
        { keys: ['S', 'D'], description: 'Sort by due date' },
        { keys: ['S', 'P'], description: 'Sort by priority' },
        { keys: ['S', 'C'], description: 'Sort by created date' }
      ]
    },
    {
      title: 'Board View',
      shortcuts: [
        { keys: ['Drag'], description: 'Move task between columns', context: 'Board view' },
        { keys: ['Tab'], description: 'Navigate between columns', context: 'Board view' },
        { keys: ['N'], description: 'Add task to current column', context: 'Board view' }
      ]
    },
    {
      title: 'General',
      shortcuts: [
        { keys: ['⌘', '?'], description: 'Show keyboard shortcuts' },
        { keys: ['⌘', 'R'], description: 'Refresh tasks' },
        { keys: ['⌘', 'Z'], description: 'Undo last action' },
        { keys: ['⌘', 'Shift', 'Z'], description: 'Redo last action' }
      ]
    }
  ];

  const renderKey = (key: string) => (
    <kbd
      key={key}
      className="inline-flex items-center px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono text-gray-800 shadow-sm"
    >
      {key}
    </kbd>
  );

  const renderShortcut = (keys: string[]) => (
    <div className="flex items-center gap-1">
      {keys.map((key, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="text-gray-400 text-xs">+</span>}
          {renderKey(key)}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <CommandLineIcon className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {shortcutGroups.map((group) => (
              <div key={group.title} className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                  {group.title}
                </h3>
                <div className="space-y-3">
                  {group.shortcuts.map((shortcut, index) => (
                    <div key={index} className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-900 font-medium">
                          {shortcut.description}
                        </div>
                        {shortcut.context && (
                          <div className="text-xs text-gray-500 mt-1">
                            {shortcut.context}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {renderShortcut(shortcut.keys)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Tips */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Pro Tips</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Hold Shift while selecting to create a range selection</li>
              <li>• Use Tab to navigate through focusable elements</li>
              <li>• Most shortcuts work in combination with mouse actions</li>
              <li>• Keyboard shortcuts are context-aware and change based on your current view</li>
              <li>• Use {renderKey('⌘')} + {renderKey('?')} anytime to view this help</li>
            </ul>
          </div>

          {/* Platform Note */}
          <div className="mt-4 text-xs text-gray-500 text-center">
            <p>
              On Windows and Linux, replace {renderKey('⌘')} with {renderKey('Ctrl')}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            These shortcuts help you work faster and more efficiently with tasks.
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-500">
              Press {renderKey('Esc')} to close
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};