/**
 * Chat Task Integration Component
 * Detects and creates tasks from chat messages automatically
 */

import React, { useEffect, useRef } from 'react';
import {
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import { useEnhancedTasks } from '../../hooks/useEnhancedTasks';

interface ChatTaskIntegrationProps {
  messages: any[];
  exchangeId?: string;
  onTaskCreated?: (tasks: any[]) => void;
}

export const ChatTaskIntegration: React.FC<ChatTaskIntegrationProps> = ({
  messages,
  exchangeId,
  onTaskCreated
}) => {
  const { extractFromChatMessage, loading } = useEnhancedTasks(exchangeId);
  const processedMessages = useRef(new Set<string>());
  const [detectedTasks, setDetectedTasks] = React.useState<any[]>([]);
  const [processing, setProcessing] = React.useState(false);

  // Task detection patterns
  const taskPatterns = [
    /@task/i,
    /@todo/i,
    /need to/i,
    /should/i,
    /must/i,
    /have to/i,
    /remember to/i,
    /upload/i,
    /review/i,
    /contact/i,
    /schedule/i,
    /follow up/i,
    /deadline/i,
    /urgent/i,
    /asap/i
  ];

  // Check if message contains task indicators
  const containsTaskIndicators = (content: string): boolean => {
    return taskPatterns.some(pattern => pattern.test(content));
  };

  // Process messages for task extraction
  useEffect(() => {
    const processNewMessages = async () => {
      if (!messages || messages.length === 0) return;

      const newMessages = messages.filter(msg => 
        !processedMessages.current.has(msg.id) && 
        containsTaskIndicators(msg.content)
      );

      if (newMessages.length === 0) return;

      setProcessing(true);
      const allExtractedTasks = [];

      for (const message of newMessages) {
        try {
          console.log(`🔍 Processing message for tasks: ${message.content}`);
          
          const extractedTasks = await extractFromChatMessage(message.content, {
            senderId: message.sender_id,
            messageId: message.id
          });

          if (extractedTasks && extractedTasks.length > 0) {
            console.log(`✅ Extracted ${extractedTasks.length} tasks from message`);
            allExtractedTasks.push(...extractedTasks);
            
            // Add to detected tasks for UI display
            setDetectedTasks(prev => [...prev, ...extractedTasks.map((task: any) => ({
              ...task,
              sourceMessage: message.content,
              sourceMessageId: message.id,
              detectedAt: new Date().toISOString()
            }))]);
          }

          // Mark message as processed
          processedMessages.current.add(message.id);

        } catch (error) {
          console.error('Error processing message for tasks:', error);
          processedMessages.current.add(message.id); // Still mark as processed to avoid retry
        }
      }

      if (allExtractedTasks.length > 0 && onTaskCreated) {
        onTaskCreated(allExtractedTasks);
      }

      setProcessing(false);
    };

    // Debounce the processing to avoid overwhelming the API
    const timer = setTimeout(processNewMessages, 1000);
    return () => clearTimeout(timer);
  }, [messages, extractFromChatMessage, onTaskCreated]);

  // Auto-dismiss detected tasks after showing them briefly
  useEffect(() => {
    if (detectedTasks.length > 0) {
      const timer = setTimeout(() => {
        setDetectedTasks([]);
      }, 10000); // Show for 10 seconds

      return () => clearTimeout(timer);
    }
  }, [detectedTasks]);

  // Don't render if no detected tasks and not processing
  if (detectedTasks.length === 0 && !processing) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      {/* Processing Indicator */}
      {processing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <SparklesIcon className="h-5 w-5 text-blue-600 animate-pulse" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">
                Analyzing messages for tasks...
              </p>
              <p className="text-xs text-blue-600 mt-1">
                AI is scanning chat for actionable items
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Detected Tasks */}
      {detectedTasks.map((taskResult, index) => (
        <div
          key={`${taskResult.sourceMessageId}-${index}`}
          className="bg-green-50 border border-green-200 rounded-lg p-4 mb-3 shadow-lg animate-slide-in-right"
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">
                Task Created from Chat
              </p>
              <p className="text-sm text-green-800 mt-1 font-medium">
                {taskResult.task?.title}
              </p>
              <p className="text-xs text-green-600 mt-2">
                From: "{taskResult.sourceMessage?.substring(0, 50)}..."
              </p>
              
              {taskResult.parsedData && (
                <div className="mt-3 flex flex-wrap gap-1">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    taskResult.parsedData.priority === 'critical' ? 'bg-red-100 text-red-800' :
                    taskResult.parsedData.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    taskResult.parsedData.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {taskResult.parsedData.priority}
                  </span>
                  
                  {taskResult.parsedData.category && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {taskResult.parsedData.category}
                    </span>
                  )}

                  {taskResult.parsedData.confidence && (
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      taskResult.parsedData.confidence >= 0.8 ? 'bg-green-100 text-green-800' :
                      taskResult.parsedData.confidence >= 0.6 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {Math.round(taskResult.parsedData.confidence * 100)}% AI
                    </span>
                  )}
                </div>
              )}

              {taskResult.autoActions && taskResult.autoActions.length > 0 && (
                <div className="mt-2 flex items-center space-x-1 text-xs text-green-600">
                  <ClipboardDocumentListIcon className="h-3 w-3" />
                  <span>{taskResult.autoActions.length} auto-actions available</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Error State */}
      {!processing && detectedTasks.length === 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900">
                Task Detection Error
              </p>
              <p className="text-xs text-red-600 mt-1">
                Failed to process chat messages for tasks
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper component for manual task creation from message
export const ChatMessageTaskButton: React.FC<{
  message: string;
  exchangeId?: string;
  onTaskCreated?: (task: any) => void;
  className?: string;
}> = ({ message, exchangeId, onTaskCreated, className = '' }) => {
  const { extractFromChatMessage, loading } = useEnhancedTasks(exchangeId);
  const [isCreating, setIsCreating] = React.useState(false);

  const handleCreateTask = async () => {
    if (isCreating || loading) return;

    setIsCreating(true);
    try {
      const tasks = await extractFromChatMessage(message);
      if (tasks && tasks.length > 0 && onTaskCreated) {
        onTaskCreated(tasks[0]); // Return first task
      }
    } catch (error) {
      console.error('Manual task creation error:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <button
      onClick={handleCreateTask}
      disabled={isCreating || loading}
      className={`inline-flex items-center space-x-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      title="Create task from this message"
    >
      <SparklesIcon className="h-3 w-3" />
      <span>{isCreating ? 'Creating...' : 'Create Task'}</span>
    </button>
  );
};

// CSS animation for slide-in effect
const styles = `
  @keyframes slide-in-right {
    0% {
      transform: translateX(100%);
      opacity: 0;
    }
    100% {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .animate-slide-in-right {
    animation: slide-in-right 0.3s ease-out;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}