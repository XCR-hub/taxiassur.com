import { useState, useEffect, useCallback } from 'react';
import { Search, X, TrendingUp, Users, FileText, Building2, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  type: 'lead' | 'contract' | 'document' | 'company';
  title: string;
  subtitle: string;
  url: string;
  icon: React.ElementType;
  metadata?: string;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('recent_searches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  const saveRecentSearch = (search: string) => {
    const updated = [search, ...recentSearches.filter(s => s !== search)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recent_searches', JSON.stringify(updated));
  };

  const searchAll = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    const allResults: SearchResult[] = [];

    try {
      const searchTerm = `%${searchQuery}%`;

      const { data: leads } = await supabase
        .from('crm_leads')
        .select('id, first_name, last_name, email, phone, status')
        .or(`first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm}`)
        .limit(5);

      if (leads) {
        leads.forEach(lead => {
          allResults.push({
            id: lead.id,
            type: 'lead',
            title: `${lead.first_name} ${lead.last_name}`,
            subtitle: lead.email,
            url: `/backoffice/crm/lead/${lead.id}`,
            icon: Users,
            metadata: lead.status
          });
        });
      }

      const { data: companies } = await supabase
        .from('insurance_companies')
        .select('id, name, email, phone')
        .ilike('name', searchTerm)
        .limit(5);

      if (companies) {
        companies.forEach(company => {
          allResults.push({
            id: company.id,
            type: 'company',
            title: company.name,
            subtitle: company.email || 'Compagnie d\'assurance',
            url: `/backoffice/insurance-companies?company=${company.id}`,
            icon: Building2,
            metadata: 'Compagnie'
          });
        });
      }

      const { data: docs } = await supabase
        .from('crm_lead_documents')
        .select('id, document_type, file_path, lead_id')
        .ilike('document_type', searchTerm)
        .limit(5);

      if (docs) {
        docs.forEach(doc => {
          allResults.push({
            id: doc.id,
            type: 'document',
            title: doc.document_type,
            subtitle: doc.file_path || 'Document',
            url: `/backoffice/crm/lead/${doc.lead_id}?tab=documents`,
            icon: FileText,
            metadata: 'Document'
          });
        });
      }

      setResults(allResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [recentSearches]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchAll(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchAll]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % results.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const handleSelect = (result: SearchResult) => {
    saveRecentSearch(query);
    navigate(result.url);
    onClose();
  };

  if (!isOpen) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'lead': return Users;
      case 'contract': return FileText;
      case 'document': return FileText;
      case 'company': return Building2;
      default: return Search;
    }
  };

  const getTypeBadge = (type: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      lead: { label: 'Lead', className: 'bg-blue-100 text-blue-700' },
      contract: { label: 'Contrat', className: 'bg-green-100 text-green-700' },
      document: { label: 'Document', className: 'bg-purple-100 text-purple-700' },
      company: { label: 'Compagnie', className: 'bg-orange-100 text-orange-700' }
    };
    return badges[type] || badges.lead;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-[15vh] backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-200">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher leads, contrats, documents, compagnies..."
            className="flex-1 bg-transparent border-none outline-none text-gray-900 placeholder-gray-400 text-lg"
            autoFocus
          />
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-300 rounded">
              ESC
            </kbd>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {loading && (
            <div className="p-8 text-center text-gray-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2">Recherche en cours...</p>
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-lg font-medium">Aucun résultat</p>
              <p className="text-sm mt-1">Essayez avec d'autres mots-clés</p>
            </div>
          )}

          {!loading && !query && recentSearches.length > 0 && (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span className="font-medium">Recherches récentes</span>
              </div>
              <div className="space-y-1">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => setQuery(search)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                  >
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="py-2">
              {results.map((result, index) => {
                const Icon = result.icon;
                const badge = getTypeBadge(result.type);
                return (
                  <button
                    key={result.id}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      'w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors group',
                      selectedIndex === index && 'bg-blue-50'
                    )}
                  >
                    <div className={cn(
                      'p-2 rounded-lg',
                      selectedIndex === index ? 'bg-blue-100' : 'bg-gray-100'
                    )}>
                      <Icon className={cn(
                        'w-5 h-5',
                        selectedIndex === index ? 'text-blue-600' : 'text-gray-600'
                      )} />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{result.title}</p>
                        <span className={cn(
                          'px-2 py-0.5 text-xs font-medium rounded',
                          badge.className
                        )}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{result.subtitle}</p>
                    </div>
                    <ArrowRight className={cn(
                      'w-5 h-5 transition-opacity',
                      selectedIndex === index ? 'opacity-100 text-blue-600' : 'opacity-0 group-hover:opacity-100 text-gray-400'
                    )} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">↓</kbd>
              <span className="ml-1">Naviguer</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded">Enter</kbd>
              <span className="ml-1">Sélectionner</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Recherche instantanée</span>
          </div>
        </div>
      </div>
    </div>
  );
}
