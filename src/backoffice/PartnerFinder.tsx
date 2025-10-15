import React, { useState, useEffect, useMemo } from 'react';
import { Search, Globe, Plus, Eye, CheckCircle, XCircle, Download, Filter, RefreshCw, Home } from 'lucide-react';
import { cseSearch, extractDomain, generateProspectId, extractContactUrl } from '../lib/cse';
import { batchSaveProspects } from '../lib/partners';
import { Prospect } from '../lib/schema';
import queries from '../data/queries.json';
import Card from '../components/Card';

interface Candidate {
  id: string;
  title: string;
  url: string;
  domain: string;
  snippet?: string;
  status: 'new' | 'qualified' | 'rejected';
  contactUrls: string[];
  type: Prospect['type'];
}

const PartnerFinder: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedQuery, setSelectedQuery] = useState(queries[0]?.q || '');
  const [customQuery, setCustomQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [remainingQuota, setRemainingQuota] = useState(100);

  const filteredCandidates = useMemo(() => {
    return candidates.filter(candidate => {
      if (filterType !== 'all' && candidate.type !== filterType) return false;
      if (filterStatus !== 'all' && candidate.status !== filterStatus) return false;
      return true;
    });
  }, [candidates, filterType, filterStatus]);

  const dedupedCandidates = useMemo(() => {
    const seen = new Set<string>();
    return filteredCandidates.filter(candidate => {
      if (seen.has(candidate.domain)) return false;
      seen.add(candidate.domain);
      return true;
    });
  }, [filteredCandidates]);

  const runSearch = async () => {
    setLoading(true);
    try {
      const query = customQuery || selectedQuery;
      const result = await cseSearch(query, 1);
      
      setRemainingQuota(result.remainingQuota);
      
      const newCandidates: Candidate[] = result.items.map(item => ({
        id: generateProspectId(extractDomain(item.link)),
        title: item.title,
        url: item.link,
        domain: extractDomain(item.link),
        snippet: item.snippet,
        status: 'new',
        contactUrls: extractContactUrl(item.link),
        type: inferProspectType(item.title, item.snippet || '')
      }));
      
      setCandidates(prev => {
        const merged = [...prev, ...newCandidates];
        const domainMap = new Map<string, Candidate>();
        
        merged.forEach(candidate => {
          if (!domainMap.has(candidate.domain)) {
            domainMap.set(candidate.domain, candidate);
          }
        });
        
        return Array.from(domainMap.values());
      });
      
      console.log(`✅ Partner Finder: ${result.items.length} nouveaux prospects trouvés`);
    } catch (error) {
      console.error('Search error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur de recherche';
      console.error('❌ Partner Finder Error:', errorMessage);
      alert(`❌ ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const inferProspectType = (title: string, snippet: string): Prospect['type'] => {
    const text = (title + ' ' + snippet).toLowerCase();
    
    if (text.includes('association') || text.includes('fédération') || text.includes('syndicat')) return 'asso';
    if (text.includes('blog') || text.includes('magazine') || text.includes('média')) return 'media';
    if (text.includes('flotte') || text.includes('compagnie')) return 'fleet';
    if (text.includes('garage') || text.includes('entretien')) return 'garage';
    if (text.includes('école') || text.includes('formation')) return 'ecole';
    if (text.includes('annuaire') || text.includes('répertoire')) return 'annuaire';
    
    return 'annuaire';
  };

  const updateCandidateStatus = (domain: string, status: Candidate['status']) => {
    setCandidates(prev => 
      prev.map(candidate => 
        candidate.domain === domain ? { ...candidate, status } : candidate
      )
    );
  };

  const exportQualified = async () => {
    const qualified = candidates.filter(c => c.status === 'qualified');
    
    if (qualified.length === 0) {
      alert('Aucun prospect qualifié à exporter');
      return;
    }

    try {
      const prospects: Prospect[] = qualified.map(candidate => ({
        id: candidate.id,
        name: candidate.title,
        domain: candidate.domain,
        country: 'FR',
        type: candidate.type,
        contactPageUrl: candidate.contactUrls[0],
        source: 'CSE',
        discoveredAt: new Date().toISOString(),
        status: 'new',
        notes: candidate.snippet
      }));

      const success = await batchSaveProspects(prospects);
      
      if (success) {
        alert(`✅ ${qualified.length} prospects exportés avec succès !`);
        // Clear qualified candidates
        setCandidates(prev => prev.filter(c => c.status !== 'qualified'));
      } else {
        alert('❌ Erreur lors de l\'export');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('❌ Erreur de connexion');
    }
  };

  const clearAll = () => {
    if (confirm('Effacer tous les candidats ?')) {
      setCandidates([]);
    }
  };

  const getTypeColor = (type: Prospect['type']) => {
    const colors = {
      annuaire: 'bg-orange-100 text-orange-800',
      asso: 'bg-green-100 text-green-800',
      blog: 'bg-orange-100 text-orange-800',
      media: 'bg-pink-100 text-pink-800',
      fleet: 'bg-orange-100 text-orange-800',
      garage: 'bg-gray-100 text-gray-800',
      ecole: 'bg-yellow-100 text-yellow-800'
    };
    return colors[type] || colors.annuaire;
  };

  const getStatusColor = (status: Candidate['status']) => {
    const colors = {
      new: 'bg-gray-100 text-gray-800',
      qualified: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status];
  };

  return (
    
      <div className="min-h-screen bg-gray-50 p-8">
        {/* Header */}
        <header className="bg-white border-b-2 border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Search className="text-black" size={20} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Partner Finder
                  </h1>
                  <p className="text-sm text-gray-600">
                    Découverte éthique de prospects via Google CSE
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <a
                  href="/backoffice"
                  className="bg-orange-600 hover:bg-orange-700 text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Home size={16} />
                  <span>Accueil Admin</span>
                </a>
                <div className="text-sm text-gray-600">
                  Quota restant: <span className="font-bold text-orange-600">{remainingQuota}</span>
                </div>
                <button
                  onClick={exportQualified}
                  disabled={candidates.filter(c => c.status === 'qualified').length === 0}
                  className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  <Download size={16} />
                  <span>Exporter Qualifiés ({candidates.filter(c => c.status === 'qualified').length})</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto">
          {/* Search Controls */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    Requête prédéfinie
                  </label>
                  <select
                    value={selectedQuery}
                    onChange={(e) => setSelectedQuery(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-orange-500 text-gray-900 font-medium"
                  >
                    {queries.map(query => (
                      <option key={query.q} value={query.q}>
                        {query.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-800 mb-2">
                    Requête personnalisée
                  </label>
                  <input
                    type="text"
                    value={customQuery}
                    onChange={(e) => setCustomQuery(e.target.value)}
                    placeholder='Ex: site:.fr "taxi" partenariat'
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-orange-500 text-gray-900 font-medium"
                  />
                </div>
                
                <div className="flex items-end space-x-2">
                  <button
                    onClick={runSearch}
                    disabled={loading || remainingQuota <= 0}
                    className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg hover:shadow-xl"
                  >
                    {loading ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <Search size={16} />
                    )}
                    <span>{loading ? 'Recherche...' : 'Rechercher'}</span>
                  </button>
                  
                  <button
                    onClick={clearAll}
                    className="px-4 py-3 border-2 border-gray-300 text-gray-800 font-bold rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Effacer
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex items-center space-x-4">
                <Filter size={16} className="text-gray-600" />
                
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-bold text-gray-800"
                >
                  <option value="all">Tous types</option>
                  <option value="annuaire">Annuaires</option>
                  <option value="asso">Associations</option>
                  <option value="blog">Blogs</option>
                  <option value="media">Médias</option>
                  <option value="fleet">Flottes</option>
                  <option value="garage">Garages</option>
                  <option value="ecole">Écoles</option>
                </select>
                
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-bold text-gray-800"
                >
                  <option value="all">Tous statuts</option>
                  <option value="new">Nouveaux</option>
                  <option value="qualified">Qualifiés</option>
                  <option value="rejected">Rejetés</option>
                </select>
                
                <div className="text-sm font-bold text-gray-800 bg-gray-100 px-3 py-2 rounded-lg">
                  {dedupedCandidates.length} résultats uniques
                </div>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-orange-100 border-2 border-orange-300 rounded-xl shadow-lg p-6 mb-8">
            <div className="flex items-start space-x-3">
              <Globe className="text-orange-800 flex-shrink-0 mt-1" size={20} />
              <div>
                <h3 className="font-bold text-orange-900 mb-3 text-lg">Instructions de Qualification</h3>
                <ul className="text-sm font-medium text-orange-800 space-y-2">
                  <li>• Ouvrez chaque site pour vérifier manuellement la page Contact/Partenariat</li>
                  <li>• Marquez "Qualifié" seulement si contact public visible et partenariat autorisé</li>
                  <li>• Vérifiez que le site est actif et professionnel</li>
                  <li>• Évitez les sites concurrents directs</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            {dedupedCandidates.map(candidate => (
              <div key={candidate.id} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl hover:border-gray-300 transition-all duration-300">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <a
                        href={candidate.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg font-bold text-orange-700 hover:text-orange-900 transition-colors"
                      >
                        {candidate.title}
                      </a>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(candidate.type)}`}>
                        {candidate.type}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(candidate.status)}`}>
                        {candidate.status}
                      </span>
                    </div>
                    
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      <Globe size={14} className="inline mr-1" />
                      {candidate.domain}
                    </div>
                    
                    {candidate.snippet && (
                      <p className="text-gray-800 mb-3 text-sm leading-relaxed font-medium">
                        {candidate.snippet}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap gap-2">
                      {candidate.contactUrls.map((contactUrl, index) => (
                        <a
                          key={index}
                          href={contactUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium px-3 py-2 rounded-lg transition-colors"
                        >
                          {contactUrl.split('/').pop()}
                        </a>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => updateCandidateStatus(candidate.domain, 'qualified')}
                      className="flex items-center space-x-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-colors shadow-lg hover:shadow-xl"
                    >
                      <CheckCircle size={14} />
                      <span>Qualifié</span>
                    </button>
                    
                    <button
                      onClick={() => updateCandidateStatus(candidate.domain, 'rejected')}
                      className="flex items-center space-x-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg transition-colors shadow-lg hover:shadow-xl"
                    >
                      <XCircle size={14} />
                      <span>Rejeté</span>
                    </button>
                    
                    <button
                      onClick={() => window.open(candidate.url, '_blank')}
                      className="flex items-center space-x-1 px-4 py-2 border-2 border-gray-300 text-gray-800 text-sm font-bold rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Eye size={14} />
                      <span>Voir</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {dedupedCandidates.length === 0 && !loading && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 text-center py-12 px-8">
              <Search className="mx-auto mb-4 text-gray-600" size={48} />
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Aucun résultat
              </h3>
              <p className="text-gray-700 font-medium mb-6">
                Lancez une recherche pour découvrir des prospects potentiels
              </p>
              <button
                onClick={runSearch}
                disabled={remainingQuota <= 0}
                className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg hover:shadow-xl"
              >
                Commencer la Recherche
              </button>
            </div>
          )}

          {/* Stats */}
          {candidates.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mt-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Statistiques de Session</h3>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-3xl font-bold text-orange-700">{candidates.length}</div>
                  <div className="text-sm font-bold text-gray-700">Total trouvés</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-green-700">
                    {candidates.filter(c => c.status === 'qualified').length}
                  </div>
                  <div className="text-sm font-bold text-gray-700">Qualifiés</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-red-700">
                    {candidates.filter(c => c.status === 'rejected').length}
                  </div>
                  <div className="text-sm font-bold text-gray-700">Rejetés</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-gray-700">
                    {candidates.filter(c => c.status === 'new').length}
                  </div>
                  <div className="text-sm font-bold text-gray-700">À reviewer</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    
  );
};

export default PartnerFinder;