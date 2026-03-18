import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import './index.css';

// Remove loading screen as soon as React starts rendering — improves FCP
const loadingScreen = document.getElementById('loading-screen');
if (loadingScreen) {
  loadingScreen.style.transition = 'opacity 0.2s';
  loadingScreen.style.opacity = '0';
  setTimeout(() => loadingScreen.remove(), 200);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
);

// Defer all non-critical initializations after page is interactive
const scheduleIdleTask = (fn: () => void, timeout = 3000) => {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(fn, { timeout });
  } else {
    setTimeout(fn, timeout);
  }
};

scheduleIdleTask(() => {
  if (import.meta.env.PROD) {
    // Delay monitoring by 5s to not compete with page load
    setTimeout(() => {
      import('./lib/web-vitals').then(({ initWebVitals }) => {
        initWebVitals();
      }).catch(() => {});
    }, 5000);
  }
}, 4000);
