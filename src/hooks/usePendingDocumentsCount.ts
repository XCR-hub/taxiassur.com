import { useState, useEffect } from 'react';
import { nativeAdminCall } from '@/lib/native-admin-data';

export function usePendingDocumentsCount(enabled = true) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let fetching = false;
    const fetchCount = async () => {
      if (fetching || document.visibilityState === 'hidden') return;
      fetching = true;
      try {
        const result = await nativeAdminCall<{ count?: number }>(
          '/v1/admin/documents?status=pending&scope=all&count_only=1',
        );
        setCount(Math.max(0, Number(result.count) || 0));
      } catch (error) {
        console.error('Erreur comptage documents:', error);
      } finally {
        fetching = false;
        setLoading(false);
      }
    };

    fetchCount();

    const interval = setInterval(fetchCount, 120000);
    window.addEventListener('focus', fetchCount);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', fetchCount);
    };
  }, [enabled]);

  return { count, loading };
}
