import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, Clock, Tag, ArrowLeft, User } from 'lucide-react';
import { BlogPost as BlogPostType } from '../lib/schema';
import { getBlogPost } from '../lib/content';
import { formatDate, calculateReadingTime } from '../lib/utils';
import Seo from './Seo';
import JsonLd from './JsonLd';
import FaqList from './FaqList';
import { logger } from '@/lib/logger';

const BlogPost: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPost = async () => {
      if (!id) {
        setError('ID de l\'article manquant');
        setLoading(false);
        return;
      }

      try {
        const blogPost = await getBlogPost(id);
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
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container-max section-padding">
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
        <div className="container-max section-padding">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {error || 'Article non trouvé'}
            </h1>
            <p className="text-gray-600 mb-8">
              L'article que vous recherchez n'existe pas ou a été supprimé.
            </p>
            <Link
              to="/blog"
              className="inline-flex items-center space-x-2 bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 px-6 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Retour au blog</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const breadcrumbs = [
    { name: 'Accueil', url: '/' },
    { name: 'Blog', url: '/blog' },
    { name: post.title, url: `/blog/${post.id}` }
  ];

  return (
    <>
      <Seo
        title={post.title}
        description={post.excerpt}
        canonical={`/blog/${post.id}`}
        ogImage={post.coverImage}
        ogType="article"
        keywords={post.tags.join(', ')}
      />
      <JsonLd type="article" data={post} />
      <JsonLd type="breadcrumb" data={breadcrumbs} />

      <div className="min-h-screen bg-white">
        <div className="container-max section-padding">
          <div className="max-w-4xl mx-auto">
            {/* Breadcrumb */}
            <nav className="mb-8">
              <ol className="flex items-center space-x-2 text-sm text-gray-600">
                {breadcrumbs.map((crumb, index) => (
                  <li key={crumb.url} className="flex items-center">
                    {index > 0 && <span className="mx-2">/</span>}
                    {index === breadcrumbs.length - 1 ? (
                      <span className="text-gray-900 font-medium">{crumb.name}</span>
                    ) : (
                      <Link to={crumb.url} className="hover:text-amber-600 transition-colors">
                        {crumb.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            </nav>

            {/* Header */}
            <header className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {post.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 mb-6">
                <div className="flex items-center space-x-2">
                  <User size={16} />
                  <span>{post.author}</span>
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

              {post.tags.length > 0 && (
                <div className="flex items-center space-x-2 mb-6">
                  <Tag size={16} className="text-gray-600" />
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-amber-100 text-amber-800 text-sm rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {post.coverImage && (
                <div className="mb-8">
                  <img
                    src={post.coverImage}
                    alt={post.title}
                    className="w-full h-64 md:h-96 object-cover rounded-2xl shadow-lg"
                  />
                </div>
              )}
            </header>

            {/* Content */}
            <article className="mb-12">
              <div
                className="blog-content text-gray-700 leading-relaxed space-y-6"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            </article>

            {/* FAQ Section */}
            {post.faq && post.faq.length > 0 && (
              <section className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Questions Fréquentes
                </h2>
                <div className="space-y-4">
                  {post.faq.map((item, index) => (
                    <div key={index} className="bg-white border border-yellow-100 rounded-lg p-6">
                      <h3 className="font-semibold text-gray-900 mb-2">
                        {item.q}
                      </h3>
                      <p className="text-gray-700">
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
                className="inline-flex items-center space-x-2 bg-gray-100 hover:bg-yellow-100 text-gray-900 font-medium py-3 px-6 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
                <span>Retour au blog</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BlogPost;