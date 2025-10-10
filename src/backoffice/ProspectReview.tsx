import React, { useState, useEffect } from 'react';
import { Eye, CheckCircle, XCircle, Mail, Globe, Calendar, User, Tag, MessageSquare, Home } from 'lucide-react';
import { getProspects, saveProspect, saveConsent } from '../lib/partners';
import { generateUnsubscribeToken, generateUnsubscribeUrl } from '../lib/outreach';
import { Prospect, Consent } from '../lib/schema';
import Card from '../components/Card';

const ProspectReview: React.FC = () => {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('new');
  const [filterType, setFilterType] = useState<string>('all');

  const [consentData, setConsentData] = useState({
    email: '',
    lawfulBasis: 'legitimate_interest' as const,
    notes: ''
  });

  useEffect(() => {
    loadProspects();
  }, []);

  const loadProspects = async () => {
    setLoading(true);
    try {
      const data = await getProspects();
      setProspects(data);
    } catch (error) {
      console.error('Failed to load prospects:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProspects = prospects.filter(prospect => {
    if (filterStatus !== 'all' && prospect.status !== filterStatus) return false;
    if (filterType !== 'all' && prospect.type !== filterType) return false;
    return true;
  });

  const updateProspectStatus = async (prospectId: string, status: Prospect['status'], notes?: string) => {
    const prospect = prospects.find(p => p.id === prospectId);
    if (!prospect) return;

    const updatedProspect: Prospect = {
      ...prospect,
      status,
      reviewedAt: new Date().toISOString(),
      reviewedBy: 'Admin', // In real app, get from auth context
      notes: notes || prospect.notes
    };

    try {
      const success = await saveProspect(updatedProspect);
      if (success) {
        setProspects(prev => 
          prev.map(p => p.id === prospectId ? updatedProspect : p)
        );
        
        if (status === 'qualified') {
          setSelectedProspect(updatedProspect);
          setShowConsentModal(true);
        }
      } else {
        alert('Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Update error:', error);
      alert('Erreur de connexion');
    }
  };

  const handleConsentSubmit = async () => {
    if (!selectedProspect || !consentData.email) return;

    const token = generateUnsubscribeToken(consentData.email);
    const optOutUrl = generateUnsubscribeUrl(consentData.email, token);

    const consent: Consent = {
      id: `consent-${selectedProspect.id}-${Date.now()}`,
      prospectId: selectedProspect.id,
      email: consentData.email,
      lawfulBasis: consentData.lawfulBasis,
      collectedAt: new Date().toISOString(),
      collectedBy: 'Admin',
      purpose: 'partnership',
      optOutUrl,
      retentionMonths: 24
    };

    try {
      const success = await saveConsent(consent);
      if (success) {
        alert('✅ Consentement enregistré avec succès !');
        setShowConsentModal(false);
        setSelectedProspect(null);
        setConsentData({ email: '', lawfulBasis: 'legitimate_interest', notes: '' });
      } else {
        alert('❌ Erreur lors de l\'enregistrement');
      }
    } catch (error) {
      console.error('Consent save error:', error);
      alert('❌ Erreur de connexion');
    }
  };

  const getTypeColor = (type: Prospect['type']) => {
    const colors = {
      annuaire: 'bg-blue-100 text-blue-800',
      asso: 'bg-green-100 text-green-800',
      blog: 'bg-purple-100 text-purple-800',
      media: 'bg-pink-100 text-pink-800',
      fleet: 'bg-orange-100 text-orange-800',
      garage: 'bg-gray-100 text-gray-800',
      ecole: 'bg-indigo-100 text-indigo-800'
    };
    return colors[type] || colors.annuaire;
  };

  const getStatusColor = (status: Prospect['status']) => {
    const colors = {
      new: 'bg-gray-100 text-gray-800',
      qualified: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      contacted: 'bg-blue-100 text-blue-800',
      partner: 'bg-purple-100 text-purple-800'
    };
    return colors[status];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-8"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    
      <div className="min-h-screen bg-gray-50 p-8">
        {/* Header with Home Button */}
        <header className="bg-white border-b-2 border-gray-200 shadow-sm mb-8">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Eye className="text-white" size={20} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Revue des Prospects
                  </h1>
                  <p className="text-sm text-gray-600">
                    Validation humaine et gestion du consentement
                  </p>
                </div>
              </div>
              
              <a
                href="/backoffice"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Home size={16} />
                <span>Accueil Backoffice</span>
              </a>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            
            <div className="flex items-center space-x-4">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
              >
                <option value="all" className="bg-white text-gray-900">Tous statuts</option>
                <option value="new" className="bg-white text-gray-900">Nouveaux</option>
                <option value="qualified" className="bg-white text-gray-900">Qualifiés</option>
                <option value="rejected" className="bg-white text-gray-900">Rejetés</option>
                <option value="contacted" className="bg-white text-gray-900">Contactés</option>
                <option value="partner" className="bg-white text-gray-900">Partenaires</option>
              </select>
              
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
              >
                <option value="all" className="bg-white text-gray-900">Tous types</option>
                <option value="annuaire" className="bg-white text-gray-900">Annuaires</option>
                <option value="asso" className="bg-white text-gray-900">Associations</option>
                <option value="blog" className="bg-white text-gray-900">Blogs/Médias</option>
                <option value="fleet" className="bg-white text-gray-900">Flottes</option>
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-5 gap-4 mb-8">
            {['new', 'qualified', 'rejected', 'contacted', 'partner'].map(status => (
              <Card key={status} className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {prospects.filter(p => p.status === status).length}
                </div>
                <div className="text-sm text-gray-600 capitalize">{status}</div>
              </Card>
            ))}
          </div>

          {/* Prospects List */}
          <div className="space-y-4">
            {filteredProspects.map(prospect => (
              <Card key={prospect.id} hover className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {prospect.name}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(prospect.type)}`}>
                        {prospect.type}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(prospect.status)}`}>
                        {prospect.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center space-x-1">
                        <Globe size={14} />
                        <span>{prospect.domain}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar size={14} />
                        <span>{new Date(prospect.discoveredAt).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Tag size={14} />
                        <span>{prospect.source}</span>
                      </div>
                    </div>
                    
                    {prospect.notes && (
                      <p className="text-gray-700 text-sm mb-3">{prospect.notes}</p>
                    )}
                    
                    {prospect.contactPageUrl && (
                      <a
                        href={prospect.contactPageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        <Mail size={14} />
                        <span>Page contact</span>
                      </a>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {prospect.status === 'new' && (
                      <>
                        <button
                          onClick={() => updateProspectStatus(prospect.id, 'qualified')}
                          className="flex items-center space-x-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                        >
                          <CheckCircle size={16} />
                          <span>Qualifier</span>
                        </button>
                        
                        <button
                          onClick={() => updateProspectStatus(prospect.id, 'rejected')}
                          className="flex items-center space-x-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                        >
                          <XCircle size={16} />
                          <span>Rejeter</span>
                        </button>
                      </>
                    )}
                    
                    <button
                      onClick={() => window.open(`https://${prospect.domain}`, '_blank')}
                      className="flex items-center space-x-1 px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Eye size={16} />
                      <span>Visiter</span>
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Empty State */}
          {filteredProspects.length === 0 && !loading && (
            <Card className="text-center py-12">
              <User className="mx-auto mb-4 text-gray-600" size={48} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucun prospect à reviewer
              </h3>
              <p className="text-gray-600">
                Utilisez Partner Finder pour découvrir de nouveaux prospects
              </p>
            </Card>
          )}
        </div>

        {/* Consent Modal */}
        {showConsentModal && selectedProspect && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Enregistrer le Consentement
                </h2>
                <button
                  onClick={() => setShowConsentModal(false)}
                  className="text-gray-600 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organisation
                  </label>
                  <input
                    type="text"
                    value={selectedProspect.name}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email de contact *
                  </label>
                  <input
                    type="email"
                    value={consentData.email}
                    onChange={(e) => setConsentData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="contact@exemple.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Base légale
                  </label>
                  <select
                    value={consentData.lawfulBasis}
                    onChange={(e) => setConsentData(prev => ({ ...prev, lawfulBasis: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="legitimate_interest">Intérêt légitime (B2B)</option>
                    <option value="consent">Consentement explicite</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (optionnel)
                  </label>
                  <textarea
                    value={consentData.notes}
                    onChange={(e) => setConsentData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    placeholder="Contexte du contact, source de l'email..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Information RGPD</h4>
                  <p className="text-sm text-blue-800">
                    {consentData.lawfulBasis === 'legitimate_interest' 
                      ? 'Contact B2B basé sur l\'intérêt légitime. Droit d\'opposition garanti.'
                      : 'Consentement explicite requis avant tout contact.'
                    }
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowConsentModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleConsentSubmit}
                    disabled={!consentData.email}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    
  );
};

export default ProspectReview;