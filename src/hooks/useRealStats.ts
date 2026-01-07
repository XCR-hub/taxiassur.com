import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

interface RealStats {
  totalArticles: number;
  totalFaqs: number;
  totalCities: number;
  loading: boolean;
  error: string | null;
}

export function useRealStats(): RealStats {
  const [stats, setStats] = useState<RealStats>({
    totalArticles: 0,
    totalFaqs: 0,
    totalCities: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;

    const fetchStats = async () => {
      try {
        // Wait a bit for Supabase to be fully initialized
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!mounted) return;

        // Fetch all counts sequentially to avoid overwhelming Supabase
        let articlesCount = 0;
        let faqsCount = 0;
        let citiesCount = 0;

        try {
          const { count, error } = await supabase
            .from('blog_posts')
            .select('*', { count: 'exact', head: true })
            .eq('published', true);

          if (!error && count !== null) {
            articlesCount = count;
          }
        } catch (err) {
          logger.warn('Articles count skipped:', err);
        }

        if (!mounted) return;

        try {
          const { count, error } = await supabase
            .from('faq_entries')
            .select('*', { count: 'exact', head: true });

          if (!error && count !== null) {
            faqsCount = count;
          }
        } catch (err) {
          logger.warn('FAQs count skipped:', err);
        }

        if (!mounted) return;

        try {
          const { count, error } = await supabase
            .from('city_pages')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'published');

          if (!error && count !== null) {
            citiesCount = count;
          }
        } catch (err) {
          logger.warn('Cities count skipped:', err);
        }

        if (mounted) {
          setStats({
            totalArticles: articlesCount,
            totalFaqs: faqsCount,
            totalCities: citiesCount,
            loading: false,
            error: null,
          });
        }
      } catch (err) {
        logger.error('Error fetching stats:', err);
        if (mounted) {
          setStats(prev => ({
            ...prev,
            loading: false,
            error: null, // Don't show error, just use 0 values
          }));
        }
      }
    };

    fetchStats();

    return () => {
      mounted = false;
    };
  }, []);

  return stats;
}
