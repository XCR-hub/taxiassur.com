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
      {/* Filters */}
      {showFilters && allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTag('')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedTag === '' 
                ? 'bg-amber-500 text-black' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tous
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedTag === tag 
                  ? 'bg-amber-500 text-black' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {paginatedPosts.map(post => (
          <Card key={post.id} hover className="group">
            {post.coverImage && (
              <div className="mb-4 overflow-hidden rounded-lg">
                <img
                  src={post.coverImage}
                  alt={post.title}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
                  loading="lazy"
                />
              </div>
            )}
            
            <div className="space-y-3">
              {/* Meta */}
              <div className="flex items-center space-x-4 text-sm text-gray-400">
                <div className="flex items-center space-x-1">
                  <Calendar size={14} />
                  <span>{formatDate(post.createdAt)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock size={14} />
                  <span>{calculateReadingTime(post.content)} min</span>
                </div>
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-gray-100 group-hover:text-amber-400 transition-colors">
                <Link to={`/blog/${post.id}`}>
                  {post.title}
                </Link>
              </h3>

              {/* Excerpt */}
              <p className="text-gray-300 leading-relaxed">
                {truncateText(post.excerpt, 120)}
              </p>

              {/* Tags */}
              {post.tags.length > 0 && (
                <div className="flex items-center space-x-2">
                  <Tag size={14} className="text-gray-400" />
                  <div className="flex flex-wrap gap-1">
                    {post.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-800/60 text-gray-300 text-xs rounded-full border border-gray-600/50"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Read More */}
              <Link
                to={`/blog/${post.id}`}
                className="inline-flex items-center space-x-2 text-amber-400 hover:text-amber-300 font-medium transition-colors"
              >
                <span>Lire la suite</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </Card>
        ))}
      </div>

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
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
          <p className="text-gray-400 text-lg">Aucun article trouvé.</p>
        </div>
      )}
    </div>
  );
};

export default BlogList;