import React, { lazy, Suspense, useState, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ToastProvider } from './contexts/ToastContext';
import { ModalProvider } from './contexts/ModalContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';

const PerformanceOptimizer = lazy(() => import('./components/PerformanceOptimizer'));
const AITaxiBackground = lazy(() => import('./components/AITaxiBackground'));

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
    const timer = setTimeout(() => setShowEnhancements(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <ModalProvider>
            {showEnhancements && (
              <Suspense fallback={null}>
                <PerformanceOptimizer>
                  <AITaxiBackground intensity="low" />
                </PerformanceOptimizer>
              </Suspense>
            )}
            <Suspense fallback={<SimpleFallback />}>
              <RouterProvider router={router} />
            </Suspense>
          </ModalProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;