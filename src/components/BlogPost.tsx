import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Calendar, Clock, Tag, ArrowLeft, User } from 'lucide-react';
import { BlogPost as BlogPostType } from '../lib/schema';
import { getBlogPost } from '../lib/content';
import { formatDate, calculateReadingTime } from '../lib/utils';
import ArticleContent from './ArticleContent';
import LeadMagnetSection from './LeadMagnetSection';
import { logger } from '@/lib/logger';

const BlogPost: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // IMPORTANT: Tous les hooks doivent être appelés avant tout return conditionnel
  // Sinon on a l'erreur "Rendered more hooks than during the previous render"
  const breadcrumbs = useMemo(() => {
    if (!post) return [];
    return [
      { name: 'Accueil', url: '/' },
      { name: 'Blog', url: '/blog' },
      { name: post.title, url: `/blog/${post.id}` }
    ];
  }, [post]);

  useEffect(() => {
    const loadPost = async () => {
      if (!slug) {
        setError('ID de l\'article manquant');
        setLoading(false);
        return;
      }

      try {
        const blogPost = await getBlogPost(slug);
        if (blogPost) {
          setPost(blogPost);
        } else {
          setError('Article non trouvé');
        }
      } catch (err) {
        logger.error('Failed to load blog post:', err);
        setError('Erreur lors du chargement de l\'article');
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-4"></div>
              <div className="h-64 bg-gray-200 rounded mb-8"></div>
              <div className="space-y-4">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {error || 'Article non trouvé'}
            </h1>
            <p className="text-gray-600 mb-8">
              L'article que vous recherchez n'existe pas ou a été supprimé.
            </p>
            <Link
              to="/blog"
              className="inline-flex items-center space-x-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Retour au blog</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{post.title} | TaxiAssur Blog</title>
        <meta name="description" content={post.excerpt} />
        <link rel="canonical" href={`https://taxiassur.com/blog/${post.id}`} />

        {/* Open Graph */}
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`https://taxiassur.com/blog/${post.id}`} />
        {post.coverImage && <meta property="og:image" content={post.coverImage} />}
        <meta property="og:image:alt" content={`${post.title} - TaxiAssur Blog`} />
        <meta property="article:published_time" content={post.createdAt} />
        <meta property="article:author" content={post.author} />
        {post.tags?.map(tag => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.excerpt} />
        {post.coverImage && <meta name="twitter:image" content={post.coverImage} />}
        <meta name="twitter:image:alt" content={`${post.title} - TaxiAssur Blog`} />

        {/* JSON-LD Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": post.title,
            "description": post.excerpt,
            "image": post.coverImage || "https://taxiassur.com/logo-600x300.png",
            "datePublished": post.createdAt,
            "dateModified": post.updatedAt || post.createdAt,
            "author": {
              "@type": "Person",
              "name": post.author || "TaxiAssur"
            },
            "publisher": {
              "@type": "Organization",
              "name": "TaxiAssur",
              "logo": {
                "@type": "ImageObject",
                "url": "https://taxiassur.com/logo-600x300.png"
              }
            },
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": `https://taxiassur.com/blog/${post.id}`
            },
            "keywords": post.tags?.join(', ') || ''
          })}
        </script>

        {/* Breadcrumb Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": breadcrumbs.map((crumb, index) => ({
              "@type": "ListItem",
              "position": index + 1,
              "name": crumb.name,
              "item": `https://taxiassur.com${crumb.url}`
            }))
          })}
        </script>

        {/* FAQ Schema if available */}
        {post.faq && post.faq.length > 0 && (
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": post.faq.map(item => ({
                "@type": "Question",
                "name": item.q,
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": item.a
                }
              }))
            })}
          </script>
        )}
      </Helmet>

      <div className="min-h-screen bg-white">
        {/* Breadcrumb */}
        <div className="bg-white border-b border-yellow-200">
          <div className="container mx-auto px-4 py-4">
            <nav className="flex items-center space-x-2 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.url}>
                  {index > 0 && <span className="text-gray-400">/</span>}
                  {index === breadcrumbs.length - 1 ? (
                    <span className="text-gray-600">{crumb.name}</span>
                  ) : (
                    <Link to={crumb.url} className="text-yellow-600 hover:text-yellow-700">
                      {crumb.name}
                    </Link>
                  )}
                </React.Fragment>
              ))}
            </nav>
          </div>
        </div>

        {/* Article */}
        <article className="container mx-auto px-4 py-12 max-w-4xl">
          {/* Back Button */}
          <Link
            to="/blog"
            className="inline-flex items-center space-x-2 text-yellow-600 hover:text-yellow-700 font-medium mb-6"
          >
            <ArrowLeft size={20} />
            <span>Retour au blog</span>
          </Link>

          {/* Header */}
          <header className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              {post.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-6">
              <div className="flex items-center space-x-2">
                <User size={16} />
                <span>{post.author || 'TaxiAssur'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar size={16} />
                <span>{formatDate(post.createdAt)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock size={16} />
                <span>{calculateReadingTime(post.content)} min de lecture</span>
              </div>
            </div>

            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {post.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center space-x-1 px-3 py-1 bg-yellow-100 text-yellow-700 text-sm font-semibold rounded-full"
                  >
                    <Tag size={14} />
                    <span>{tag}</span>
                  </span>
                ))}
              </div>
            )}

            {post.coverImage && (
              <div className="mb-8 rounded-xl overflow-hidden">
                <img
                  src={post.coverImage}
                  alt={post.title}
                  className="w-full h-auto"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}

            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              {post.excerpt}
            </p>
          </header>

          {/* Content with Table of Contents */}
          <div className="mb-8">
            <ArticleContent content={post.content} showTableOfContents={true} />
          </div>

          {/* FAQ Section */}
          {post.faq && post.faq.length > 0 && (
            <section className="mb-12 bg-gradient-to-br from-yellow-50 to-white border border-yellow-200 rounded-xl p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Questions Fréquentes
              </h2>
              <div className="space-y-4">
                {post.faq.map((item, index) => (
                  <div key={index} className="bg-white border border-yellow-100 rounded-lg p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">
                      {item.q}
                    </h3>
                    <p className="text-gray-700 leading-relaxed">
                      {item.a}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Back to Blog */}
          <div className="text-center">
            <Link
              to="/blog"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-3 px-8 rounded-lg transition-colors shadow-lg"
            >
              <ArrowLeft size={20} />
              <span>Retour au blog</span>
            </Link>
          </div>
        </article>

        <LeadMagnetSection sourcePage={`blog/${slug}`} variant="compact" />

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
      </div>
    </>
  );
};

export default BlogPost;
