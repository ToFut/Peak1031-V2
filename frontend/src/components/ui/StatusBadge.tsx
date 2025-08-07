import React from 'react';

interface StatusBadgeProps {
  status?: string | null;
  variant?: 'default' | 'pill' | 'dot';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  variant = 'default',
  size = 'md',
  className = ''
}) => {
  // Handle null/undefined status
  if (!status) {
    return (
      <span className={`
        inline-flex 
        items-center 
        font-medium 
        border
        px-2.5 py-1 text-sm
        rounded-md
        bg-gray-100 text-gray-800 border-gray-200
        ${className}
      `}>
        Unknown
      </span>
    );
  }

  const getStatusColors = (status: string) => {
    const normalizedStatus = status.toLowerCase().replace(/[_\s]/g, '');
    
    switch (normalizedStatus) {
      case 'completed':
      case 'success':
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
      case 'draft':
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'inprogress':
      case '45d':
      case '180d':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'overdue':
      case 'failed':
      case 'cancelled':
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'inactive':
      case 'disabled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return 'px-2 py-0.5 text-xs';
      case 'lg':
        return 'px-4 py-2 text-base';
      default:
        return 'px-2.5 py-1 text-sm';
    }
  };

  const getVariantClasses = (variant: string) => {
    switch (variant) {
      case 'pill':
        return 'rounded-full';
      case 'dot':
        return 'rounded-full w-3 h-3 p-0';
      default:
        return 'rounded-md';
    }
  };

  const displayText = status.replace(/[_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  if (variant === 'dot') {
    return (
      <span 
        className={`
          inline-block 
          ${getVariantClasses(variant)}
          ${getStatusColors(status)}
          border
          ${className}
        `}
        title={displayText}
      />
    );
  }

  return (
    <span className={`
      inline-flex 
      items-center 
      font-medium 
      border
      ${getSizeClasses(size)}
      ${getVariantClasses(variant)}
      ${getStatusColors(status)}
      ${className}
    `}>
      {displayText}
    </span>
  );
};

export default StatusBadge;