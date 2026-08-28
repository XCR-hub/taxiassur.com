import { useEffect, useRef } from 'react';
import { hasAnalyticsConsent, hasBehavioralPersonalizationConsent, isPrivateApplicationPath } from '@/lib/privacy-consent';

const DEFER_MS = 3000;

function sanitizeUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return value.split('?')[0].split('#')[0];
  }
}

function sanitizedReferrer(): string | null {
  if (!document.referrer) return null;
  return sanitizeUrl(document.referrer);
}

export const usePageTracking = () => {
  const startTimeRef = useRef<number>(Date.now());
  const sessionIdRef = useRef<string>('');

  useEffect(() => {
    if (!hasAnalyticsConsent() || isPrivateApplicationPath()) return;

    let sessionId = sessionStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      sessionStorage.setItem('session_id', sessionId);
    }

    const pageUrl = sanitizeUrl(window.location.href);
    const behavioralAllowed = hasBehavioralPersonalizationConsent();

    sessionIdRef.current = sessionId;
    startTimeRef.current = Date.now();

    let intervalId: ReturnType<typeof setInterval> | undefined;
    let isMounted = true;

    const runTracking = async () => {
      if (!isMounted || !hasAnalyticsConsent()) return;
      try {
        const { supabase } = await import('@/lib/supabase');

        await supabase.from('page_analytics').insert({
          page_url: pageUrl,
          session_id: sessionId,
          user_agent: behavioralAllowed ? navigator.userAgent : 'analytics_consent_no_behavioral_profile',
          referrer: sanitizedReferrer(),
          viewport_width: window.innerWidth,
          viewport_height: window.innerHeight,
        });

        const updateDuration = async () => {
          const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
          if (duration > 5 && isMounted && hasAnalyticsConsent()) {
            try {
              await supabase
                .from('page_analytics')
                .update({ duration_seconds: duration })
                .eq('session_id', sessionIdRef.current)
                .eq('page_url', pageUrl)
                .order('created_at', { ascending: false })
                .limit(1);
            } catch {
              // Analytics must never block the page.
            }
          }
        };

        intervalId = setInterval(updateDuration, 30000);
        window.addEventListener('beforeunload', updateDuration, { passive: true });
      } catch {
        // Analytics must never block the page.
      }
    };

    const timerId = setTimeout(runTracking, DEFER_MS);

    return () => {
      isMounted = false;
      clearTimeout(timerId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return { sessionId: sessionIdRef.current };
};
