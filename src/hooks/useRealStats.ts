import { useState, useEffect } from 'react';
import { getPublicContentCounts } from '@/lib/d1-public-cache';

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
const listeners: Set<() => void> = new Set();

function notifyListeners() {
  listeners.forEach(fn => fn());
}

async function fetchStatsOnce(): Promise<StatsData> {
  if (cachedStats) return cachedStats;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const counts = await getPublicContentCounts();
      const result: StatsData = counts
        ? {
            totalArticles: counts.blog_posts || STATIC_DEFAULTS.totalArticles,
            totalFaqs: counts.faq_entries || STATIC_DEFAULTS.totalFaqs,
            totalCities: counts.city_pages || STATIC_DEFAULTS.totalCities,
            totalLeads: STATIC_DEFAULTS.totalLeads,
            totalReviews: STATIC_DEFAULTS.totalReviews,
          }
        : STATIC_DEFAULTS;

      cachedStats = result;
      notifyListeners();
      return result;
    } catch {
      cachedStats = STATIC_DEFAULTS;
      notifyListeners();
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

    let timerId: ReturnType<typeof setTimeout> | undefined;
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
