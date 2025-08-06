import React from 'react';

interface ModernCardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  onClick?: () => void;
}

export const ModernCard: React.FC<ModernCardProps> = ({
  title,
  subtitle,
  children,
  className = '',
  actions,
  footer,
  onClick
}) => {
  return (
    <div 
      className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {(title || subtitle || actions) && (
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
              {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </div>
      )}
      
      <div className="px-6 py-4">
        {children}
      </div>
      
      {footer && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          {footer}
        </div>
      )}
    </div>
  );
};