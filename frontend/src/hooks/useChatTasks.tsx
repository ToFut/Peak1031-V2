import React, { useState, useCallback } from 'react';
import { apiService } from '../services/api';

interface ChatTaskMention {
  user: string;
  userId?: string;
}

interface ChatTaskData {
  title: string;
  description: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  assignedTo?: string;
  mentions: ChatTaskMention[];
}

export const useChatTasks = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastCreatedTask, setLastCreatedTask] = useState<any>(null);

  /**
   * Parse message for @mentions and @TASK command
   */
  const parseTaskFromMessage = useCallback((message: string): { hasTask: boolean; mentions: string[] } => {
    const hasTask = message.includes('@TASK');
    
    // Extract mentions (excluding @TASK)
    const mentionPattern = /@(\w+(?:\.\w+)?(?:@[\w.-]+)?)/g;
    const mentions: string[] = [];
    let match;
    
    while ((match = mentionPattern.exec(message)) !== null) {
      if (match[1] !== 'TASK') {
        mentions.push(match[1]);
      }
    }

    return { hasTask, mentions };
  }, []);

  /**
   * Format message with @mentions highlighted
   */
  const formatMessageWithMentions = useCallback((message: string): React.ReactNode => {
    const parts = message.split(/(@\w+(?:\.\w+)?(?:@[\w.-]+)?)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const mention = part.substring(1);
        const isTask = mention === 'TASK';
        
        return (
          <span
            key={index}
            className={`${
              isTask 
                ? 'bg-purple-100 text-purple-700 font-semibold px-1 rounded' 
                : 'bg-blue-100 text-blue-700 px-1 rounded'
            }`}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  }, []);

  /**
   * Show task creation indicator in chat
   */
  const renderTaskCreationIndicator = useCallback((task: any) => {
    if (!task) return null;

    return (
      <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-purple-900">Task Created</p>
            <p className="text-sm text-purple-700">{task.title}</p>
            {task.assigned_to_name && (
              <p className="text-xs text-purple-600 mt-1">
                Assigned to: {task.assigned_to_name}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }, []);

  /**
   * Get task preview while typing
   */
  const getTaskPreview = useCallback((message: string, mentions: string[]): ChatTaskData | null => {
    const taskMatch = message.match(/@TASK\s+(.+)/i);
    if (!taskMatch) return null;

    const taskContent = taskMatch[1];
    
    // Simple extraction for preview
    const titleMatch = taskContent.match(/^([^.!?\n]+)/);
    const title = titleMatch ? titleMatch[1].trim() : taskContent.substring(0, 50) + '...';

    return {
      title,
      description: taskContent,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days default
      priority: 'medium',
      category: 'general',
      assignedTo: mentions[0],
      mentions: mentions.map(m => ({ user: m }))
    };
  }, []);

  /**
   * Render live task preview
   */
  const renderTaskPreview = useCallback((preview: ChatTaskData | null) => {
    if (!preview) return null;

    return (
      <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-900">Task Preview</p>
            <p className="text-sm text-yellow-700">{preview.title}</p>
            {preview.assignedTo && (
              <p className="text-xs text-yellow-600 mt-1">
                Will be assigned to: @{preview.assignedTo}
              </p>
            )}
            <p className="text-xs text-yellow-500 mt-1">
              Press Enter to create task
            </p>
          </div>
        </div>
      </div>
    );
  }, []);

  return {
    isProcessing,
    lastCreatedTask,
    parseTaskFromMessage,
    formatMessageWithMentions,
    renderTaskCreationIndicator,
    getTaskPreview,
    renderTaskPreview
  };
};