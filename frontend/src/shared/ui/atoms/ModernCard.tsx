import React from 'react';

interface ModernCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'sm' | 'md' | 'lg';
  shadow?: 'sm' | 'md' | 'lg' | 'xl';
  onClick?: () => void;
}

const ModernCard: React.FC<ModernCardProps> = ({ 
  children, 
  className = '',
  hover = false,
  padding = 'md',
  shadow = 'md',
  onClick
}) => {
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8'
  };

  const shadowClasses = {
    sm: 'shadow-sm',
    md: 'shadow',
    lg: 'shadow-lg',
    xl: 'shadow-xl'
  };

  return (
    <div 
      className={`
        bg-white 
        rounded-lg 
        border 
        border-gray-200 
        ${shadowClasses[shadow]}
        ${paddingClasses[padding]}
        ${hover ? 'hover:shadow-lg hover:border-gray-300 transition-all duration-200' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default ModernCard;