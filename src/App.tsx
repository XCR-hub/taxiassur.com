import React, { lazy, Suspense, useState, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ToastProvider } from './contexts/ToastContext';
import { ModalProvider } from './contexts/ModalContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import GlobalErrorBoundary from './components/GlobalErrorBoundary';

const PerformanceOptimizer = lazy(() => import('./components/PerformanceOptimizer'));

const SimpleFallback = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#000'
  }}>
    <div className="loading-spinner"></div>
  </div>
);

function App() {
  const [showEnhancements, setShowEnhancements] = useState(false);

  useEffect(() => {
    // Delay non-critical enhancements until well after LCP
    // Use requestIdleCallback when available for zero impact on main thread
    const schedule = (cb: () => void, ms: number) => {
      if ('requestIdleCallback' in window) {
        const id = (window as any).requestIdleCallback(cb, { timeout: ms + 2000 });
        return () => (window as any).cancelIdleCallback(id);
      }
      const id = setTimeout(cb, ms);
      return () => clearTimeout(id);
    };

    return schedule(() => setShowEnhancements(true), 4000);
  }, []);

  return (
    <GlobalErrorBoundary>
      <ErrorBoundary>
        <ThemeProvider>
          <ToastProvider>
            <ModalProvider>
              <Suspense fallback={<SimpleFallback />}>
                <RouterProvider router={router} />
              </Suspense>
              {showEnhancements && (
                <Suspense fallback={null}>
                  <PerformanceOptimizer />
                </Suspense>
              )}
            </ModalProvider>
          </ToastProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </GlobalErrorBoundary>
  );
}

export default App;
