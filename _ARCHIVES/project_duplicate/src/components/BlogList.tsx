import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Tag, ArrowRight } from 'lucide-react';
import { BlogPost } from '../lib/schema';
import { getBlogPosts } from '../lib/content';
import { formatDate, calculateReadingTime, truncateText } from '../lib/utils';
import Card from './Card';

interface BlogListProps {
  limit?: number;
  showPagination?: boolean;
  showFilters?: boolean;
}

const BlogList: React.FC<BlogListProps> = ({ 
  limit, 
  showPagination = true, 
  showFilters = true 
}) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [allTags, setAllTags] = useState<string[]>([]);
  
  const postsPerPage = 6;

  useEffect(() => {
    const loadPosts = async () => {
      try {
        const blogPosts = await getBlogPosts();
        setPosts(blogPosts);
        setFilteredPosts(limit ? blogPosts.slice(0, limit) : blogPosts);
        
        // Extract all unique tags
        const tags = Array.from(new Set(blogPosts.flatMap(post => post.tags)));
        setAllTags(tags);
      } catch (error) {
        console.error('Failed to load blog posts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [limit]);

  useEffect(() => {
    let filtered = posts;
    
    if (selectedTag) {
      filtered = posts.filter(post => post.tags.includes(selectedTag));
    }
    
    if (limit) {
      filtered = filtered.slice(0, limit);
    }
    
    setFilteredPosts(filtered);
    setCurrentPage(1);
  }, [posts, selectedTag, limit]);

  const paginatedPosts = showPagination 
    ? filteredPosts.slice((currentPage - 1) * postsPerPage, currentPage * postsPerPage)
    : filteredPosts;

  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Banner */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 shadow-xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-3xl font-bold text-yellow-500">{posts.length}</div>
            <div className="text-sm text-gray-300">Articles Publiés</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-yellow-400">{allTags.length}</div>
            <div className="text-sm text-gray-300">Catégories</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-green-400">100%</div>
            <div className="text-sm text-gray-300">Contenu Expert</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-yellow-400">Gratuit</div>
            <div className="text-sm text-gray-300">Accès Illimité</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && allTags.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Tag size={20} className="text-yellow-500" />
            Filtrer par catégorie
          </h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedTag('')}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                selectedTag === ''
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-500/30 scale-105'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-700'
              }`}
            >
              Toutes ({posts.length})
            </button>
            {allTags.map(tag => {
              const count = posts.filter(p => p.tags.includes(tag)).length;
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                    selectedTag === tag
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-500/30 scale-105'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-700'
                  }`}
                >
                  {tag} ({count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {paginatedPosts.map(post => (
          <Card
            key={post.id}
            hover
            className="group bg-gray-800 border-2 border-gray-700 hover:border-amber-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/10"
          >
            {post.coverImage && (
              <div className="mb-5 overflow-hidden rounded-xl border-2 border-gray-700 group-hover:border-amber-500/50 transition-all duration-300">
                <img
                  src={post.coverImage}
                  alt={post.title}
                  className="w-full h-56 object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
            )}

            <div className="space-y-4">
              {/* Meta */}
              <div className="flex items-center space-x-4 text-sm text-gray-400">
                <div className="flex items-center space-x-2 bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-700">
                  <Calendar size={16} className="text-yellow-400" />
                  <span className="font-medium">{formatDate(post.createdAt)}</span>
                </div>
                <div className="flex items-center space-x-2 bg-gray-900 px-3 py-1.5 rounded-lg border border-gray-700">
                  <Clock size={16} className="text-green-400" />
                  <span className="font-medium">{calculateReadingTime(post.content)} min</span>
                </div>
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-white group-hover:text-yellow-500 transition-colors leading-tight min-h-[3.5rem]">
                <Link to={`/blog/${post.id}`}>
                  {post.title}
                </Link>
              </h3>

              {/* Excerpt */}
              <p className="text-gray-300 leading-relaxed text-sm min-h-[4.5rem]">
                {truncateText(post.excerpt, 140)}
              </p>

              {/* Tags */}
              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-700">
                  {post.tags.slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 bg-amber-500/10 text-yellow-500 text-xs font-semibold rounded-lg border border-amber-500/30 hover:bg-amber-500/20 transition-colors"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Read More */}
              <Link
                to={`/blog/${post.id}`}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black px-5 py-2.5 rounded-lg font-bold transition-all duration-300 shadow-lg hover:shadow-amber-500/30 mt-4"
              >
                <span>Lire l'article</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </Card>
        ))}
      </div>

      {/* Results count */}
      {filteredPosts.length > 0 && (
        <div className="text-center text-gray-400 text-sm">
          Affichage de {paginatedPosts.length} article{paginatedPosts.length > 1 ? 's' : ''} sur {filteredPosts.length} au total
        </div>
      )}

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentPage === i + 1
                  ? 'bg-amber-500 text-black'
                  : 'bg-gray-100 text-gray-700 hover:bg-yellow-100'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Empty State */}
      {paginatedPosts.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">Aucun article trouvé.</p>
        </div>
      )}
    </div>
  );
};

export default BlogList;