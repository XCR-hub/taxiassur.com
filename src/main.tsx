import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import './index.css';

if (import.meta.env.PROD) {
  import('./lib/web-vitals').then(({ initWebVitals }) => {
    initWebVitals();
  }).catch(() => {});

  if (import.meta.env.VITE_SENTRY_DSN) {
    import('./lib/monitoring').then(({ monitoring }) => {
      monitoring.addBreadcrumb('Application started', 'lifecycle');
    }).catch(() => {});
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
);