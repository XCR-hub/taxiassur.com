import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import './index.css';

const CHUNK_RECOVERY_KEY = 'taxiassur_chunk_recovery';
window.addEventListener('unhandledrejection', (event) => {
  const message = String(event.reason?.message || event.reason || '');
  if (!/dynamically imported module|failed to fetch.*module|importing a module script failed/i.test(message)) return;
  if (sessionStorage.getItem(CHUNK_RECOVERY_KEY)) return;
  sessionStorage.setItem(CHUNK_RECOVERY_KEY, String(Date.now()));
  event.preventDefault();
  void (async () => {
    const registrations = await navigator.serviceWorker?.getRegistrations?.() || [];
    await Promise.all(registrations.map((registration) => registration.unregister()));
    if ('caches' in window) await Promise.all((await caches.keys()).map((key) => caches.delete(key)));
    const url = new URL(window.location.href);
    url.searchParams.set('__chunk_retry', String(Date.now()));
    window.location.replace(url.toString());
  })();
});
// Keep the marker for the lifetime of the tab. If recovery did not fix the
// stale chunk, another automatic reload would only create an endless loop.

// Redirect auth hash fragments to the set-password page before React mounts
// Supabase redirects to the root with #access_token when redirectTo is not in allowed list
;(() => {
  const hash = window.location.hash;
  if (!hash) return;
  if (window.location.pathname.includes('/auth/set-password')) return;

  const isAuthSuccess =
    hash.includes('access_token=') &&
    (hash.includes('type=recovery') || hash.includes('type=invite'));

  const isAuthError =
    hash.includes('error=') &&
    (hash.includes('error_code=otp_expired') || hash.includes('error=access_denied'));

  if (isAuthSuccess || isAuthError) {
    window.location.replace('/auth/set-password' + hash);
  }
})();

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
