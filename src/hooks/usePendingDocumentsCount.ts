import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function usePendingDocumentsCount() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const { count: docCount, error } = await supabase
          .from('prospect_documents')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        if (error) {
          console.error('Erreur comptage documents:', error);
          setCount(0);
        } else {
          setCount(docCount || 0);
        }
      } catch (error) {
        console.error('Erreur comptage documents:', error);
        setCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchCount();

    // Actualiser toutes les 30 secondes
    const interval = setInterval(fetchCount, 30000);

    // S'abonner aux changements en temps réel
    const subscription = supabase
      .channel('pending_documents_count')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prospect_documents',
          filter: 'status=eq.pending'
        },
        () => {
          fetchCount();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, []);

  return { count, loading };
}
