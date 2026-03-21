import React, { lazy, Suspense, useState, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ToastProvider } from './contexts/ToastContext';
import { ModalProvider } from './contexts/ModalContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import GlobalErrorBoundary from './components/GlobalErrorBoundary';

const PerformanceOptimizer = lazy(() => import('./components/PerformanceOptimizer'));

const TaxiSVG = () => (
  <svg viewBox="0 0 160 65" style={{ width: 130, height: 53 }}>
    <ellipse cx="80" cy="62" rx="60" ry="4" fill="rgba(0,0,0,0.5)" />
    <circle cx="38" cy="50" r="13" fill="#1a1a1a"/><circle cx="38" cy="50" r="7" fill="#252525"/><circle cx="38" cy="50" r="3" fill="#333"/>
    <circle cx="118" cy="50" r="13" fill="#1a1a1a"/><circle cx="118" cy="50" r="7" fill="#252525"/><circle cx="118" cy="50" r="3" fill="#333"/>
    <rect x="12" y="28" width="136" height="24" rx="5" fill="#D4AF37"/>
    <path d="M42 28 L52 8 L108 8 L118 28 Z" fill="#C49B2A"/>
    <path d="M44 27 L53 10 L62 10 L52 27 Z" fill="#a8d8ea" opacity="0.75"/>
    <rect x="64" y="10" width="38" height="17" rx="2" fill="#a8d8ea" opacity="0.75"/>
    <path d="M104 27 L108 10 L116 10 L118 27 Z" fill="#a8d8ea" opacity="0.75"/>
    <line x1="83" y1="28" x2="83" y2="52" stroke="#B8941F" strokeWidth="1.5"/>
    <rect x="62" y="1" width="36" height="9" rx="3" fill="#0a0a0a"/>
    <text x="80" y="8" textAnchor="middle" fill="#D4AF37" fontSize="6" fontWeight="bold" fontFamily="Arial">TAXI</text>
    <ellipse cx="149" cy="38" rx="6" ry="5" fill="#fff8dc" opacity="0.9"/>
    <ellipse cx="149" cy="38" rx="4" ry="3" fill="#fffbe0"/>
    <rect x="70" y="38" width="10" height="2.5" rx="1.5" fill="#B8941F"/>
    <rect x="86" y="38" width="10" height="2.5" rx="1.5" fill="#B8941F"/>
  </svg>
);

const SimpleFallback = () => (
  <div style={{ position: 'fixed', inset: 0, background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', zIndex: 9999 }}>
    <div style={{ textAlign: 'center', position: 'relative', zIndex: 1, marginBottom: 20 }}>
      <div style={{ position: 'relative', width: 110, height: 110, margin: '0 auto 28px' }}>
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
          <circle cx="50" cy="50" r="44" stroke="#1c1c1c" strokeWidth="5" fill="none"/>
          <circle cx="50" cy="50" r="44" stroke="#D4AF37" strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray="190 86" className="loading-ring-arc"/>
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg viewBox="0 0 40 30" style={{ width: 48, height: 36 }}>
            <rect x="2" y="12" width="36" height="12" rx="3" fill="#D4AF37"/>
            <path d="M10 12 L14 4 L26 4 L30 12 Z" fill="#C49B2A"/>
            <path d="M11 11 L14.5 5 L18 5 L15 11 Z" fill="#a8d8ea" opacity="0.8"/>
            <path d="M17 11 L17 5 L25 5 L28 11 Z" fill="#a8d8ea" opacity="0.8"/>
            <rect x="15" y="1" width="10" height="4" rx="1" fill="#0a0a0a"/>
            <text x="20" y="4.2" textAnchor="middle" fill="#D4AF37" fontSize="2.8" fontWeight="bold" fontFamily="Arial">TAXI</text>
            <circle cx="11" cy="23" r="4.5" fill="#1a1a1a"/><circle cx="11" cy="23" r="2.5" fill="#2a2a2a"/>
            <circle cx="29" cy="23" r="4.5" fill="#1a1a1a"/><circle cx="29" cy="23" r="2.5" fill="#2a2a2a"/>
            <ellipse cx="38" cy="16" rx="2.5" ry="2" fill="#fff8dc"/>
          </svg>
        </div>
      </div>
      <h1 className="loading-brand-text" style={{ color: '#D4AF37', fontSize: 30, fontWeight: 800, letterSpacing: '0.04em', margin: '0 0 8px', fontFamily: 'Inter, -apple-system, sans-serif' }}>
        TaxiAssur
      </h1>
      <p className="loading-brand-text" style={{ color: '#555', fontSize: 12, fontWeight: 400, letterSpacing: '0.18em', textTransform: 'uppercase', margin: 0, animationDelay: '0.2s' }}>
        Votre courtier assurance taxi
      </p>
    </div>
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 72, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 56, background: '#111' }}/>
      <div style={{ position: 'absolute', bottom: 54, left: 0, right: 0, height: 2, background: 'rgba(212,175,55,0.25)' }}/>
      <div className="loading-road-dashes">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} style={{ width: 36, height: 3, background: 'rgba(255,255,255,0.22)', borderRadius: 2, flexShrink: 0 }}/>
        ))}
      </div>
      <div className="loading-taxi-vehicle">
        <TaxiSVG />
      </div>
    </div>
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
