import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  published: boolean;
  published_at: string;
  author: string;
  category: string;
  tags: string[];
  meta_title: string;
  meta_description: string;
  featured_image: string;
  read_time: number;
  views: number;
  created_at: string;
}

interface News {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  published_at: string;
  category: string;
  tags: string[];
  featured_image: string;
  views: number;
  created_at: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  order_index: number;
  views: number;
  helpful_count: number;
  created_at: string;
}

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  city: string;
  vehicle_type: string;
  contract_type: string;
  status: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  created_at: string;
  updated_at: string;
}

interface DashboardStats {
  total_blog_posts: number;
  total_news: number;
  total_faqs: number;
  total_leads: number;
  new_leads_today: number;
  new_leads_week: number;
  leads_by_status: Record<string, number>;
  recent_blog_posts: Array<{
    id: string;
    title: string;
    slug: string;
    published_at: string;
    views: number;
  }>;
}

export function useBlogPosts(limit = 50, offset = 0) {
  const [data, setData] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const { data: posts, error: err } = await supabase.rpc('get_blog_posts', {
          limit_count: limit,
          offset_count: offset
        });

        if (err) throw err;
        setData(posts || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [limit, offset]);

  return { data, loading, error };
}

export function useNews(limit = 20, offset = 0) {
  const [data, setData] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const { data: news, error: err } = await supabase.rpc('get_news', {
          limit_count: limit,
          offset_count: offset
        });

        if (err) throw err;
        setData(news || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [limit, offset]);

  return { data, loading, error };
}

export function useFAQs(category?: string) {
  const [data, setData] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const { data: faqs, error: err } = await supabase.rpc('get_faqs', {
          category_filter: category || null
        });

        if (err) throw err;
        setData(faqs || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [category]);

  return { data, loading, error };
}

export function useLeads(status?: string, limit = 100, offset = 0) {
  const [data, setData] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const { data: leads, error: err } = await supabase.rpc('get_leads', {
          status_filter: status || null,
          limit_count: limit,
          offset_count: offset
        });

        if (err) throw err;
        setData(leads || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [status, limit, offset]);

  return { data, loading, error };
}

export function useDashboardStats() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const { data: stats, error: err } = await supabase.rpc('get_dashboard_stats');

        if (err) throw err;
        setData(stats);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return { data, loading, error };
}

export function useContentSearch(query: string, contentType: 'all' | 'blog' | 'news' | 'faq' = 'all') {
  const [data, setData] = useState<Array<{
    type: string;
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    relevance: number;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query || query.length < 3) {
      setData([]);
      return;
    }

    async function fetchData() {
      try {
        setLoading(true);
        const { data: results, error: err } = await supabase.rpc('search_content', {
          search_query: query,
          content_type: contentType
        });

        if (err) throw err;
        setData(results || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      } finally {
        setLoading(false);
      }
    }

    const timeoutId = setTimeout(fetchData, 300);
    return () => clearTimeout(timeoutId);
  }, [query, contentType]);

  return { data, loading, error };
}
