import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import './index.css';
import { supabase } from './lib/supabase';

console.log('🚀 TaxiAssur starting...');

console.log('🔧 Pre-initializing Supabase...');
try {
  supabase.auth.getSession().then(() => {
    console.log('✅ Supabase initialized');
  });
} catch (error) {
  console.error('❌ Supabase initialization error:', error);
}

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