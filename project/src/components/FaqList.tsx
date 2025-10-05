import React, { useState, useEffect } from 'react';
import { Plus, Minus, Search, Tag } from 'lucide-react';
import { FaqEntry } from '../lib/schema';
import { getFaqEntries } from '../lib/content';
import Card from './Card';

interface FaqListProps {
  limit?: number;
  showSearch?: boolean;
  showFilters?: boolean;
}

const FaqList: React.FC<FaqListProps> = ({ 
  limit, 
  showSearch = true, 
  showFilters = true 
}) => {
  const [faqs, setFaqs] = useState<FaqEntry[]>([]);
  const [filteredFaqs, setFilteredFaqs] = useState<FaqEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    const loadFaqs = async () => {
      try {
        const faqEntries = await getFaqEntries();
        setFaqs(faqEntries);
        setFilteredFaqs(limit ? faqEntries.slice(0, limit) : faqEntries);
        
        // Extract all unique tags
        const tags = Array.from(new Set(faqEntries.flatMap(faq => faq.tags)));
        setAllTags(tags);
      } catch (error) {
        console.error('Failed to load FAQ entries:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFaqs();
  }, [limit]);

  useEffect(() => {
    let filtered = faqs;
    
    if (searchTerm) {
      filtered = filtered.filter(faq =>
        faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedTag) {
      filtered = filtered.filter(faq => faq.tags.includes(selectedTag));
    }
    
    if (limit) {
      filtered = filtered.slice(0, limit);
    }
    
    setFilteredFaqs(filtered);
    setOpenIndex(null);
  }, [faqs, searchTerm, selectedTag, limit]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      {(showSearch || showFilters) && (
        <div className="space-y-4">
          {/* Search */}
          {showSearch && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Rechercher dans la FAQ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white placeholder-gray-400 backdrop-blur-sm transition-all duration-300"
              />
            </div>
          )}

          {/* Tag Filters */}
          {showFilters && allTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedTag('')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedTag === '' 
                    ? 'bg-amber-500 text-black shadow-lg' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600'
                }`}
              >
                Toutes
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedTag === tag 
                      ? 'bg-amber-500 text-black shadow-lg' 
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FAQ Items */}
      <div className="space-y-4">
        {filteredFaqs.map((faq, index) => (
          <Card key={faq.id} className="overflow-hidden">
            <button
              className="w-full text-left flex justify-between items-center hover:bg-gray-800/50 transition-colors duration-200 p-2 -m-2 rounded-lg"
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
            >
              <h3 className="text-lg font-semibold text-white pr-4">
                {faq.question}
              </h3>
              {openIndex === index ? (
                <Minus className="text-amber-600 flex-shrink-0" size={20} />
              ) : (
                <Plus className="text-gray-500 flex-shrink-0" size={20} />
              )}
            </button>
            
            {openIndex === index && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <p className="text-gray-300 leading-relaxed mb-4">
                  {faq.answer}
                </p>
                
                {faq.tags.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <Tag size={14} className="text-gray-400" />
                    <div className="flex flex-wrap gap-1">
                      {faq.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-gray-800 text-gray-400 text-xs rounded-full border border-gray-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredFaqs.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">
            {searchTerm || selectedTag 
              ? 'Aucune question trouvée pour votre recherche.' 
              : 'Aucune question disponible.'
            }
          </p>
          {(searchTerm || selectedTag) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedTag('');
              }}
              className="mt-4 text-amber-600 hover:text-amber-700 font-medium"
            >
              Effacer les filtres
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FaqList;