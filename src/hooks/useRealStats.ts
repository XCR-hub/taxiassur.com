import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
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
    const fetchStats = async () => {
      try {
        // Récupérer le nombre total d'articles publiés
        const { count: articlesCount, error: articlesError } = await supabase
          .from('blog_posts')
          .select('*', { count: 'exact', head: true })
          .eq('published', true);

        if (articlesError) {
          logger.warn('Error fetching articles count:', articlesError);
        }

        // Récupérer le nombre total de FAQs
        const { count: faqsCount, error: faqsError } = await supabase
          .from('faq_entries')
          .select('*', { count: 'exact', head: true });

        if (faqsError) {
          logger.warn('Error fetching FAQs count:', faqsError);
        }

        // Récupérer le nombre total de pages ville
        const { count: citiesCount, error: citiesError } = await supabase
          .from('city_pages')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'published');

        if (citiesError) {
          logger.warn('Error fetching cities count:', citiesError);
        }

        setStats({
          totalArticles: articlesCount || 0,
          totalFaqs: faqsCount || 0,
          totalCities: citiesCount || 0,
          loading: false,
          error: null,
        });
      } catch (err) {
        logger.error('Error fetching stats:', err);
        setStats(prev => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load stats',
        }));
      }
    };

    fetchStats();
  }, []);

  return stats;
}
