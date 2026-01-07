import { Suspense, type ReactNode } from 'react';

interface OptimizedSuspenseProps {
  children: ReactNode;
  fallback?: ReactNode;
  skeleton?: boolean;
}

const DefaultFallback = ({ skeleton }: { skeleton?: boolean }) => {
  if (skeleton) {
    return (
      <div className="animate-pulse space-y-4 p-4">
        <div className="h-8 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
    );
  }

  return null;
};

export function OptimizedSuspense({
  children,
  fallback,
  skeleton = false
}: OptimizedSuspenseProps) {
  return (
    <Suspense fallback={fallback || <DefaultFallback skeleton={skeleton} />}>
      {children}
    </Suspense>
  );
}
