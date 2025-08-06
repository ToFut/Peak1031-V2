import React from 'react';

interface StatusBadgeProps {
  status?: string;
  className?: string;
  children?: React.ReactNode;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className, children }) => {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)} ${className}`}>
      {children || status}
    </span>
  );
};

export default StatusBadge;