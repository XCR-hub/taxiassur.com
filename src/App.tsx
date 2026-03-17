import React, { lazy, Suspense, useState, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ToastProvider } from './contexts/ToastContext';
import { ModalProvider } from './contexts/ModalContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import GlobalErrorBoundary from './components/GlobalErrorBoundary';

const PerformanceOptimizer = lazy(() => import('./components/PerformanceOptimizer'));
const AITaxiBackground = lazy(() => import('./components/AITaxiBackground'));
const MoneticoTestCard = lazy(() => import('./components/MoneticoTestCard').then(m => ({ default: m.MoneticoTestCard })));

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
    const isMobile = window.innerWidth < 1024;
    const delay = isMobile ? 2000 : 500;
    const timer = setTimeout(() => setShowEnhancements(true), delay);
    return () => clearTimeout(timer);
  }, []);

  return (
    <GlobalErrorBoundary>
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
              {/* Aide pour les tests Monético (dev only) */}
              {showEnhancements && (
                <Suspense fallback={null}>
                  <MoneticoTestCard />
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