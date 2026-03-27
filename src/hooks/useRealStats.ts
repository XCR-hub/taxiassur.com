import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const STATIC_DEFAULTS = {
  totalArticles: 25,
  totalFaqs: 50,
  totalCities: 80,
  totalLeads: 0,
  totalReviews: 6,
};

interface RealStats {
  totalArticles: number;
  totalFaqs: number;
  totalCities: number;
  totalLeads: number;
  totalReviews: number;
  loading: boolean;
  error: string | null;
}

type StatsData = Omit<RealStats, 'loading' | 'error'>;

let cachedStats: StatsData | null = null;
let fetchPromise: Promise<StatsData> | null = null;
let listeners: Set<() => void> = new Set();

function notifyListeners() {
  listeners.forEach(fn => fn());
}

async function fetchStatsOnce(): Promise<StatsData> {
  if (cachedStats) return cachedStats;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const [articlesRes, faqsRes, citiesRes] = await Promise.allSettled([
        supabase
          .from('blog_posts')
          .select('*', { count: 'exact', head: true })
          .eq('published', true),
        supabase
          .from('faq_entries')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('city_pages')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'published'),
      ]);

      const result: StatsData = {
        totalArticles: articlesRes.status === 'fulfilled' && !articlesRes.value.error && articlesRes.value.count !== null
          ? articlesRes.value.count
          : STATIC_DEFAULTS.totalArticles,
        totalFaqs: faqsRes.status === 'fulfilled' && !faqsRes.value.error && faqsRes.value.count !== null
          ? faqsRes.value.count
          : STATIC_DEFAULTS.totalFaqs,
        totalCities: citiesRes.status === 'fulfilled' && !citiesRes.value.error && citiesRes.value.count !== null
          ? citiesRes.value.count
          : STATIC_DEFAULTS.totalCities,
        totalLeads: STATIC_DEFAULTS.totalLeads,
        totalReviews: STATIC_DEFAULTS.totalReviews,
      };

      cachedStats = result;
      notifyListeners();
      return result;
    } catch {
      return STATIC_DEFAULTS;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

export function useRealStats(): RealStats {
  const [stats, setStats] = useState<RealStats>({
    ...(cachedStats || STATIC_DEFAULTS),
    loading: !cachedStats,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    if (cachedStats) {
      setStats({ ...cachedStats, loading: false, error: null });
      return;
    }

    const onUpdate = () => {
      if (mounted && cachedStats) {
        setStats({ ...cachedStats, loading: false, error: null });
      }
    };
    listeners.add(onUpdate);

    let timerId: ReturnType<typeof setTimeout>;
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        if (mounted) fetchStatsOnce();
      }, { timeout: 3000 });
    } else {
      timerId = setTimeout(() => {
        if (mounted) fetchStatsOnce();
      }, 2000);
    }

    return () => {
      mounted = false;
      listeners.delete(onUpdate);
      if (timerId) clearTimeout(timerId);
    };
  }, []);

  return stats;
}
