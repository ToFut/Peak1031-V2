import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BellIcon,
  XMarkIcon,
  CheckIcon,
  ArchiveBoxIcon,
  TrashIcon,
  Cog6ToothIcon,
  FunnelIcon,
  EllipsisVerticalIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  ShieldCheckIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline';
import {
  BellIcon as BellIconSolid,
  CheckIcon as CheckIconSolid
} from '@heroicons/react/24/solid';

interface NotificationItem {
  id: string;
  type: string;
  category: 'system' | 'task' | 'document' | 'exchange' | 'message' | 'participant' | 'deadline' | 'status' | 'security' | 'info';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'unread' | 'read' | 'archived';
  actionUrl?: string;
  actionLabel?: string;
  metadata: Record<string, any>;
  timestamp: string;
  readAt?: string;
  archivedAt?: string;
  expiresAt?: string;
  exchangeId?: string;
  sourceUserId?: string;
  read: boolean;
}

interface NotificationPreferences {
  category: string;
  emailEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  browserEnabled: boolean;
  soundEnabled: boolean;
  desktopEnabled: boolean;
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone: string;
}

interface EnhancedNotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  unreadCount: number;
}

const CATEGORIES = [
  { value: 'system', label: 'System', icon: ComputerDesktopIcon, color: 'blue' },
  { value: 'task', label: 'Tasks', icon: ClipboardDocumentListIcon, color: 'green' },
  { value: 'document', label: 'Documents', icon: DocumentTextIcon, color: 'purple' },
  { value: 'exchange', label: 'Exchanges', icon: UserGroupIcon, color: 'indigo' },
  { value: 'message', label: 'Messages', icon: ChatBubbleLeftRightIcon, color: 'yellow' },
  { value: 'participant', label: 'Participants', icon: UserGroupIcon, color: 'pink' },
  { value: 'deadline', label: 'Deadlines', icon: CalendarDaysIcon, color: 'red' },
  { value: 'status', label: 'Status', icon: InformationCircleIcon, color: 'gray' },
  { value: 'security', label: 'Security', icon: ShieldCheckIcon, color: 'red' },
  { value: 'info', label: 'Information', icon: InformationCircleIcon, color: 'blue' }
];

const PRIORITIES = [
  { value: 'urgent', label: 'Urgent', color: 'red' },
  { value: 'high', label: 'High', color: 'orange' },
  { value: 'medium', label: 'Medium', color: 'yellow' },
  { value: 'low', label: 'Low', color: 'gray' }
];

export const EnhancedNotificationCenter: React.FC<EnhancedNotificationCenterProps> = ({
  isOpen,
  onClose,
  unreadCount
}) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority'>('newest');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = async (pageNum = 1, filters = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '20',
        ...filters
      });

      const response = await fetch(`/api/notifications-enhanced?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (pageNum === 1) {
          setNotifications(data.notifications);
        } else {
          setNotifications(prev => [...prev, ...data.notifications]);
        }
        setTotalPages(data.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch notification preferences
  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/notifications-enhanced/preferences', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
      fetchPreferences();
    }
  }, [isOpen]);

  // Apply filters
  useEffect(() => {
    const filters: any = {};
    if (selectedCategory !== 'all') filters.category = selectedCategory;
    if (selectedStatus !== 'all') filters.status = selectedStatus;
    if (selectedPriority !== 'all') filters.priority = selectedPriority;

    if (isOpen) {
      setPage(1);
      fetchNotifications(1, filters);
    }
  }, [selectedCategory, selectedStatus, selectedPriority, isOpen]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications-enhanced/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId ? { ...n, status: 'read', read: true, readAt: new Date().toISOString() } : n
          )
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications-enhanced/mark-all-read', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, status: 'read' as const, read: true, readAt: new Date().toISOString() }))
        );
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Archive notification
  const archiveNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications-enhanced/${notificationId}/archive`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId ? { ...n, status: 'archived', archivedAt: new Date().toISOString() } : n
          )
        );
      }
    } catch (error) {
      console.error('Error archiving notification:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications-enhanced/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification: NotificationItem) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      onClose();
    }
  };

  // Load more notifications
  const loadMore = () => {
    if (page < totalPages && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchNotifications(nextPage, {
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        priority: selectedPriority !== 'all' ? selectedPriority : undefined
      });
    }
  };

  // Get category info
  const getCategoryInfo = (category: string) => {
    return CATEGORIES.find(c => c.value === category) || CATEGORIES[0];
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    const priorityInfo = PRIORITIES.find(p => p.value === priority);
    return priorityInfo?.color || 'gray';
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // Filter and sort notifications
  const filteredNotifications = notifications
    .filter(n => {
      if (searchTerm) {
        return n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
               n.message.toLowerCase().includes(searchTerm.toLowerCase());
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        case 'newest':
        default:
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
    });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      {/* Notification Panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BellIconSolid className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
              {unreadCount > 0 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                title="Settings"
              >
                <Cog6ToothIcon className="h-5 w-5" />
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mt-3 space-y-2">
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            <div className="flex space-x-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
              
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="flex justify-between items-center">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="priority">By Priority</option>
              </select>
              
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Mark All Read
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto"
          onScroll={(e) => {
            const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
            if (scrollHeight - scrollTop === clientHeight) {
              loadMore();
            }
          }}
        >
          {loading && filteredNotifications.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <BellIcon className="h-8 w-8 mb-2" />
              <p className="text-sm">No notifications found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredNotifications.map((notification) => {
                const categoryInfo = getCategoryInfo(notification.category);
                const CategoryIcon = categoryInfo.icon;
                
                return (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Category Icon */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-${categoryInfo.color}-100 flex items-center justify-center`}>
                        <CategoryIcon className={`h-4 w-4 text-${categoryInfo.color}-600`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h4 className={`text-sm font-medium truncate ${
                            !notification.read ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </h4>
                          
                          {/* Priority Indicator */}
                          <div className={`flex-shrink-0 w-2 h-2 rounded-full bg-${getPriorityColor(notification.priority)}-400 ml-2 mt-1`} />
                        </div>
                        
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <ClockIcon className="h-3 w-3" />
                            <span>{formatTimestamp(notification.timestamp)}</span>
                            <span className={`px-2 py-1 rounded-full bg-${categoryInfo.color}-100 text-${categoryInfo.color}-800`}>
                              {categoryInfo.label}
                            </span>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex items-center space-x-1">
                            {!notification.read && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                                className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-100"
                                title="Mark as read"
                              >
                                <CheckIcon className="h-3 w-3" />
                              </button>
                            )}
                            
                            {notification.status !== 'archived' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  archiveNotification(notification.id);
                                }}
                                className="p-1 rounded text-gray-400 hover:text-yellow-600 hover:bg-yellow-100"
                                title="Archive"
                              >
                                <ArchiveBoxIcon className="h-3 w-3" />
                              </button>
                            )}
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-100"
                              title="Delete"
                            >
                              <TrashIcon className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        {/* Action Button */}
                        {notification.actionUrl && notification.actionLabel && (
                          <button className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium">
                            {notification.actionLabel} →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Load More */}
              {page < totalPages && (
                <div className="p-4 text-center">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};