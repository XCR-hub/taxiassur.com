import { useEffect, useRef } from 'react';

const DEFER_MS = 3000;

export const usePageTracking = () => {
  const startTimeRef = useRef<number>(Date.now());
  const sessionIdRef = useRef<string>('');

  useEffect(() => {
    let sessionId = sessionStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('session_id', sessionId);
    }
    sessionIdRef.current = sessionId;
    startTimeRef.current = Date.now();

    let timerId: ReturnType<typeof setTimeout>;
    let intervalId: ReturnType<typeof setInterval>;
    let isMounted = true;

    const runTracking = async () => {
      if (!isMounted) return;
      try {
        const { supabase } = await import('@/lib/supabase');

        await supabase.from('page_analytics').insert({
          page_url: window.location.href,
          session_id: sessionId!,
          user_agent: navigator.userAgent,
          referrer: document.referrer || null,
          viewport_width: window.innerWidth,
          viewport_height: window.innerHeight,
        });

        const updateDuration = async () => {
          const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
          if (duration > 5 && isMounted) {
            try {
              await supabase
                .from('page_analytics')
                .update({ duration_seconds: duration })
                .eq('session_id', sessionIdRef.current)
                .eq('page_url', window.location.href)
                .order('created_at', { ascending: false })
                .limit(1);
            } catch {
              // silent
            }
          }
        };

        intervalId = setInterval(updateDuration, 30000);
        window.addEventListener('beforeunload', updateDuration, { passive: true });
      } catch {
        // silent — analytics must never block the page
      }
    };

    timerId = setTimeout(runTracking, DEFER_MS);

    return () => {
      isMounted = false;
      clearTimeout(timerId);
      clearInterval(intervalId);
    };
  }, []);

  return { sessionId: sessionIdRef.current };
};
