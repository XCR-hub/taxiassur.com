import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Calendar, Clock, Tag, ArrowLeft, TrendingUp, ExternalLink } from 'lucide-react';
import { getSupabaseAdmin } from '../lib/supabase';
import Header from '../components/Header';
import Footer from '../components/Footer';

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
  meta_description?: string;
}

export default function NewsArticle() {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedArticles, setRelatedArticles] = useState<NewsArticle[]>([]);

  useEffect(() => {
    if (slug) {
      loadArticle(slug);
    }
  }, [slug]);

  const loadArticle = async (articleSlug: string) => {
    try {
      const supabase = getSupabaseAdmin();

      const { data, error } = await supabase
        .from('news_articles')
        .select('*')
        .eq('slug', articleSlug)
        .eq('status', 'published')
        .maybeSingle();

      if (error) {
        console.error('Error loading article:', error);
        return;
      }

      if (data) {
        setArticle(data);
        loadRelatedArticles(data.category, data.id);
      }
    } catch (err) {
      console.error('Failed to load article:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRelatedArticles = async (category: string, currentId: string) => {
    try {
      const supabase = getSupabaseAdmin();

      const { data, error } = await supabase
        .from('news_articles')
        .select('id, title, slug, excerpt, category, published_at, score')
        .eq('category', category)
        .neq('id', currentId)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(3);

      if (!error && data) {
        setRelatedArticles(data);
      }
    } catch (err) {
      console.error('Failed to load related articles:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return "Aujourd'hui";
    if (diffInDays === 1) return 'Hier';
    if (diffInDays < 7) return `Il y a ${diffInDays} jours`;
    return formatDate(dateString);
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement de l'article...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!article) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 font-semibold mb-4">Article non trouvé</h1>
            <p className="text-gray-600 mb-6">Cet article n'existe pas ou a été supprimé.</p>
            <Link
              to="/actualites"
              className="inline-flex items-center space-x-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Retour aux actualités</span>
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{article.title} | TaxiAssur Actualités</title>
        <meta name="description" content={article.meta_description || article.excerpt} />
        <link rel="canonical" href={`https://taxiassur.com/actualites/${article.slug}`} />
        <meta property="og:title" content={article.title} />
        <meta property="og:description" content={article.excerpt} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://taxiassur.com/actualites/${article.slug}`} />
        {article.image_url && <meta property="og:image" content={article.image_url} />}
        <meta property="article:published_time" content={article.published_at} />
        <meta property="article:section" content={article.category} />
        {article.tags?.map(tag => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}
      </Helmet>

      <Header />

      <main className="min-h-screen bg-white">
        {/* Breadcrumb */}
        <div className="bg-white border border-yellow-100 border-b border-yellow-200">
          <div className="container mx-auto px-4 py-4">
            <nav className="flex items-center space-x-2 text-sm">
              <Link to="/" className="text-yellow-600 hover:text-yellow-700">Accueil</Link>
              <span className="text-gray-400">/</span>
              <Link to="/actualites" className="text-yellow-600 hover:text-yellow-700">Actualités</Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-600">{article.title}</span>
            </nav>
          </div>
        </div>

        {/* Article Header */}
        <article className="container mx-auto px-4 py-12 max-w-4xl">
          {/* Back Button */}
          <Link
            to="/actualites"
            className="inline-flex items-center space-x-2 text-yellow-600 hover:text-yellow-700 font-medium mb-6"
          >
            <ArrowLeft size={20} />
            <span>Retour aux actualités</span>
          </Link>

          {/* Category & Meta */}
          <div className="mb-6">
            <span className="inline-block px-4 py-2 bg-yellow-100 text-yellow-700 text-sm font-semibold rounded-full mb-4">
              {article.category}
            </span>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <Calendar size={16} />
                <span>{formatDate(article.published_at)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock size={16} />
                <span>{timeAgo(article.published_at)}</span>
              </div>
              {article.score > 0 && (
                <div className="flex items-center space-x-2">
                  <TrendingUp size={16} className="text-yellow-600" />
                  <span className="font-semibold text-yellow-600">{article.score}/100</span>
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 font-semibold mb-6 leading-tight">
            {article.title}
          </h1>

          {/* Excerpt */}
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            {article.excerpt}
          </p>

          {/* Image */}
          {article.image_url && (
            <div className="mb-8 rounded-xl overflow-hidden">
              <img
                src={article.image_url}
                alt={article.title}
                className="w-full h-auto"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Content */}
          <div
            className="prose prose-lg max-w-none mb-8 text-gray-900 [&>*]:text-gray-900 [&_p]:text-gray-800 [&_h2]:text-gray-900 [&_h3]:text-gray-900 [&_li]:text-gray-800"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8 pb-8 border-b border-yellow-200">
              {article.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center space-x-1 px-3 py-1 bg-gradient-to-br from-white to-gray-50 text-gray-700 text-sm rounded-full"
                >
                  <Tag size={14} />
                  <span>{tag}</span>
                </span>
              ))}
            </div>
          )}

          {/* Source */}
          {article.source && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
              <div className="flex items-start space-x-3">
                <ExternalLink size={20} className="text-yellow-600 mt-1" />
                <div>
                  <p className="text-sm text-gray-700 mb-2">
                    <span className="font-semibold">Source:</span> {article.source}
                  </p>
                  {article.source_url && (
                    <a
                      href={article.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-yellow-600 hover:text-yellow-700 font-medium"
                    >
                      Lire l'article original →
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </article>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <section className="bg-white border border-yellow-100 py-16">
            <div className="container mx-auto px-4">
              <h2 className="text-3xl font-bold text-gray-900 font-semibold mb-8 text-center">
                Articles similaires
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {relatedArticles.map(related => (
                  <Link
                    key={related.id}
                    to={`/actualites/${related.slug}`}
                    className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
                  >
                    <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full mb-3">
                      {related.category}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900 font-semibold mb-2 line-clamp-2">
                      {related.title}
                    </h3>
                    <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                      {related.excerpt}
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{timeAgo(related.published_at)}</span>
                      {related.score > 0 && (
                        <span className="text-yellow-600 font-semibold">{related.score}/100</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Besoin d'une Assurance Taxi ?
            </h2>
            <p className="text-xl text-yellow-100 mb-8 max-w-2xl mx-auto">
              Obtenez un devis personnalisé en 2 minutes
            </p>
            <Link
              to="/#devis"
              className="inline-block px-8 py-4 bg-white text-yellow-600 font-bold rounded-lg hover:bg-yellow-50 transition-colors shadow-xl"
            >
              Devis Gratuit
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
