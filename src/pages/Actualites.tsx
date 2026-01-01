import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Calendar, Clock, Tag, ExternalLink, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { stripHtml, createSmartExcerpt } from '../lib/text-utils';
import Footer from '../components/Footer';
import Header from '../components/Header';
import { logger } from '@/lib/logger';

interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  image_url?: string;
  source?: string;
  source_url?: string;
  category: string;
  tags: string[];
  score: number;
  published_at: string;
}

export default function Actualites() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    try {
      const { data, error } = await supabase
        .from('news_articles')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(20);

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

  const filteredNews = filter === 'all'
    ? news
    : news.filter(article => article.category === filter);

  const categories = [
    { id: 'all', label: 'Toutes' },
    { id: 'réglementation', label: 'Réglementation' },
    { id: 'économie', label: 'Économie' },
    { id: 'innovation', label: 'Innovation' },
    { id: 'général', label: 'Général' }
  ];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return "Aujourd'hui";
    if (diffInDays === 1) return 'Hier';
    if (diffInDays < 7) return `Il y a ${diffInDays} jours`;
    if (diffInDays < 30) return `Il y a ${Math.floor(diffInDays / 7)} semaine${Math.floor(diffInDays / 7) > 1 ? 's' : ''}`;
    return formatDate(dateString);
  };

  return (
    <>
      <Helmet>
        <title>Actualités Assurance Taxi | TaxiAssur.com</title>
        <meta name="description" content="Toute l'actualité de l'assurance taxi : réglementation, nouveautés, conseils pratiques et innovations pour les professionnels du transport." />
        <link rel="canonical" href="https://taxiassur.com/actualites" />
      </Helmet>

      <Header />

      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-yellow-50">
        {/* Hero Section */}
        <section className="bg-gradient-to-r from-black via-gray-900 to-yellow-600 text-white py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center space-x-2 bg-white/20 px-4 py-2 rounded-full mb-6">
                <TrendingUp size={20} />
                <span className="font-semibold">Actualités en temps réel</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                L'Actualité de l'Assurance Taxi
              </h1>
              <p className="text-xl text-yellow-100">
                Restez informé des dernières nouveautés, réglementations et conseils pour optimiser votre activité
              </p>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="sticky top-0 z-10 bg-white border-b border-yellow-200 shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-wrap gap-2 justify-center">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setFilter(cat.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    filter === cat.id
                      ? 'bg-yellow-500 text-black shadow-md font-bold'
                      : 'bg-gray-100 text-gray-700 hover:bg-yellow-100'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* News Grid */}
        <section className="container mx-auto px-4 py-12">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Chargement des actualités...</p>
              </div>
            </div>
          ) : filteredNews.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-xl text-gray-600">Aucune actualité pour le moment</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredNews.map(article => (
                <article
                  key={article.id}
                  className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col"
                >
                  {/* Image */}
                  {article.image_url && (
                    <div className="relative h-48 bg-gradient-to-br from-yellow-400 to-yellow-600">
                      <img
                        src={article.image_url}
                        alt={article.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-6 flex-1 flex flex-col">
                    {/* Meta */}
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                      <div className="flex items-center space-x-1">
                        <Calendar size={14} />
                        <span>{timeAgo(article.published_at)}</span>
                      </div>
                      {article.score > 0 && (
                        <div className="flex items-center space-x-1">
                          <TrendingUp size={14} />
                          <span className="font-semibold text-yellow-600">{article.score}/100</span>
                        </div>
                      )}
                    </div>

                    {/* Category */}
                    <div className="mb-3">
                      <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                        {article.category}
                      </span>
                    </div>

                    {/* Title */}
                    <h2 className="text-xl font-bold text-gray-900 font-semibold mb-3 line-clamp-2">
                      {article.title}
                    </h2>

                    {/* Excerpt */}
                    <p className="text-gray-600 mb-4 line-clamp-3 flex-1">
                      {article.excerpt}
                    </p>

                    {/* Tags */}
                    {article.tags && article.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {article.tags.slice(0, 3).map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center space-x-1 px-2 py-1 bg-gradient-to-br from-white to-gray-50 text-gray-600 text-xs rounded"
                          >
                            <Tag size={10} />
                            <span>{tag}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Source */}
                    {article.source && (
                      <div className="text-sm text-gray-500 mb-4">
                        Source: <span className="font-semibold">{article.source}</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex space-x-2 pt-4 border-t border-gray-100">
                      <a
                        href={`/actualites/${article.slug}`}
                        className="flex-1 text-center px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-lg transition-colors"
                      >
                        Lire l'article
                      </a>
                      {article.source_url && (
                        <a
                          href={article.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center px-4 py-2 bg-gray-100 hover:bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-lg transition-colors"
                          title="Voir la source"
                        >
                          <ExternalLink size={18} />
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-black via-gray-900 to-yellow-600 text-white py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Besoin d'un Devis Personnalisé ?
            </h2>
            <p className="text-xl text-yellow-100 mb-8 max-w-2xl mx-auto">
              Nos experts analysent votre situation et vous proposent les meilleures offres du marché
            </p>
            <a
              href="/"
              className="inline-block px-8 py-4 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors shadow-xl"
            >
              Obtenir un Devis Gratuit
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
