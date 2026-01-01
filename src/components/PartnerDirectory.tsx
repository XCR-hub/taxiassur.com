import React, { useState, useEffect } from 'react';
import { Globe, Star, MapPin, Filter } from 'lucide-react';
import { getPartners, type Partner } from '../lib/backlinks';
import Card from './Card';
import { logger } from '@/lib/logger';

interface PartnerDirectoryProps {
  featured?: boolean;
  limit?: number;
  showFilters?: boolean;
}

const PartnerDirectory: React.FC<PartnerDirectoryProps> = ({ 
  featured = false, 
  limit, 
  showFilters = true 
}) => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [filteredPartners, setFilteredPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [allCategories, setAllCategories] = useState<string[]>([]);

  useEffect(() => {
    loadPartners();
  }, []);

  useEffect(() => {
    let filtered = partners;
    
    if (featured) {
      filtered = filtered.filter(partner => partner.featured);
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(partner => partner.category === selectedCategory);
    }
    
    if (limit) {
      filtered = filtered.slice(0, limit);
    }
    
    setFilteredPartners(filtered);
  }, [partners, featured, selectedCategory, limit]);

  const loadPartners = async () => {
    setLoading(true);
    try {
      const data = await getPartners();
      const activePartners = data.filter(partner => partner.status === 'active');
      setPartners(activePartners);
      
      // Extract unique categories
      const categories = Array.from(new Set(activePartners.map(partner => partner.category)));
      setAllCategories(categories);
    } catch (error) {
      logger.error('Failed to load partners:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      directory: 'Annuaires',
      equipment: 'Équipements',
      service: 'Services',
      association: 'Associations',
      media: 'Médias',
      other: 'Autres'
    };
    return labels[category as keyof typeof labels] || category;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          {showFilters && <div className="h-10 bg-gray-200 rounded mb-6"></div>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      {showFilters && allCategories.length > 0 && (
        <div className="flex items-center space-x-4">
          <Filter size={20} className="text-gray-600" />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === '' 
                  ? 'bg-amber-500 text-black' 
                  : 'bg-gray-100 text-gray-700 hover:bg-yellow-100'
              }`}
            >
              Tous
            </button>
            {allCategories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category 
                    ? 'bg-amber-500 text-black' 
                    : 'bg-gray-100 text-gray-700 hover:bg-yellow-100'
                }`}
              >
                {getCategoryLabel(category)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Partners Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPartners.map(partner => (
          <Card key={partner.id} hover className="group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                {partner.logo ? (
                  <img
                    src={partner.logo}
                    alt={partner.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-lg flex items-center justify-center">
                    <Globe className="text-black" size={20} />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-gray-900 group-hover:text-amber-600 transition-colors">
                    {partner.name}
                  </h3>
                  {partner.featured && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <Star size={12} className="mr-1 fill-current" />
                      Partenaire privilégié
                    </span>
                  )}
                </div>
              </div>
            </div>

            <p className="text-gray-600 text-sm mb-4 leading-relaxed">
              {partner.description}
            </p>

            <div className="space-y-2 text-sm text-gray-600 mb-4">
              {partner.location && (
                <div className="flex items-center space-x-2">
                  <MapPin size={14} />
                  <span>{partner.location}</span>
                </div>
              )}

              {partner.rating && (
                <div className="flex items-center space-x-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={i < partner.rating! ? 'text-yellow-400 fill-current' : 'text-gray-300'}
                      />
                    ))}
                  </div>
                  <span>{partner.rating}/5</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100">
              <a
                href={partner.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 text-amber-600 hover:text-amber-700 font-medium transition-colors"
              >
                <span>Visiter le site</span>
                <Globe size={16} />
              </a>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredPartners.length === 0 && !loading && (
        <div className="text-center py-12">
          <Globe className="mx-auto mb-4 text-gray-600" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {selectedCategory 
              ? `Aucun partenaire dans la catégorie "${getCategoryLabel(selectedCategory)}"`
              : 'Aucun partenaire disponible'
            }
          </h3>
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory('')}
              className="mt-4 text-amber-600 hover:text-amber-700 font-medium"
            >
              Voir tous les partenaires
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PartnerDirectory;