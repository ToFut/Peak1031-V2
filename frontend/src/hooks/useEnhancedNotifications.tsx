import { useState, useEffect, useCallback } from 'react';
import { useSocket, useSocketEvent } from './useSocket';
import { useAuth } from './useAuth';

interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  category: 'task' | 'document' | 'participant' | 'message' | 'system';
  exchangeId?: string;
  exchangeName?: string;
  userId?: string;
  userName?: string;
  timestamp: string;
  persistent?: boolean;
  actionUrl?: string;
}

interface PopupNotification extends NotificationData {
  id: string;
  autoClose?: boolean;
  duration?: number;
}

interface BrowserNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
}

export const useEnhancedNotifications = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  
  // State
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [popupNotifications, setPopupNotifications] = useState<PopupNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Load initial notifications from API
  useEffect(() => {
    const loadNotifications = async () => {
      if (!user?.id) return;
      
      try {
        console.log('🔔 Loading initial notifications from API...');
        const { default: apiService } = await import('../services/api');
        const apiNotifications = await apiService.getNotifications();
        console.log('✅ Loaded notifications from API:', apiNotifications.length);
        
        if (apiNotifications && apiNotifications.length > 0) {
          const formattedNotifications = apiNotifications.map(n => ({
            id: n.id || `api_${Date.now()}_${Math.random()}`,
            title: n.title || 'Notification',
            message: n.message || '',
            type: n.type || 'info' as const,
            category: 'system' as const,
            timestamp: n.created_at || new Date().toISOString(),
            read: n.read || false,
            actionUrl: n.action_url || n.data?.actionUrl,
            metadata: n.data || {}
          }));
          
          setNotifications(formattedNotifications);
          setUnreadCount(formattedNotifications.filter(n => !n.read).length);
          console.log(`✅ Set ${formattedNotifications.length} notifications, ${formattedNotifications.filter(n => !n.read).length} unread`);
        }
      } catch (error) {
        console.error('❌ Failed to load notifications from API:', error);
      }
    };

    loadNotifications();
  }, [user?.id]);

  // Audio for notification sounds
  const [notificationSound] = useState(() => {
    const audio = new Audio();
    // Use a simple beep sound data URL or load from assets
    audio.src = 'data:audio/wav;base64,UklGRvIAAABXQVZFZm10IBAAAAABAAEALQAAAFQAAAACABAAZGF0YQoAAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBT+z4O/Abq+2e3MhBiRz6P7c8z4f';
    audio.volume = 0.3;
    return audio;
  });

  // Initialize browser notifications permission
  useEffect(() => {
    if ('Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
  }, []);

  // Request browser notification permission
  const requestBrowserPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('Browser notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      setBrowserPermission(permission);
      return permission === 'granted';
    }

    return false;
  }, []);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (soundEnabled) {
      try {
        notificationSound.currentTime = 0;
        notificationSound.play().catch(console.warn);
      } catch (error) {
        console.warn('Failed to play notification sound:', error);
      }
    }
  }, [soundEnabled, notificationSound]);

  // Show browser notification
  const showBrowserNotification = useCallback(async (options: BrowserNotificationOptions): Promise<Notification | null> => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return null;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        tag: options.tag,
        data: options.data,
        requireInteraction: options.requireInteraction || false,
        silent: false
      });

      // Auto close after 5 seconds unless requireInteraction is true
      if (!options.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      // Handle click events
      notification.onclick = () => {
        window.focus();
        if (options.data?.actionUrl) {
          window.location.href = options.data.actionUrl;
        }
        notification.close();
      };

      return notification;
    } catch (error) {
      console.error('Failed to show browser notification:', error);
      return null;
    }
  }, []);

  // Add popup notification
  const addPopupNotification = useCallback((notification: PopupNotification) => {
    const id = notification.id || Date.now().toString();
    const fullNotification = {
      ...notification,
      id,
      autoClose: notification.autoClose !== false,
      duration: notification.duration || 5000
    };

    setPopupNotifications(prev => [fullNotification, ...prev.slice(0, 4)]); // Keep max 5 popups

    // Auto remove after duration
    if (fullNotification.autoClose) {
      setTimeout(() => {
        removePopupNotification(id);
      }, fullNotification.duration);
    }

    return id;
  }, []);

  // Remove popup notification
  const removePopupNotification = useCallback((id: string) => {
    setPopupNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Create notification from real-time events
  const createNotificationFromEvent = useCallback((eventType: string, data: any): NotificationData => {
    const timestamp = new Date().toISOString();
    const baseNotification = {
      id: `${eventType}_${data.taskId || data.documentId || data.participantId || Date.now()}`,
      timestamp,
      exchangeId: data.exchangeId || data.exchange_id,
      exchangeName: data.exchangeName,
      userId: data.createdBy || data.uploadedBy || data.addedBy || data.updatedBy || data.deletedBy || data.removedBy,
      userName: data.userName,
    };

    switch (eventType) {
      case 'task_created':
        return {
          ...baseNotification,
          title: 'New Task Created',
          message: `Task "${data.task?.title || 'Untitled'}" was created${data.exchangeName ? ` in ${data.exchangeName}` : ''}`,
          type: 'success',
          category: 'task',
          actionUrl: `/exchanges/${data.exchangeId || data.exchange_id}?tab=tasks`
        };

      case 'task_updated':
        return {
          ...baseNotification,
          title: 'Task Updated',
          message: `Task "${data.task?.title || 'Untitled'}" was updated${data.exchangeName ? ` in ${data.exchangeName}` : ''}`,
          type: 'info',
          category: 'task',
          actionUrl: `/exchanges/${data.exchangeId || data.exchange_id}?tab=tasks`
        };

      case 'task_deleted':
        return {
          ...baseNotification,
          title: 'Task Deleted',
          message: `A task was deleted${data.exchangeName ? ` from ${data.exchangeName}` : ''}`,
          type: 'warning',
          category: 'task',
          actionUrl: `/exchanges/${data.exchangeId || data.exchange_id}?tab=tasks`
        };

      case 'document_uploaded':
        return {
          ...baseNotification,
          title: 'New Document Uploaded',
          message: `Document "${data.document?.name || 'Untitled'}" was uploaded${data.exchangeName ? ` to ${data.exchangeName}` : ''}`,
          type: 'success',
          category: 'document',
          actionUrl: `/exchanges/${data.exchangeId || data.exchange_id}?tab=documents`
        };

      case 'participant_added':
        return {
          ...baseNotification,
          title: 'Participant Added',
          message: `A new participant was added${data.exchangeName ? ` to ${data.exchangeName}` : ''}`,
          type: 'success',
          category: 'participant',
          actionUrl: `/exchanges/${data.exchangeId || data.exchange_id}?tab=participants`
        };

      case 'participant_removed':
        return {
          ...baseNotification,
          title: 'Participant Removed',
          message: `A participant was removed${data.exchangeName ? ` from ${data.exchangeName}` : ''}`,
          type: 'warning',
          category: 'participant',
          actionUrl: `/exchanges/${data.exchangeId || data.exchange_id}?tab=participants`
        };

      case 'new_message':
        return {
          ...baseNotification,
          title: 'New Message',
          message: `${data.sender?.first_name || 'Someone'} sent a message${data.exchangeName ? ` in ${data.exchangeName}` : ''}`,
          type: 'info',
          category: 'message',
          actionUrl: `/exchanges/${data.exchangeId || data.exchange_id}?tab=chat`
        };

      default:
        return {
          ...baseNotification,
          title: 'New Activity',
          message: `Activity occurred${data.exchangeName ? ` in ${data.exchangeName}` : ''}`,
          type: 'info',
          category: 'system',
          actionUrl: (data.exchangeId || data.exchange_id) ? `/exchanges/${data.exchangeId || data.exchange_id}` : '/dashboard'
        };
    }
  }, []);

  // Handle real-time notification
  const handleRealTimeNotification = useCallback(async (eventType: string, data: any) => {
    console.log('🔔 Handling real-time notification:', { eventType, data });
    
    // Don't notify for own actions
    if (data.createdBy === user?.id || data.uploadedBy === user?.id || 
        data.addedBy === user?.id || data.updatedBy === user?.id || 
        data.deletedBy === user?.id || data.removedBy === user?.id) {
      console.log('🔔 Skipping notification for own action');
      return;
    }

    const notification = createNotificationFromEvent(eventType, data);
    console.log('🔔 Created notification:', notification);
    
    // Add to notifications list
    setNotifications(prev => [notification, ...prev.slice(0, 99)]);
    setUnreadCount(prev => prev + 1);

    // Show popup notification
    addPopupNotification({
      ...notification,
      autoClose: true,
      duration: 5000
    });

    // Play sound
    playNotificationSound();

    // Show browser notification
    if (browserPermission === 'granted') {
      showBrowserNotification({
        title: notification.title,
        body: notification.message,
        tag: `${notification.category}_${notification.exchangeId}`,
        data: { actionUrl: notification.actionUrl },
        requireInteraction: notification.type === 'error'
      });
    }
  }, [user?.id, createNotificationFromEvent, addPopupNotification, playNotificationSound, browserPermission, showBrowserNotification]);

  // Socket event listeners
  useSocketEvent('task_created', useCallback((data: any) => {
    handleRealTimeNotification('task_created', data);
  }, [handleRealTimeNotification]));

  useSocketEvent('task_updated', useCallback((data: any) => {
    handleRealTimeNotification('task_updated', data);
  }, [handleRealTimeNotification]));

  useSocketEvent('task_deleted', useCallback((data: any) => {
    handleRealTimeNotification('task_deleted', data);
  }, [handleRealTimeNotification]));

  useSocketEvent('document_uploaded', useCallback((data: any) => {
    handleRealTimeNotification('document_uploaded', data);
  }, [handleRealTimeNotification]));

  useSocketEvent('participant_added', useCallback((data: any) => {
    handleRealTimeNotification('participant_added', data);
  }, [handleRealTimeNotification]));

  useSocketEvent('participant_removed', useCallback((data: any) => {
    handleRealTimeNotification('participant_removed', data);
  }, [handleRealTimeNotification]));

  useSocketEvent('new_message', useCallback((data: any) => {
    console.log('🔔 Received new_message socket event:', data);
    handleRealTimeNotification('new_message', data);
  }, [handleRealTimeNotification]));

  // Listen for invitation notifications specifically
  useSocketEvent('invitation_notification', useCallback((data: any) => {
    console.log('🔔 Received invitation notification:', data);
    // Create immediate notification for invitations
    const notification = {
      id: `invitation_${Date.now()}`,
      title: data.title || 'New Invitation',
      message: data.message || 'You have been invited to an exchange',
      type: 'info' as const,
      category: 'participant' as const,
      actionUrl: data.actionUrl || '/exchanges',
      timestamp: new Date().toISOString()
    };

    // Add to notifications list
    setNotifications(prev => [notification, ...prev.slice(0, 99)]);
    setUnreadCount(prev => prev + 1);

    // Show popup notification immediately
    addPopupNotification({
      ...notification,
      autoClose: true,
      duration: 8000 // Longer duration for invitations
    });

    // Play sound
    playNotificationSound();

    // Show browser notification
    if (browserPermission === 'granted') {
      showBrowserNotification({
        title: notification.title,
        body: notification.message,
        tag: `invitation_${data.exchangeId}`,
        data: { actionUrl: notification.actionUrl },
        requireInteraction: true // Keep visible until user interacts
      });
    }
  }, [addPopupNotification, playNotificationSound, browserPermission, showBrowserNotification]));

  // Listen for notification read events from other sessions
  useSocketEvent('notification_read', useCallback((data: any) => {
    console.log('🔔 Received notification_read event:', data);
    if (data.notificationId) {
      setNotifications(prev =>
        prev.map(n => n.id === data.notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }, []));

  // Listen for new database notifications
  useSocketEvent('database_notification_created', useCallback((data: any) => {
    console.log('🔔 Received database_notification_created event:', data);
    if (data.notification) {
      const notification = {
        id: data.notification.id,
        title: data.notification.title,
        message: data.notification.message,
        type: data.notification.type || 'info' as const,
        category: 'system' as const,
        timestamp: data.notification.created_at,
        read: false,
        actionUrl: data.notification.action_url,
        metadata: {}
      };

      // Add to notifications list
      setNotifications(prev => [notification, ...prev.slice(0, 99)]);
      setUnreadCount(prev => prev + 1);

      // Show popup notification immediately
      addPopupNotification({
        ...notification,
        autoClose: true,
        duration: 8000
      });

      // Play sound
      playNotificationSound();

      // Show browser notification
      if (browserPermission === 'granted') {
        showBrowserNotification({
          title: notification.title,
          body: notification.message,
          tag: `db_notification_${notification.id}`,
          data: { actionUrl: notification.actionUrl },
          requireInteraction: true
        });
      }
    }
  }, [addPopupNotification, playNotificationSound, browserPermission, showBrowserNotification]));

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Clear all popup notifications
  const clearAllPopups = useCallback(() => {
    setPopupNotifications([]);
  }, []);

  // Toggle sound
  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => !prev);
    localStorage.setItem('notificationSound', (!soundEnabled).toString());
  }, [soundEnabled]);

  // Load sound preference
  useEffect(() => {
    const savedSoundEnabled = localStorage.getItem('notificationSound');
    if (savedSoundEnabled !== null) {
      setSoundEnabled(savedSoundEnabled === 'true');
    }
  }, []);

  // Check for new invitations/exchanges when user logs in
  useEffect(() => {
    if (user) {
      const checkNewExchangeAccess = async () => {
        try {
          // Check if user has been added to new exchanges since last login
          const lastLoginCheck = localStorage.getItem(`lastLoginCheck_${user.id}`);
          const currentTime = new Date().toISOString();
          
          if (!lastLoginCheck) {
            // First time login check - just set the timestamp
            localStorage.setItem(`lastLoginCheck_${user.id}`, currentTime);
            return;
          }

          // Simple notification for users who might have been invited while offline
          const timeSinceLastCheck = Date.now() - new Date(lastLoginCheck).getTime();
          const hoursAgo = Math.floor(timeSinceLastCheck / (1000 * 60 * 60));
          
          if (hoursAgo > 1) { // If more than 1 hour since last check
            // Show a gentle notification encouraging them to check for updates
            addPopupNotification({
              id: `login_check_${Date.now()}`,
              title: 'Welcome back!',
              message: `You may have new exchanges or updates. Check your exchanges tab if you don't see recent changes.`,
              type: 'info',
              category: 'system',
              autoClose: true,
              duration: 8000,
              actionUrl: '/exchanges',
              timestamp: new Date().toISOString()
            });
          }
          
          // Update last login check time
          localStorage.setItem(`lastLoginCheck_${user.id}`, currentTime);
          
        } catch (error) {
          console.error('Error checking for new exchange access:', error);
        }
      };

      // Run check immediately and also after a short delay to catch any missed updates
      checkNewExchangeAccess();
      const timer = setTimeout(checkNewExchangeAccess, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, addPopupNotification]);

  return {
    // State
    notifications,
    popupNotifications,
    unreadCount,
    browserPermission,
    soundEnabled,

    // Actions
    requestBrowserPermission,
    addPopupNotification,
    removePopupNotification,
    markAsRead,
    clearAllNotifications,
    clearAllPopups,
    toggleSound,

    // Utilities
    showBrowserNotification,
    playNotificationSound
  };
};

export default useEnhancedNotifications;