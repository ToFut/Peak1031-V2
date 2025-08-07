/**
 * Route Error Boundary - Catches errors within specific routes/pages
 * Provides route-specific fallback UI without breaking the entire app
 */

import React, { Component, ReactNode } from 'react';
import { ExclamationTriangleIcon, HomeIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

interface RouteErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface RouteErrorBoundaryProps {
  children: ReactNode;
  routeName?: string;
  fallback?: ReactNode;
}

class RouteErrorBoundaryClass extends Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  constructor(props: RouteErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`RouteErrorBoundary caught an error in ${this.props.routeName || 'route'}:`, error, errorInfo);
    
    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      // Send to error monitoring service
      console.error('Route Error:', {
        route: this.props.routeName,
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Use a functional component for navigation
      return (
        <RouteErrorFallback
          routeName={this.props.routeName}
          error={this.state.error}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

// Functional component to use hooks
const RouteErrorFallback: React.FC<{
  routeName?: string;
  error: Error | null;
  onRetry: () => void;
}> = ({ routeName, error, onRetry }) => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-red-500 mb-4" />
        
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Page Error
        </h2>
        
        <p className="text-gray-600 mb-4">
          {routeName 
            ? `Something went wrong while loading the ${routeName} page.`
            : 'Something went wrong while loading this page.'
          }
        </p>

        {process.env.NODE_ENV === 'development' && error && (
          <details className="mb-6 text-left">
            <summary className="text-sm text-gray-600 cursor-pointer mb-2">
              Error Details (Development)
            </summary>
            <div className="p-3 bg-red-50 rounded-md border">
              <code className="text-xs text-red-700 block whitespace-pre-wrap">
                {error.toString()}
              </code>
            </div>
          </details>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onRetry}
            className="flex-1 flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Try Again
          </button>
          
          <button
            onClick={handleGoBack}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Go Back
          </button>
          
          <button
            onClick={handleGoHome}
            className="flex-1 flex items-center justify-center px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            <HomeIcon className="h-4 w-4 mr-2" />
            Home
          </button>
        </div>
      </div>
    </div>
  );
};

// Export with display name for better debugging
export const RouteErrorBoundary: React.FC<RouteErrorBoundaryProps> = (props) => {
  return <RouteErrorBoundaryClass {...props} />;
};

RouteErrorBoundary.displayName = 'RouteErrorBoundary';

export default RouteErrorBoundary;