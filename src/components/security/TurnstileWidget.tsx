import { useEffect, useRef } from 'react';
import { getTurnstileSiteKey } from '@/lib/turnstile';

interface TurnstileWidgetProps {
  action?: string;
  className?: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          action?: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        }
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
    };
  }
}

export default function TurnstileWidget({
  action = 'lead_form',
  className,
  onVerify,
  onExpire,
  onError,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = getTurnstileSiteKey();

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    let disposed = false;
    let script: HTMLScriptElement | null = null;
    const fail = () => {
      if (disposed || widgetIdRef.current) return;
      if (script) script.dataset.turnstileFailed = 'true';
      onError?.();
    };
    const loadTimeout = window.setTimeout(fail, 15_000);

    const renderWidget = () => {
      if (disposed || !containerRef.current || !window.turnstile || widgetIdRef.current) return;
      window.clearTimeout(loadTimeout);

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        action,
        callback: onVerify,
        'expired-callback': () => {
          onExpire?.();
          if (widgetIdRef.current) window.turnstile?.reset(widgetIdRef.current);
        },
        'error-callback': onError,
      });
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      script = document.querySelector<HTMLScriptElement>('script[data-turnstile="true"]');
      if (script?.dataset.turnstileFailed === 'true') {
        script.remove();
        script = null;
      }
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.dataset.turnstile = 'true';
        script.addEventListener('load', renderWidget, { once: true });
        script.addEventListener('error', fail, { once: true });
        document.head.appendChild(script);
      } else {
        script.addEventListener('load', renderWidget, { once: true });
        script.addEventListener('error', fail, { once: true });
      }
    }

    return () => {
      disposed = true;
      window.clearTimeout(loadTimeout);
      script?.removeEventListener('load', renderWidget);
      script?.removeEventListener('error', fail);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [action, onError, onExpire, onVerify, siteKey]);

  if (!siteKey) return null;

  return <div ref={containerRef} className={className} />;
}
