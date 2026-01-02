import { useState, useEffect } from 'react';
import { Calendar, TrendingUp, Newspaper, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { stripHtml, createSmartExcerpt } from '../lib/text-utils';
import { logger } from '@/lib/logger';

interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content?: string;
  category: string;
  score: number;
  published_at: string;
  source?: string;
}

interface NewsSectionProps {
  limit?: number;
  showTitle?: boolean;
}

export default function NewsSection({ limit = 3, showTitle = true }: NewsSectionProps) {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNews();
  }, [limit]);

  const loadNews = async () => {
    try {
      const { data, error } = await supabase
        .from('news_articles')
        .select('id, title, slug, excerpt, content, category, score, published_at, source')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Error loading news:', error);
        return;
      }

      const cleanedData = (data || []).map(article => ({
        ...article,
        excerpt: getCleanExcerpt(article)
      }));

      setNews(cleanedData);
    } catch (err) {
      logger.error('Failed to load news:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCleanExcerpt = (article: any): string => {
    if (!article.excerpt) {
      return createSmartExcerpt(article.title, article.content || '');
    }

    const cleanedExcerpt = stripHtml(article.excerpt);

    if (cleanedExcerpt.length < 20 || cleanedExcerpt.includes('href=') || cleanedExcerpt.includes('<a ')) {
      return createSmartExcerpt(article.title, article.content || '');
    }

    return cleanedExcerpt.length > 160
      ? cleanedExcerpt.substring(0, 160) + '...'
      : cleanedExcerpt;
  };

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return "Aujourd'hui";
    if (diffInDays === 1) return 'Hier';
    if (diffInDays < 7) return `Il y a ${diffInDays} jours`;
    return `Il y a ${Math.floor(diffInDays / 7)} semaine${Math.floor(diffInDays / 7) > 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
          </div>
        </div>
      </section>
    );
  }

  if (news.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-gradient-to-br from-gray-50 to-amber-50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        {showTitle && (
          <div className="text-center mb-12">
            <div className="inline-flex items-center space-x-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-full mb-4">
              <Newspaper size={20} />
              <span className="font-semibold">Actualités</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Dernières Nouvelles du Secteur
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Restez informé des dernières réglementations, innovations et conseils
            </p>
          </div>
        )}

        {/* News Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {news.map((article) => (
            <article
              key={article.id}
              className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="p-6">
                {/* Meta */}
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-block px-3 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                    {article.category}
                  </span>
                  {article.score > 0 && (
                    <div className="flex items-center space-x-1 text-sm text-gray-600">
                      <TrendingUp size={14} className="text-amber-600" />
                      <span className="font-semibold">{article.score}/100</span>
                    </div>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 hover:text-amber-600 transition-colors">
                  <a href={`/actualites/${article.slug}`}>
                    {article.title}
                  </a>
                </h3>

                {/* Excerpt */}
                <p className="text-gray-600 mb-4 line-clamp-3">
                  {article.excerpt}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Calendar size={14} />
                    <span>{timeAgo(article.published_at)}</span>
                  </div>
                  <a
                    href={`/actualites/${article.slug}`}
                    className="text-amber-600 font-semibold text-sm hover:text-amber-700 flex items-center space-x-1"
                  >
                    <span>Lire</span>
                    <ArrowRight size={16} />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* View All Link */}
        <div className="text-center">
          <a
            href="/actualites"
            className="inline-flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-gray-900 font-bold rounded-lg transition-colors shadow-lg hover:shadow-xl"
          >
            <Newspaper size={20} />
            <span>Toutes les Actualités</span>
            <ArrowRight size={20} />
          </a>
        </div>
      </div>
    </section>
  );
}
