import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { apiService } from '../services/api';

// Icons (using heroicons or lucide-react)
import {
  HomeIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  UsersIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
  CogIcon,
  BellIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  ChatBubbleLeftRightIcon as ChatIconSolid,
  UsersIcon as UsersIconSolid,
  DocumentDuplicateIcon as DocumentDuplicateIconSolid,
  CheckCircleIcon as CheckCircleIconSolid,
  CogIcon as CogIconSolid,
} from '@heroicons/react/24/solid';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  iconSolid: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  roles: string[];
  badge?: number;
  children?: NavigationItem[];
}



interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  created_at: string;
  read: boolean;
}

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const { socket, connectionStatus } = useSocket();

  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Navigation configuration based on user role
  const getNavigation = (): NavigationItem[] => {
    const baseNavigation: NavigationItem[] = [
      {
        name: 'Dashboard',
        href: '/dashboard',
        icon: HomeIcon,
        iconSolid: HomeIconSolid,
        roles: ['admin', 'client', 'coordinator', 'third_party', 'agency']
      },
      {
        name: 'Exchanges',
        href: '/exchanges',
        icon: DocumentTextIcon,
        iconSolid: DocumentTextIconSolid,
        roles: ['admin', 'client', 'coordinator', 'third_party', 'agency']
      },
      {
        name: 'Tasks',
        href: '/tasks',
        icon: CheckCircleIcon,
        iconSolid: CheckCircleIconSolid,
        roles: ['admin', 'coordinator', 'client']
      },
      {
        name: 'Documents',
        href: '/documents',
        icon: DocumentDuplicateIcon,
        iconSolid: DocumentDuplicateIconSolid,
        roles: ['admin', 'client', 'coordinator', 'third_party', 'agency']
      },
      {
        name: 'Messages',
        href: '/messages',
        icon: ChatBubbleLeftRightIcon,
        iconSolid: ChatIconSolid,
        roles: ['admin', 'client', 'coordinator', 'agency'],
        badge: unreadCount
      }
    ];

    // Admin-specific navigation
    if (user?.role === 'admin') {
      baseNavigation.push(
        {
          name: 'Users',
          href: '/users',
          icon: UsersIcon,
          iconSolid: UsersIconSolid,
          roles: ['admin']
        },
        {
          name: 'System',
          href: '/system',
          icon: CogIcon,
          iconSolid: CogIconSolid,
          roles: ['admin'],
          children: [
            { name: 'Sync Status', href: '/system/sync', icon: CogIcon, iconSolid: CogIconSolid, roles: ['admin'] },
            { name: 'Audit Logs', href: '/system/audit', icon: CogIcon, iconSolid: CogIconSolid, roles: ['admin'] },
            { name: 'Settings', href: '/system/settings', icon: CogIcon, iconSolid: CogIconSolid, roles: ['admin'] }
          ]
        }
      );
    }

    // Filter navigation based on user role
    return baseNavigation.filter(item => 
      user?.role && item.roles.includes(user.role)
    );
  };

  // Handle real-time notifications
  useEffect(() => {
    if (socket) {
      socket.on('notification', (notification: Notification) => {
        setNotifications(prev => [notification, ...prev.slice(0, 99)]);
        if (!notification.read) {
          setUnreadCount(prev => prev + 1);
        }
      });

      socket.on('notification_read', (notificationId: string) => {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      });

      return () => {
        socket.off('notification');
        socket.off('notification_read');
      };
    }
  }, [socket]);

  // Load initial notifications
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const notifications = await apiService.getNotifications();
        setNotifications(notifications || []);
        setUnreadCount(notifications.filter(n => !n.read).length || 0);
      } catch (error) {
        console.error('Failed to load notifications:', error);
        // Set empty arrays to prevent further errors
        setNotifications([]);
        setUnreadCount(0);
      }
    };

    if (user) {
      loadNotifications();
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await apiService.markNotificationAsRead(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const isCurrentPath = (href: string): boolean => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const getRoleDisplayName = (role: string): string => {
    const roleNames = {
      admin: 'Administrator',
      client: 'Client',
      coordinator: 'Exchange Coordinator',
      third_party: 'Third Party',
      agency: 'Agency User'
    };
    return roleNames[role as keyof typeof roleNames] || role;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />;
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-400" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-blue-400" />;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <img 
                className="h-8 w-8" 
                src="/logo.svg" 
                alt="Peak 1031" 
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                  (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'block';
                }}
              />
              <div className="h-8 w-8 bg-blue-600 rounded hidden items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
            </div>
            <span className="ml-2 text-xl font-semibold text-gray-900">Peak 1031</span>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {getNavigation().map((item) => {
              const Icon = isCurrentPath(item.href) ? item.iconSolid : item.icon;
              
              if (item.children) {
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {item.name}
                    </div>
                    {item.children.map((child) => {
                      const ChildIcon = isCurrentPath(child.href) ? child.iconSolid : child.icon;
                      return (
                        <button
                          key={child.href}
                          onClick={() => navigate(child.href)}
                          className={`w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
                            isCurrentPath(child.href)
                              ? 'bg-blue-100 text-blue-700'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <ChildIcon className="flex-shrink-0 h-5 w-5 mr-3" />
                          {child.name}
                        </button>
                      );
                    })}
                  </div>
                );
              }

              return (
                <button
                  key={item.href}
                  onClick={() => navigate(item.href)}
                  className={`w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
                    isCurrentPath(item.href)
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="flex-shrink-0 h-5 w-5 mr-3" />
                  {item.name}
                  {item.badge && item.badge > 0 && (
                    <span className="ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Connection Status */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className={`flex items-center text-xs ${
            connectionStatus === 'connected' ? 'text-green-600' : 'text-red-600'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              connectionStatus === 'connected' ? 'bg-green-400' : 'bg-red-400'
            }`}></div>
            {connectionStatus === 'connected' ? 'Connected' : 'Reconnecting...'}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`transition-all duration-300 ease-in-out ${
        sidebarOpen ? 'ml-64' : 'ml-0'
      }`}>
        {/* Top navigation */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex justify-between items-center px-6 py-4">
            <div className="flex items-center">
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mr-4"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              )}
              <h1 className="text-2xl font-semibold text-gray-900">
                {getNavigation().find(item => isCurrentPath(item.href))?.name || 'Dashboard'}
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 relative"
                >
                  <BellIcon className="h-6 w-6" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-500 text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications dropdown */}
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1 max-h-96 overflow-y-auto">
                      <div className="px-4 py-2 border-b border-gray-200">
                        <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                      </div>
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-gray-500">
                          No notifications
                        </div>
                      ) : (
                        notifications.slice(0, 10).map((notification) => (
                          <div
                            key={notification.id}
                            className={`px-4 py-3 hover:bg-gray-50 cursor-pointer ${
                              !notification.read ? 'bg-blue-50' : ''
                            }`}
                            onClick={() => !notification.read && markNotificationAsRead(notification.id)}
                          >
                            <div className="flex items-start">
                              <div className="flex-shrink-0 mr-3 mt-0.5">
                                {getNotificationIcon(notification.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm ${!notification.read ? 'font-medium' : ''} text-gray-900`}>
                                  {notification.title}
                                </p>
                                <p className="text-sm text-gray-500 mt-1">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(notification.created_at).toLocaleString()}
                                </p>
                              </div>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                      {notifications.length > 10 && (
                        <div className="px-4 py-2 border-t border-gray-200">
                          <button
                            onClick={() => navigate('/notifications')}
                            className="text-sm text-blue-600 hover:text-blue-500"
                          >
                            View all notifications
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {user.first_name?.[0]}{user.last_name?.[0]}
                    </span>
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-900">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {getRoleDisplayName(user.role)}
                    </p>
                  </div>
                  <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                </button>

                {/* User dropdown */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          navigate('/profile');
                          setUserMenuOpen(false);
                        }}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        Profile Settings
                      </button>
                      <button
                        onClick={() => {
                          navigate('/preferences');
                          setUserMenuOpen(false);
                        }}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        Preferences
                      </button>
                      <div className="border-t border-gray-100"></div>
                      <button
                        onClick={handleLogout}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        <div className="flex items-center">
                          <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                          Sign out
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1">
          <div className="px-6 py-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Click outside handlers */}
      {(userMenuOpen || notificationsOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setUserMenuOpen(false);
            setNotificationsOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default Layout;