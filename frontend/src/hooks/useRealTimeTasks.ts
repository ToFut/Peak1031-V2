import { useEffect, useCallback, useRef } from 'react';
import { useSocket, useConnectionStatus } from './useSocket';
import { useAuth } from './useAuth';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  exchange_id: string;
  assigned_to?: string;
  due_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  assignee?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  exchange?: {
    id: string;
    exchange_number: string;
    status: string;
  };
}

interface RealTimeTaskEvent {
  exchangeId: string;
  taskId: string;
  task: Task;
  createdBy?: string;
  updatedBy?: string;
  deletedBy?: string;
}

interface UseRealTimeTasksOptions {
  exchangeId?: string;
  onTaskCreated?: (event: RealTimeTaskEvent) => void;
  onTaskUpdated?: (event: RealTimeTaskEvent) => void;
  onTaskDeleted?: (event: RealTimeTaskEvent) => void;
  onTaskAssigned?: (event: RealTimeTaskEvent) => void;
  onTaskCompleted?: (event: RealTimeTaskEvent) => void;
}

export const useRealTimeTasks = (options: UseRealTimeTasksOptions = {}) => {
  const { socket } = useSocket();
  const { isConnected } = useConnectionStatus();
  const { user } = useAuth();
  const { exchangeId, onTaskCreated, onTaskUpdated, onTaskDeleted, onTaskAssigned, onTaskCompleted } = options;
  
  const eventHandlers = useRef({
    onTaskCreated,
    onTaskUpdated,
    onTaskDeleted,
    onTaskAssigned,
    onTaskCompleted
  });

  // Update event handlers when they change
  useEffect(() => {
    eventHandlers.current = {
      onTaskCreated,
      onTaskUpdated,
      onTaskDeleted,
      onTaskAssigned,
      onTaskCompleted
    };
  }, [onTaskCreated, onTaskUpdated, onTaskDeleted, onTaskAssigned, onTaskCompleted]);

  // Join exchange room for real-time updates
  const joinExchangeRoom = useCallback((exchangeId: string) => {
    if (socket && isConnected) {
      console.log(`🔌 Joining exchange room: exchange_${exchangeId}`);
      socket.emit('join_exchange', { exchangeId });
    }
  }, [socket, isConnected]);

  // Leave exchange room
  const leaveExchangeRoom = useCallback((exchangeId: string) => {
    if (socket && isConnected) {
      console.log(`🔌 Leaving exchange room: exchange_${exchangeId}`);
      socket.emit('leave_exchange', { exchangeId });
    }
  }, [socket, isConnected]);

  // Join user room for personal updates
  const joinUserRoom = useCallback(() => {
    if (socket && isConnected && user?.id) {
      console.log(`🔌 Joining user room: user_${user.id}`);
      socket.emit('join_user', { userId: user.id });
    }
  }, [socket, isConnected, user?.id]);

  // Leave user room
  const leaveUserRoom = useCallback(() => {
    if (socket && isConnected && user?.id) {
      console.log(`🔌 Leaving user room: user_${user.id}`);
      socket.emit('leave_user', { userId: user.id });
    }
  }, [socket, isConnected, user?.id]);

  // Set up real-time event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    console.log('🔌 Setting up real-time task event listeners');

    // Task created event
    const handleTaskCreated = (event: RealTimeTaskEvent) => {
      console.log('📋 Real-time task created:', event);
      if (eventHandlers.current.onTaskCreated) {
        eventHandlers.current.onTaskCreated(event);
      }
    };

    // Task updated event
    const handleTaskUpdated = (event: RealTimeTaskEvent) => {
      console.log('📋 Real-time task updated:', event);
      if (eventHandlers.current.onTaskUpdated) {
        eventHandlers.current.onTaskUpdated(event);
      }
    };

    // Task deleted event
    const handleTaskDeleted = (event: RealTimeTaskEvent) => {
      console.log('📋 Real-time task deleted:', event);
      if (eventHandlers.current.onTaskDeleted) {
        eventHandlers.current.onTaskDeleted(event);
      }
    };

    // Task assigned event
    const handleTaskAssigned = (event: RealTimeTaskEvent) => {
      console.log('📋 Real-time task assigned:', event);
      if (eventHandlers.current.onTaskAssigned) {
        eventHandlers.current.onTaskAssigned(event);
      }
    };

    // Task completed event
    const handleTaskCompleted = (event: RealTimeTaskEvent) => {
      console.log('📋 Real-time task completed:', event);
      if (eventHandlers.current.onTaskCompleted) {
        eventHandlers.current.onTaskCompleted(event);
      }
    };

    // Listen for task events
    socket.on('task_created', handleTaskCreated);
    socket.on('task_updated', handleTaskUpdated);
    socket.on('task_deleted', handleTaskDeleted);
    socket.on('task_assigned', handleTaskAssigned);
    socket.on('task_completed', handleTaskCompleted);

    // Cleanup function
    return () => {
      console.log('🔌 Cleaning up real-time task event listeners');
      socket.off('task_created', handleTaskCreated);
      socket.off('task_updated', handleTaskUpdated);
      socket.off('task_deleted', handleTaskDeleted);
      socket.off('task_assigned', handleTaskAssigned);
      socket.off('task_completed', handleTaskCompleted);
    };
  }, [socket, isConnected]);

  // Join exchange room when exchangeId changes
  useEffect(() => {
    if (exchangeId) {
      joinExchangeRoom(exchangeId);
    }
  }, [exchangeId, joinExchangeRoom]);

  // Join user room when user changes
  useEffect(() => {
    if (user?.id) {
      joinUserRoom();
    }
  }, [user?.id, joinUserRoom]);

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (exchangeId) {
        leaveExchangeRoom(exchangeId);
      }
      if (user?.id) {
        leaveUserRoom();
      }
    };
  }, [exchangeId, user?.id, leaveExchangeRoom, leaveUserRoom]);

  // Utility functions for manual room management
  const joinRoom = useCallback((roomType: 'exchange' | 'user', id: string) => {
    if (socket && isConnected) {
      const roomName = roomType === 'exchange' ? `exchange_${id}` : `user_${id}`;
      console.log(`🔌 Manually joining room: ${roomName}`);
      socket.emit(`join_${roomType}`, { [roomType === 'exchange' ? 'exchangeId' : 'userId']: id });
    }
  }, [socket, isConnected]);

  const leaveRoom = useCallback((roomType: 'exchange' | 'user', id: string) => {
    if (socket && isConnected) {
      const roomName = roomType === 'exchange' ? `exchange_${id}` : `user_${id}`;
      console.log(`🔌 Manually leaving room: ${roomName}`);
      socket.emit(`leave_${roomType}`, { [roomType === 'exchange' ? 'exchangeId' : 'userId']: id });
    }
  }, [socket, isConnected]);

  return {
    isConnected,
    joinRoom,
    leaveRoom,
    joinExchangeRoom,
    leaveExchangeRoom,
    joinUserRoom,
    leaveUserRoom
  };
};




























