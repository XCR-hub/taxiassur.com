import { useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';

interface UseRealtimeDocumentsOptions {
  leadId?: string;
  onDocumentChange?: () => void;
  onDocumentInsert?: (document: Record<string, unknown>) => void;
  onDocumentUpdate?: (document: Record<string, unknown>) => void;
  onDocumentDelete?: (documentId: string) => void;
  enabled?: boolean;
}

export function useRealtimeDocuments(options: UseRealtimeDocumentsOptions = {}) {
  const { leadId, onDocumentChange, enabled = true } = options;
  const callbackRef = useRef(onDocumentChange);

  useEffect(() => {
    callbackRef.current = onDocumentChange;
  }, [onDocumentChange]);

  useEffect(() => {
    if (!enabled) return;

    const refresh = () => {
      if (document.visibilityState === 'visible') callbackRef.current?.();
    };
    const interval = window.setInterval(refresh, 15_000);
    document.addEventListener('visibilitychange', refresh);
    logger.info(`Document polling active${leadId ? ` (${leadId})` : ''}`);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [enabled, leadId]);

  return { isConnected: enabled };
}
