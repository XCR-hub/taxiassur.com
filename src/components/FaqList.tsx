import React, { useState, useEffect } from 'react';
import { Plus, Minus, Search, Tag } from 'lucide-react';
import { FaqEntry } from '../lib/schema';
import { getFaqEntries } from '../lib/content';
import Card from './Card';
import { logger } from '@/lib/logger';

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
        logger.error('Failed to load FAQ entries:', error);
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
      {/* Stats Banner */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 shadow-xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-3xl font-bold text-yellow-500">{faqs.length}</div>
            <div className="text-sm text-gray-300">Questions Répondues</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-yellow-400">{allTags.length}</div>
            <div className="text-sm text-gray-300">Thématiques</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-green-400">Expert</div>
            <div className="text-sm text-gray-300">Réponses Certifiées</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-yellow-400">24h/7</div>
            <div className="text-sm text-gray-300">Disponibilité</div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      {(showSearch || showFilters) && (
        <div className="space-y-4">
          {/* Search */}
          {showSearch && (
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-500" size={22} />
              <input
                type="text"
                placeholder="Rechercher dans la FAQ... (ex: tarifs, garanties, documents)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-900/70 border-2 border-gray-700 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-white placeholder-gray-400 backdrop-blur-sm transition-all duration-300 text-base font-medium shadow-lg"
              />
            </div>
          )}

          {/* Tag Filters */}
          {showFilters && allTags.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Tag size={20} className="text-yellow-500" />
                Filtrer par thématique
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
                  Toutes ({faqs.length})
                </button>
                {allTags.map(tag => {
                  const count = faqs.filter(f => f.tags.includes(tag)).length;
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
        </div>
      )}

      {/* FAQ Items */}
      <div className="space-y-4">
        {filteredFaqs.map((faq, index) => (
          <Card
            key={faq.id}
            className={`overflow-hidden transition-all duration-300 border-2 ${
              openIndex === index
                ? 'border-amber-500 shadow-2xl shadow-amber-500/20 bg-gray-800'
                : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
            }`}
          >
            <button
              className="w-full text-left flex justify-between items-center hover:bg-gray-700/30 transition-colors duration-200 p-4 -m-4 rounded-lg group"
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
            >
              <h3 className="text-lg font-bold text-white pr-4 group-hover:text-yellow-500 transition-colors">
                {faq.question}
              </h3>
              <div className={`flex-shrink-0 rounded-full p-2 transition-all ${
                openIndex === index
                  ? 'bg-amber-500 rotate-180'
                  : 'bg-gray-700 group-hover:bg-gray-600'
              }`}>
                {openIndex === index ? (
                  <Minus className="text-black" size={20} />
                ) : (
                  <Plus className="text-white" size={20} />
                )}
              </div>
            </button>

            {openIndex === index && (
              <div className="mt-6 pt-6 border-t-2 border-amber-500/30 animate-fadeIn">
                <p className="text-gray-200 leading-relaxed mb-6 text-base">
                  {faq.answer}
                </p>

                {faq.tags.length > 0 && (
                  <div className="flex items-center space-x-2 pt-4 border-t border-gray-700">
                    <Tag size={16} className="text-yellow-500" />
                    <div className="flex flex-wrap gap-2">
                      {faq.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-3 py-1.5 bg-gray-900 text-yellow-500 text-xs font-semibold rounded-lg border border-amber-500/30"
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
          <p className="text-gray-600 text-lg">
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