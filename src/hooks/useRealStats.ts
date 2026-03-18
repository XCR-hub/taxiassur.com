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

export function useRealStats(): RealStats {
  const [stats, setStats] = useState<RealStats>({
    ...STATIC_DEFAULTS,
    loading: false,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const fetchStats = async () => {
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

        if (!mounted) return;

        setStats({
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
          loading: false,
          error: null,
        });
      } catch {
        if (mounted) {
          setStats(prev => ({ ...prev, loading: false, error: null }));
        }
      }
    };

    // Defer stats fetching until after LCP — use idle callback or 2s delay
    // This prevents Supabase queries from competing with initial page paint
    let timerId: ReturnType<typeof setTimeout>;
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        if (mounted) fetchStats();
      }, { timeout: 3000 });
    } else {
      timerId = setTimeout(() => {
        if (mounted) fetchStats();
      }, 2000);
    }

    return () => {
      mounted = false;
      if (timerId) clearTimeout(timerId);
    };
  }, []);

  return stats;
}
