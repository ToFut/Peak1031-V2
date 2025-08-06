import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ 
  children, 
  className, 
  padding = 'md',
  hover = false,
  onClick
}) => {
  const baseStyles = 'bg-white rounded-lg shadow border border-gray-200';
  
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const hoverStyles = hover ? 'hover:shadow-lg transition-shadow cursor-pointer' : '';

  return (
    <div 
      className={clsx(
        baseStyles,
        paddingStyles[padding],
        hoverStyles,
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

// Sub-components for Card composition
const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => (
  <div className={clsx('border-b border-gray-200 pb-3 mb-4', className)}>
    {children}
  </div>
);

const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => (
  <h3 className={clsx('text-lg font-semibold text-gray-900', className)}>
    {children}
  </h3>
);

const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => (
  <div className={clsx('text-gray-600', className)}>
    {children}
  </div>
);

const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => (
  <div className={clsx('border-t border-gray-200 pt-3 mt-4', className)}>
    {children}
  </div>
);

// Export compound component
export default Object.assign(Card, {
  Header: CardHeader,
  Title: CardTitle,
  Content: CardContent,
  Footer: CardFooter,
});