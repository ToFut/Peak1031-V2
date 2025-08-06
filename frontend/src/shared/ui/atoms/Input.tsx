import React, { InputHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: 'default' | 'outlined' | 'filled';
  size?: 'sm' | 'md' | 'lg';
  error?: boolean;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      variant = 'default',
      size = 'md',
      error = false,
      helperText,
      leftIcon,
      rightIcon,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'w-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variants = {
      default: 'border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-500',
      outlined: 'border-2 border-gray-300 bg-transparent focus:border-blue-500 focus:ring-blue-500',
      filled: 'border-0 bg-gray-100 focus:bg-white focus:ring-blue-500',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm rounded-md',
      md: 'px-4 py-2 text-sm rounded-lg',
      lg: 'px-6 py-3 text-base rounded-lg',
    };

    const errorStyles = error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : '';

    return (
      <div className="w-full">
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {leftIcon}
            </div>
          )}
          
          <input
            ref={ref}
            className={clsx(
              baseStyles,
              variants[variant],
              sizes[size],
              errorStyles,
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              'border',
              className
            )}
            disabled={disabled}
            {...props}
          />
          
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              {rightIcon}
            </div>
          )}
        </div>
        
        {helperText && (
          <p className={clsx(
            'mt-1 text-sm',
            error ? 'text-red-600' : 'text-gray-500'
          )}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;