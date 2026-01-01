import { useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { I18nProvider } from './i18n';
import { ResourceHints, FontPreload } from './components/ResourceHints';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ChatWidget } from './components/ChatWidget';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { injectCriticalCSS } from './lib/critical-css';
import { applyCSP } from './lib/csp-config';
import { initializeSessionRecording } from './lib/session-recording';
import { analytics } from './lib/event-analytics';
import { notificationManager } from './lib/realtime-notifications';
import App from './App';

function EnhancedApp() {
  useEffect(() => {
    injectCriticalCSS();
    applyCSP();
    initializeSessionRecording(import.meta.env.PROD);

    analytics.page({
      path: window.location.pathname,
      title: document.title,
    });

    const user = null;
    if (user) {
      notificationManager.initialize(user.id);
    }

    return () => {
      notificationManager.destroy();
    };
  }, []);

  useKeyboardShortcuts([
    {
      key: 'k',
      ctrl: true,
      description: 'Ouvrir la recherche',
      callback: () => {
        console.log('Search opened');
      },
    },
    {
      key: '?',
      shift: true,
      description: 'Afficher les raccourcis',
      callback: () => {
        console.log('Shortcuts help opened');
      },
    },
  ]);

  return (
    <ThemeProvider>
      <I18nProvider>
        <ResourceHints />
        <FontPreload />
        <App />
        <OfflineIndicator />
        <ChatWidget />
      </I18nProvider>
    </ThemeProvider>
  );
}

export default EnhancedApp;
