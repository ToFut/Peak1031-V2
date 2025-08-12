import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useRolePermissions } from '../hooks/useRolePermissions';
import { useSocket } from '../hooks/useSocket';
import { useDelayedTooltip } from '../hooks/useDelayedTooltip';
import { useEnhancedNotifications } from '../hooks/useEnhancedNotifications';
import { apiService } from '../services/api';
import { NotificationContainer } from './shared/NotificationPopup';

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
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  ArrowPathIcon,
  Bars3Icon,
  XMarkIcon,
  SparklesIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
  ChatBubbleLeftRightIcon as ChatIconSolid,
  UsersIcon as UsersIconSolid,
  DocumentDuplicateIcon as DocumentDuplicateIconSolid,
  CheckCircleIcon as CheckCircleIconSolid,
  CogIcon as CogIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  ArrowPathIcon as ArrowPathIconSolid,
  SparklesIcon as SparklesIconSolid,
  BuildingOfficeIcon as BuildingOfficeIconSolid,
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

interface LayoutProps {
  children?: React.ReactNode;
  headerContent?: React.ReactNode;
}

interface DelayedTooltipWrapperProps {
  children: React.ReactNode;
  itemName: string;
  isCollapsed: boolean;
  settings: any;
}

const DelayedTooltipWrapper: React.FC<DelayedTooltipWrapperProps> = ({ children, itemName, isCollapsed, settings }) => {
  const { showTooltip, handleMouseEnter, handleMouseLeave } = useDelayedTooltip({
    delay: (settings.menuExperience?.tooltipDelay || 4) * 1000,
    enabled: settings.menuExperience?.delayedTooltipEnabled !== false && isCollapsed
  });

  return (
    <div 
      className="relative group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {/* Delayed tooltip for collapsed state */}
      {isCollapsed && showTooltip && (
        <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 max-w-xs">
          <div className="font-medium">{itemName}</div>
          <div className="absolute top-1/2 right-full transform -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
        </div>
      )}
    </div>
  );
};

const Layout: React.FC<LayoutProps> = ({ children, headerContent }) => {
  const { user, logout } = useAuth();
  const { ui, getSidebarItems } = useRolePermissions();
  const { socket, connectionStatus } = useSocket();
  const { 
    notifications: enhancedNotifications, 
    popupNotifications, 
    unreadCount: enhancedUnreadCount, 
    removePopupNotification,
    requestBrowserPermission,
    browserPermission,
    soundEnabled,
    toggleSound
  } = useEnhancedNotifications();

  // Debug: Log user data
  
  

  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(true); // Start open by default
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [settings, setSettings] = useState<any>({});

  // Debug user state
  useEffect(() => {
    console.log('👤 Current user state:', {
      user: user ? { id: user.id, email: user.email, role: user.role, name: `${user.first_name} ${user.last_name}` } : null,
      isAuthenticated: !!user,
      loading: false
    });
  }, [user]);

  // State for desktop sidebar collapse - persist in localStorage
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // Save sidebar collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isDesktopSidebarCollapsed));
  }, [isDesktopSidebarCollapsed]);

  // Handle keyboard events for user menu
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && userMenuOpen) {
        console.log('🔍 Escape key pressed, closing user menu');
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [userMenuOpen]);

  // Load settings for menu experience
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await apiService.getSettings();
        setSettings(response || {});
      } catch (error) {
        console.log('Using default settings for menu experience');
        setSettings({
          menuExperience: {
            delayedTooltipEnabled: true,
            tooltipDelay: 4
          }
        });
      }
    };
    loadSettings();
  }, []);

  // Navigation configuration based on user role using permissions system
  const getNavigation = (): NavigationItem[] => {
    if (!user?.role) return [];
    
    // Get user's sidebar configuration from settings
    // For admin users, include additional admin-specific items
    const defaultItems = user.role === 'admin' 
      ? ['dashboard', 'exchanges', 'tasks', 'contacts', 'documents', 'messages', 'users', 'reports', 'admin_gpt', 'agencies', 'settings']
      : ['dashboard', 'exchanges', 'tasks', 'contacts', 'documents', 'messages', 'settings'];
    
    const sidebarItems = settings?.sidebar?.items || defaultItems;
    
    // Define navigation map with proper role-based access
    const navigationMap: Record<string, NavigationItem> = {
      dashboard: {
        name: ui.page_titles.dashboard || 'Dashboard',
        href: '/dashboard',
        icon: HomeIcon,
        iconSolid: HomeIconSolid,
        roles: [user.role]
      },
      exchanges: {
        name: ui.page_titles.exchanges || 'Exchanges',
        href: '/exchanges',
        icon: DocumentTextIcon,
        iconSolid: DocumentTextIconSolid,
        roles: [user.role]
      },
      tasks: {
        name: ui.page_titles.tasks || 'Tasks',
        href: '/tasks',
        icon: CheckCircleIcon,
        iconSolid: CheckCircleIconSolid,
        roles: [user.role]
      },
      users: {
        name: ui.page_titles.users || 'Users',
        href: '/admin/users',
        icon: UsersIcon,
        iconSolid: UsersIconSolid,
        roles: ['admin']
      },
      contacts: {
        name: ui.page_titles.contacts || 'Contacts',
        href: '/contacts',
        icon: UsersIcon,
        iconSolid: UsersIconSolid,
        roles: [user.role]
      },
      documents: {
        name: ui.page_titles.documents || 'Documents',
        href: '/documents',
        icon: DocumentDuplicateIcon,
        iconSolid: DocumentDuplicateIconSolid,
        roles: [user.role]
      },
      messages: {
        name: ui.page_titles.messages || 'Messages',
        href: '/messages',
        icon: ChatBubbleLeftRightIcon,
        iconSolid: ChatIconSolid,
        roles: [user.role],
        badge: unreadCount
      },
      reports: {
        name: ui.page_titles.reports || 'Reports',
        href: '/reports',
        icon: ChartBarIcon,
        iconSolid: ChartBarIconSolid,
        roles: ['admin', 'coordinator']
      },
      ai_gpt: {
        name: 'AI GPT',
        href: '/admin/gpt',
        icon: SparklesIcon,
        iconSolid: SparklesIconSolid,
        roles: ['admin']
      },
      agency_assignments: {
        name: 'Agency Assignments',
        href: '/admin/agency-assignments',
        icon: BuildingOfficeIcon,
        iconSolid: BuildingOfficeIconSolid,
        roles: ['admin']
      },
      agencies: {
        name: 'Agency Management',
        href: '/admin/agencies',
        icon: BuildingOfficeIcon,
        iconSolid: BuildingOfficeIconSolid,
        roles: ['admin']
      },
      settings: {
        name: 'Settings',
        href: '/settings',
        icon: CogIcon,
        iconSolid: CogIconSolid,
        roles: [user.role]
      }
    };

    // Return only the items that are in the user's sidebar configuration and user has access to
    const filteredItems = sidebarItems
      .map((itemKey: string) => navigationMap[itemKey])
      .filter((item: NavigationItem | undefined) => item !== undefined && item.roles.includes(user.role));
    
    // Debug: Log filtered items
    console.log('🔍 Navigation items for user:', user.role, filteredItems.map((item: NavigationItem) => item.name));
    
    // Fallback: if no items found, show basic navigation
    if (filteredItems.length === 0) {
      console.log('⚠️ No navigation items found, showing fallback navigation');
      return [
        {
          name: 'Dashboard',
          href: '/dashboard',
          icon: HomeIcon,
          iconSolid: HomeIconSolid,
          roles: [user.role]
        },
        {
          name: 'Exchanges',
          href: '/exchanges',
          icon: DocumentTextIcon,
          iconSolid: DocumentTextIconSolid,
          roles: [user.role]
        },
        {
          name: 'Tasks',
          href: '/tasks',
          icon: CheckCircleIcon,
          iconSolid: CheckCircleIconSolid,
          roles: [user.role]
        }
      ];
    }
    
    return filteredItems;
  };

  // Handle real-time notifications
  useEffect(() => {
    if (socket) {
      socket.on('notification', (notification: Notification) => {
        setNotifications(prev => [notification, ...(prev || []).slice(0, 99)]);
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
      console.log('🔄 Starting logout process...');
      setUserMenuOpen(false); // Close menu first
      await logout();
      console.log('✅ Logout successful, navigating to login');
      navigate('/login');
    } catch (error) {
      console.error('❌ Logout failed:', error);
      // Even if logout fails, clear local state and redirect
      console.log('🧹 Clearing local storage as fallback...');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      navigate('/login');
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

  // Get current context for sidebar display
  const getCurrentContext = () => {
    const path = location.pathname;
    const pathSegments = path.split('/').filter(Boolean);
    
    // Check for specific contexts
    if (path.includes('/exchanges/') && pathSegments.length > 2) {
      return {
        type: 'exchange',
        title: 'Exchange Details',
        subtitle: `ID: ${pathSegments[2]}`,
        icon: 'BuildingOfficeIcon'
      };
    }
    
    if (path.includes('/users/') && pathSegments.length > 2) {
      return {
        type: 'user',
        title: 'User Profile',
        subtitle: `ID: ${pathSegments[2]}`,
        icon: 'UsersIcon'
      };
    }
    
    if (path.includes('/messages') || path.includes('/chat')) {
      return {
        type: 'chat',
        title: 'Messages',
        subtitle: 'Communication',
        icon: 'ChatBubbleLeftRightIcon'
      };
    }
    
    if (path.includes('/documents')) {
      return {
        type: 'documents',
        title: 'Documents',
        subtitle: 'File Management',
        icon: 'DocumentTextIcon'
      };
    }
    
    if (path.includes('/tasks')) {
      return {
        type: 'tasks',
        title: 'Tasks',
        subtitle: 'Task Management',
        icon: 'CheckCircleIcon'
      };
    }
    
    if (path.includes('/contacts')) {
      return {
        type: 'contacts',
        title: 'Contacts',
        subtitle: 'Contact Management',
        icon: 'UsersIcon'
      };
    }
    
    if (path.includes('/admin')) {
      return {
        type: 'admin',
        title: 'Administration',
        subtitle: 'System Management',
        icon: 'CogIcon'
      };
    }
    
    if (path.includes('/settings') || path.includes('/profile') || path.includes('/preferences')) {
      return {
        type: 'settings',
        title: 'Settings',
        subtitle: 'User Preferences',
        icon: 'CogIcon'
      };
    }
    
    // Default dashboard context
    return {
      type: 'dashboard',
      title: 'Dashboard',
      subtitle: 'Overview',
      icon: 'HomeIcon'
    };
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Fixed and non-scrollable */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 sm:w-80 bg-white shadow-xl transform transition-all duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:flex-shrink-0 border-r border-gray-200 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } ${
        isDesktopSidebarCollapsed ? 'lg:w-16' : 'lg:w-64'
      }`}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-3 sm:px-4 border-b border-gray-200 bg-white">
          <div className="flex items-center min-w-0 flex-1">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 sm:h-10 sm:w-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-sm sm:text-lg">P</span>
              </div>
            </div>
            {!isDesktopSidebarCollapsed && (
              <div className="ml-2 sm:ml-3 min-w-0 flex-1">
                <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate">Peak 1031</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Exchange Platform</p>
              </div>
            )}
          </div>
          {/* Mobile close button only */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Current Context Display */}
        <DelayedTooltipWrapper
          itemName={`${getCurrentContext().title} - ${getCurrentContext().subtitle}`}
          isCollapsed={isDesktopSidebarCollapsed}
          settings={settings}
        >
          <div className="px-3 sm:px-4 py-3 border-b border-gray-200 bg-blue-50 hover:bg-blue-100 transition-colors duration-200 cursor-pointer">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-200 rounded-lg flex items-center justify-center shadow-sm">
                  {(() => {
                    const context = getCurrentContext();
                    const IconComponent = context.icon === 'BuildingOfficeIcon' ? BuildingOfficeIcon :
                                        context.icon === 'UsersIcon' ? UsersIcon :
                                        context.icon === 'ChatBubbleLeftRightIcon' ? ChatBubbleLeftRightIcon :
                                        context.icon === 'DocumentTextIcon' ? DocumentTextIcon :
                                        context.icon === 'CheckCircleIcon' ? CheckCircleIcon :
                                        context.icon === 'CogIcon' ? CogIcon :
                                        HomeIcon;
                    return <IconComponent className="w-4 h-4 text-blue-700" />;
                  })()}
                </div>
              </div>
              {!isDesktopSidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">
                    Current Context
                  </p>
                  <p className="text-sm font-semibold text-blue-900 truncate">
                    {getCurrentContext().title}
                  </p>
                  <p className="text-xs text-blue-600 truncate">
                    {getCurrentContext().subtitle}
                  </p>
                </div>
              )}
            </div>
          </div>
        </DelayedTooltipWrapper>

        {/* Navigation */}
        <nav className="flex-1 px-2 sm:px-4 py-4 sm:py-6 overflow-y-auto lg:overflow-y-visible">
          <div className="space-y-1 sm:space-y-2">
            {getNavigation().map((item) => {
              const Icon = isCurrentPath(item.href) ? item.iconSolid : item.icon;
              const isActive = isCurrentPath(item.href);
              
              if (item.children) {
                return (
                  <div key={item.name} className="space-y-2">
                    {!isDesktopSidebarCollapsed && (
                      <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {item.name}
                      </div>
                    )}
                    {item.children.map((child) => {
                      const ChildIcon = isCurrentPath(child.href) ? child.iconSolid : child.icon;
                      const isChildActive = isCurrentPath(child.href);
                      return (
                        <div key={child.href} className="relative group">
                          <DelayedTooltipWrapper
                            itemName={child.name}
                            isCollapsed={isDesktopSidebarCollapsed}
                            settings={settings}
                          >
                            <button
                              onClick={() => {
                                navigate(child.href);
                                setSidebarOpen(false); // Close sidebar on mobile after navigation
                              }}
                              className={`w-full group flex items-center ${isDesktopSidebarCollapsed ? 'justify-center px-2' : 'px-3 sm:px-4'} py-2.5 sm:py-3 text-sm font-medium rounded-lg sm:rounded-xl transition-all duration-200 ${
                                isChildActive
                                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                              }`}
                            >
                              <ChildIcon className={`flex-shrink-0 h-5 w-5 ${isDesktopSidebarCollapsed ? '' : 'mr-3'} ${isChildActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`} />
                              {!isDesktopSidebarCollapsed && child.name}
                            </button>
                          </DelayedTooltipWrapper>
                        </div>
                      );
                    })}
                  </div>
                );
              }

              return (
                <div key={item.href} className="relative group">
                  <DelayedTooltipWrapper
                    itemName={item.name}
                    isCollapsed={isDesktopSidebarCollapsed}
                    settings={settings}
                  >
                    <button
                      onClick={() => {
                        navigate(item.href);
                        setSidebarOpen(false); // Close sidebar on mobile after navigation
                      }}
                      className={`w-full group flex items-center ${isDesktopSidebarCollapsed ? 'justify-center px-2' : 'px-3 sm:px-4'} py-2.5 sm:py-3 text-sm font-medium rounded-lg sm:rounded-xl transition-all duration-200 ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <Icon className={`flex-shrink-0 h-5 w-5 ${isDesktopSidebarCollapsed ? '' : 'mr-3'} ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`} />
                      {!isDesktopSidebarCollapsed && (
                        <>
                          <span className="flex-1 text-left">{item.name}</span>
                          {item.badge && item.badge > 0 && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              isActive 
                                ? 'bg-white bg-opacity-20 text-white' 
                                : 'bg-red-100 text-red-600'
                            }`}>
                              {item.badge > 99 ? '99+' : item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  </DelayedTooltipWrapper>
                </div>
              );
            })}
          </div>
        </nav>

        {/* Connection Status & User Info */}
        <div className="border-t border-gray-200 p-4">
          <div className={`flex items-center ${isDesktopSidebarCollapsed ? 'justify-center' : 'justify-between'} mb-3`}>
            <div className="relative group">
              <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center shadow-sm">
                <span className="text-white text-xs font-medium">
                  {user.first_name?.[0]}{user.last_name?.[0]}
                </span>
              </div>
              {/* Tooltip for collapsed state */}
              {isDesktopSidebarCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  {user.first_name} {user.last_name}
                  <div className="absolute top-1/2 right-full transform -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
                </div>
              )}
            </div>
            {!isDesktopSidebarCollapsed && (
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  {user.first_name} {user.last_name}
                </p>
                <p className="text-xs text-gray-500">
                  {getRoleDisplayName(user.role)}
                </p>
              </div>
            )}
          </div>
          
          {!isDesktopSidebarCollapsed && (
            <div className={`flex items-center text-xs ${
              connectionStatus === 'connected' ? 'text-green-600' : 'text-red-600'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                connectionStatus === 'connected' ? 'bg-green-400' : 'bg-red-400'
              }`}></div>
              <span className="font-medium">
                {connectionStatus === 'connected' ? 'Connected' : 'Reconnecting...'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className={`flex-1 min-w-0 transition-all duration-300 ease-in-out ${
        isDesktopSidebarCollapsed ? 'lg:ml-16' : 'lg:ml-0'
      }`}>
        {/* Top navigation */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
          <div className="flex justify-between items-center px-3 sm:px-6 py-3 sm:py-4 min-h-[56px] sm:min-h-[64px]">
            <div className="flex items-center min-w-0 flex-1">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 mr-2"
              >
                <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              {/* Desktop sidebar toggle */}
              <button
                onClick={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
                className="hidden lg:flex h-10 w-10 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 items-center justify-center transition-colors"
                title={isDesktopSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <Bars3Icon className="h-5 w-5" />
              </button>
              {/* Page-specific header content */}
              {headerContent && (
                <div className="hidden lg:flex items-center flex-1 ml-4 min-w-0">
                  {headerContent}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 relative border border-gray-200"
                >
                  <BellIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                  {enhancedUnreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-500 text-white min-w-[18px] h-[18px] justify-center">
                      {enhancedUnreadCount > 9 ? '9+' : enhancedUnreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications dropdown */}
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1 max-h-96 overflow-y-auto">
                      <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => requestBrowserPermission()}
                            className={`text-xs px-2 py-1 rounded ${
                              browserPermission === 'granted' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            title={browserPermission === 'granted' ? 'Browser notifications enabled' : 'Enable browser notifications'}
                          >
                            {browserPermission === 'granted' ? '🔔' : '🔕'}
                          </button>
                          <button
                            onClick={toggleSound}
                            className={`text-xs px-2 py-1 rounded ${
                              soundEnabled 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-gray-100 text-gray-600'
                            }`}
                            title={soundEnabled ? 'Sound enabled' : 'Sound disabled'}
                          >
                            {soundEnabled ? '🔊' : '🔇'}
                          </button>
                        </div>
                      </div>
                      {enhancedNotifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-gray-500">
                          No notifications
                        </div>
                      ) : (
                        enhancedNotifications.slice(0, 10).map((notification) => (
                          <div
                            key={notification.id}
                            className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            onClick={() => {
                              if (notification.actionUrl) {
                                navigate(notification.actionUrl);
                                setNotificationsOpen(false);
                              }
                            }}
                          >
                            <div className="flex items-start">
                              <div className="flex-shrink-0 mr-3 mt-0.5">
                                {getNotificationIcon(notification.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">
                                  {notification.title}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                  {notification.message}
                                </p>
                                <div className="flex items-center justify-between mt-1">
                                  <p className="text-xs text-gray-400">
                                    {new Date(notification.timestamp).toLocaleString()}
                                  </p>
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    notification.category === 'task' ? 'bg-green-100 text-green-800' :
                                    notification.category === 'document' ? 'bg-blue-100 text-blue-800' :
                                    notification.category === 'participant' ? 'bg-purple-100 text-purple-800' :
                                    notification.category === 'message' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {notification.category}
                                  </span>
                                </div>
                                {notification.actionUrl && (
                                  <p className="text-xs text-blue-600 hover:text-blue-800 mt-1">
                                    Click to view →
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                      {enhancedNotifications.length > 10 && (
                        <div className="px-4 py-2 border-t border-gray-200">
                          <button
                            onClick={() => {
                              navigate('/notifications');
                              setNotificationsOpen(false);
                            }}
                            className="text-sm text-blue-600 hover:text-blue-500"
                          >
                            View all {enhancedNotifications.length} notifications
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
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('User menu button clicked');
                    setUserMenuOpen(!userMenuOpen);
                  }}
                  className="flex items-center space-x-2 sm:space-x-3 p-1.5 sm:p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-200 bg-white shadow-sm transition-colors cursor-pointer"
                  data-testid="user-menu-button"
                  type="button"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-xs sm:text-sm">
                      {user.first_name?.[0]}{user.last_name?.[0]}
                    </span>
                  </div>
                  <div className="text-left hidden sm:block min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {getRoleDisplayName(user.role)}
                    </p>
                  </div>
                  <ChevronDownIcon className="h-4 w-4 text-gray-400 hidden sm:block" />
                </button>

                {/* User dropdown */}
                {userMenuOpen && (
                  <div 
                    className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50"
                    data-testid="user-menu-dropdown"
                  >
                    <div className="py-1">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Navigating to profile...');
                          setUserMenuOpen(false);
                          navigate('/profile');
                        }}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left cursor-pointer"
                        type="button"
                      >
                        Profile Settings
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Navigating to preferences...');
                          setUserMenuOpen(false);
                          navigate('/preferences');
                        }}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left cursor-pointer"
                        type="button"
                      >
                        Preferences
                      </button>
                      <div className="border-t border-gray-100"></div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Logout button clicked');
                          handleLogout();
                        }}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left cursor-pointer"
                        type="button"
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
        <main className="flex-1 bg-gray-50 min-h-0">
          <div className="px-3 sm:px-6 py-4 sm:py-8">
            {children || <Outlet />}
          </div>
        </main>
      </div>

      {/* Click outside handlers - positioned before menu to avoid interference */}
      {(userMenuOpen || notificationsOpen) && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => {
            console.log('Clicking outside menu, closing...');
            setUserMenuOpen(false);
            setNotificationsOpen(false);
          }}
        />
      )}

      {/* Popup notifications */}
      <NotificationContainer 
        notifications={popupNotifications}
        onRemove={removePopupNotification}
      />
    </div>
  );
};

export default Layout;