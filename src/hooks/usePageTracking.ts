import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { logger } from '@/lib/logger';

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

    const trackPageView = async () => {
      try {
        await supabase.from('page_analytics').insert({
          page_url: window.location.href,
          session_id: sessionId!,
          user_agent: navigator.userAgent,
          referrer: document.referrer || null,
          viewport_width: window.innerWidth,
          viewport_height: window.innerHeight
        });
      } catch (error) {
        logger.error('Error tracking page view:', error);
      }
    };

    trackPageView();

    const updateDuration = async () => {
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);

      if (duration > 5) {
        try {
          await supabase
            .from('page_analytics')
            .update({ duration_seconds: duration })
            .eq('session_id', sessionIdRef.current)
            .eq('page_url', window.location.href)
            .order('created_at', { ascending: false })
            .limit(1);
        } catch (error) {
          logger.error('Error updating duration:', error);
        }
      }
    };

    const handleBeforeUnload = () => {
      updateDuration();
    };

    const durationInterval = setInterval(updateDuration, 30000);

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(durationInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      updateDuration();
    };
  }, []);

  return { sessionId: sessionIdRef.current };
};
