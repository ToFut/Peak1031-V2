import React, { Suspense, lazy } from 'react';

interface LazyLoaderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  delay?: number;
}

// Skeleton loading components
const SkeletonCard = () => (
  <div className="animate-pulse">
    <div className="bg-gray-200 rounded-lg h-48 mb-4"></div>
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
  </div>
);

const SkeletonTable = () => (
  <div className="animate-pulse">
    <div className="bg-gray-200 rounded-lg h-8 mb-4"></div>
    {[...Array(5)].map((_, i) => (
      <div key={i} className="bg-gray-200 rounded-lg h-12 mb-2"></div>
    ))}
  </div>
);

const SkeletonList = () => (
  <div className="animate-pulse space-y-4">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="flex items-center space-x-4">
        <div className="rounded-full bg-gray-200 h-12 w-12"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    ))}
  </div>
);

const SkeletonGrid = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[...Array(6)].map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

// Default fallback with delay
const DelayedFallback: React.FC<{ delay: number; children: React.ReactNode }> = ({ delay, children }) => {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return show ? <>{children}</> : null;
};

export const LazyLoader: React.FC<LazyLoaderProps> = ({ 
  children, 
  fallback = <SkeletonCard />, 
  delay = 200 
}) => {
  return (
    <Suspense fallback={<DelayedFallback delay={delay}>{fallback}</DelayedFallback>}>
      {children}
    </Suspense>
  );
};

// Pre-configured lazy loaders
export const LazyCard = ({ children }: { children: React.ReactNode }) => (
  <LazyLoader fallback={<SkeletonCard />}>{children}</LazyLoader>
);

export const LazyTable = ({ children }: { children: React.ReactNode }) => (
  <LazyLoader fallback={<SkeletonTable />}>{children}</LazyLoader>
);

export const LazyList = ({ children }: { children: React.ReactNode }) => (
  <LazyLoader fallback={<SkeletonList />}>{children}</LazyLoader>
);

export const LazyGrid = ({ children }: { children: React.ReactNode }) => (
  <LazyLoader fallback={<SkeletonGrid />}>{children}</LazyLoader>
);

// Lazy load specific components
export const LazyDocuments = lazy(() => import('../documents/EnterpriseDocumentManager'));
export const LazyExchanges = lazy(() => import('../exchanges/ExchangeList'));
export const LazyUsers = lazy(() => import('../UserManagement'));
export const LazyTemplates = lazy(() => import('../TemplateManager')); 