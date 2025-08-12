import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircleIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  XMarkIcon,
  DocumentTextIcon,
  CheckIcon,
  UsersIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

interface PopupNotification {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  category: 'task' | 'document' | 'participant' | 'message' | 'system';
  autoClose?: boolean;
  duration?: number;
  actionUrl?: string;
}

interface NotificationPopupProps {
  notification: PopupNotification;
  onRemove: (id: string) => void;
  position: number;
}

const NotificationPopup: React.FC<NotificationPopupProps> = ({
  notification,
  onRemove,
  position
}) => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  // Show animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Auto remove
  useEffect(() => {
    if (notification.autoClose !== false) {
      const timer = setTimeout(() => {
        handleRemove();
      }, notification.duration || 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(() => {
      onRemove(notification.id);
    }, 300); // Match animation duration
  };

  const handleClick = () => {
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
    handleRemove();
  };

  const getIcon = () => {
    if (notification.category === 'task') {
      return <CheckIcon className="h-5 w-5" />;
    }
    if (notification.category === 'document') {
      return <DocumentTextIcon className="h-5 w-5" />;
    }
    if (notification.category === 'participant') {
      return <UsersIcon className="h-5 w-5" />;
    }
    if (notification.category === 'message') {
      return <ChatBubbleLeftRightIcon className="h-5 w-5" />;
    }

    switch (notification.type) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5" />;
      case 'error':
        return <XCircleIcon className="h-5 w-5" />;
      default:
        return <InformationCircleIcon className="h-5 w-5" />;
    }
  };

  const getColors = () => {
    switch (notification.type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: 'text-green-600',
          title: 'text-green-900',
          message: 'text-green-700'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          icon: 'text-yellow-600',
          title: 'text-yellow-900',
          message: 'text-yellow-700'
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: 'text-red-600',
          title: 'text-red-900',
          message: 'text-red-700'
        };
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: 'text-blue-600',
          title: 'text-blue-900',
          message: 'text-blue-700'
        };
    }
  };

  const colors = getColors();

  return (
    <div
      className={`fixed right-4 z-50 w-80 max-w-[calc(100vw-2rem)] transform transition-all duration-300 ease-out ${
        isVisible && !isRemoving 
          ? 'translate-x-0 opacity-100' 
          : 'translate-x-full opacity-0'
      }`}
      style={{
        top: `${20 + position * 90}px`
      }}
    >
      <div
        className={`${colors.bg} ${colors.border} border rounded-lg shadow-lg pointer-events-auto overflow-hidden hover:shadow-xl transition-shadow duration-200 ${
          notification.actionUrl ? 'cursor-pointer' : ''
        }`}
        onClick={notification.actionUrl ? handleClick : undefined}
      >
        {/* Progress bar for auto-close */}
        {notification.autoClose !== false && (
          <div className="h-1 bg-gray-200 overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all ease-linear shrink-animation"
              style={{
                animationDuration: `${notification.duration || 5000}ms`
              }}
            />
          </div>
        )}

        <div className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className={`${colors.icon}`}>
                {getIcon()}
              </div>
            </div>
            <div className="ml-3 w-0 flex-1">
              <p className={`text-sm font-medium ${colors.title}`}>
                {notification.title}
              </p>
              <p className={`mt-1 text-sm ${colors.message}`}>
                {notification.message}
              </p>
              {notification.actionUrl && (
                <p className="mt-2 text-xs text-blue-600 hover:text-blue-800">
                  Click to view →
                </p>
              )}
            </div>
            <div className="ml-4 flex-shrink-0 flex">
              <button
                className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
              >
                <span className="sr-only">Close</span>
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface NotificationContainerProps {
  notifications: PopupNotification[];
  onRemove: (id: string) => void;
}

export const NotificationContainer: React.FC<NotificationContainerProps> = ({
  notifications,
  onRemove
}) => {
  return (
    <>
      {notifications.map((notification, index) => (
        <NotificationPopup
          key={notification.id}
          notification={notification}
          onRemove={onRemove}
          position={index}
        />
      ))}
    </>
  );
};

export default NotificationPopup;