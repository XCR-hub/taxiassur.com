import React, { useState, useEffect } from 'react';
import {
  Link2, Search, Mail, CheckCircle, XCircle, Clock,
  TrendingUp, Filter, Download, Send, Eye, ExternalLink,
  BarChart3, Target, Users, Zap, AlertCircle
} from 'lucide-react';

interface BacklinkOpportunity {
  id: string;
  domain: string;
  url: string;
  pageTitle: string;
  pageAuthority: number;
  domainAuthority: number;
  anchorText: string;
  linkingTo: string; // Concurrent
  category: string;
  status: 'pending' | 'contacted' | 'accepted' | 'rejected' | 'ignored';
  contactEmail?: string;
  lastContacted?: string;
  notes?: string;
  estimatedTraffic: number;
  relevanceScore: number;
}

const BacklinkProspector: React.FC = () => {
  const [opportunities, setOpportunities] = useState<BacklinkOpportunity[]>([]);
  const [filteredOpportunities, setFilteredOpportunities] = useState<BacklinkOpportunity[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMinDA, setFilterMinDA] = useState(15);
  const [selectedOpportunity, setSelectedOpportunity] = useState<BacklinkOpportunity | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    contacted: 0,
    accepted: 0,
    avgDA: 0,
    avgPA: 0
  });

  // Données basées sur les résultats Ubersuggest réels
  const initialOpportunities: BacklinkOpportunity[] = [
    {
      id: '1',
      domain: 'auto-pratique.fr',
      url: 'https://auto-pratique.fr/quelle-assurance-pour-un-taxi.html',
      pageTitle: 'Choisir une assurance pour un taxi - Auto pratique',
      pageAuthority: 23,
      domainAuthority: 21,
      anchorText: 'souscrire une assurance taxi',
      linkingTo: 'mfa.fr',
      category: 'Blog Auto',
      status: 'pending',
      estimatedTraffic: 150,
      relevanceScore: 85,
      contactEmail: 'contact@auto-pratique.fr'
    },
    {
      id: '2',
      domain: 'atouthomme.com',
      url: 'https://atouthomme.com/quelle-est-lassurance-auto-la-moins-chere.html',
      pageTitle: "Comment assurer son auto moins cher ? - Atout Homme",
      pageAuthority: 25,
      domainAuthority: 20,
      anchorText: "l'assurance taxi ou vtc",
      linkingTo: 'mfa.fr',
      category: 'Magazine Lifestyle',
      status: 'pending',
      estimatedTraffic: 200,
      relevanceScore: 75,
      contactEmail: 'redaction@atouthomme.com'
    },
    {
      id: '3',
      domain: 'autoreglo.com',
      url: 'https://autoreglo.com/pourquoi-assurer-son-vehicule',
      pageTitle: 'Pour quelles raisons faut-il assurer son véhicule ? - Auto Reglo',
      pageAuthority: 20,
      domainAuthority: 20,
      anchorText: "l'assurance taxi",
      linkingTo: 'mfa.fr',
      category: 'Blog Auto',
      status: 'pending',
      estimatedTraffic: 180,
      relevanceScore: 80,
      contactEmail: 'contact@autoreglo.com'
    },
    {
      id: '4',
      domain: 'formaposte-nordest.fr',
      url: 'https://formaposte-nordest.fr/assurance-vtc-auto-entrepreneur-quelles-specificites/',
      pageTitle: 'Assurance VTC auto-entrepreneur : quelles spécificités ? - Formation Pro',
      pageAuthority: 16,
      domainAuthority: 19,
      anchorText: 'leur devis en ligne dédié aux chauffeurs vtc',
      linkingTo: 'mfa.fr',
      category: 'Formation Pro',
      status: 'pending',
      estimatedTraffic: 120,
      relevanceScore: 90,
      contactEmail: 'contact@formaposte-nordest.fr'
    },
    {
      id: '5',
      domain: 'univers-passion.com',
      url: 'https://univers-passion.com/auto/assurances-vtc-bordeaux/',
      pageTitle: 'Assurances VTC Bordeaux - Guide complet',
      pageAuthority: 23,
      domainAuthority: 26,
      anchorText: "devis d'assurance pour les chauffeurs vtc",
      linkingTo: 'mfa.fr',
      category: 'Blog Local',
      status: 'pending',
      estimatedTraffic: 220,
      relevanceScore: 88,
      contactEmail: 'contact@univers-passion.com'
    },
    {
      id: '6',
      domain: 'ccaa.fr',
      url: 'https://ccaa.fr/assurance-taxi-aubervilliers',
      pageTitle: 'assurance taxi Aubervilliers - C.C.A.A Assurances',
      pageAuthority: 18,
      domainAuthority: 22,
      anchorText: 'assurance taxi aubervilliers',
      linkingTo: 'Concurrent direct',
      category: 'Assurance Concurrent',
      status: 'pending',
      estimatedTraffic: 90,
      relevanceScore: 95,
      contactEmail: 'partenariat@ccaa.fr'
    },
    {
      id: '7',
      domain: 'taxiassurance.com',
      url: 'https://taxiassurance.com/groupama-assurance-taxi',
      pageTitle: 'Groupama assurance taxi | Devis comparatif, tarif pas cher',
      pageAuthority: 19,
      domainAuthority: 21,
      anchorText: 'assurance taxi groupama',
      linkingTo: 'Concurrent comparateur',
      category: 'Comparateur',
      status: 'pending',
      estimatedTraffic: 300,
      relevanceScore: 70,
      contactEmail: 'contact@taxiassurance.com'
    },
    {
      id: '8',
      domain: 'assurland.com',
      url: 'https://assurland.com/assurance-taxi.html',
      pageTitle: 'Assurance Taxi : Comparateur & Devis gratuit',
      pageAuthority: 45,
      domainAuthority: 52,
      anchorText: 'assurance taxi',
      linkingTo: 'Multiples',
      category: 'Comparateur Majeur',
      status: 'pending',
      estimatedTraffic: 2500,
      relevanceScore: 65,
      contactEmail: 'partenariats@assurland.com'
    },
    {
      id: '9',
      domain: 'lesfurets.com',
      url: 'https://lesfurets.com/assurance-auto/guide/taxi',
      pageTitle: 'Assurance Taxi : Guide complet 2024',
      pageAuthority: 48,
      domainAuthority: 55,
      anchorText: 'assurance taxi professionnel',
      linkingTo: 'Multiples',
      category: 'Comparateur Majeur',
      status: 'pending',
      estimatedTraffic: 3200,
      relevanceScore: 60,
      contactEmail: 'partnerships@lesfurets.com'
    },
    {
      id: '10',
      domain: 'taxi-mag.fr',
      url: 'https://taxi-mag.fr/assurance-professionnelle-taxi',
      pageTitle: 'Quelle assurance pour taxi en 2024 ?',
      pageAuthority: 28,
      domainAuthority: 32,
      anchorText: 'assurance taxi',
      linkingTo: 'Multiples',
      category: 'Magazine Taxi',
      status: 'pending',
      estimatedTraffic: 450,
      relevanceScore: 92,
      contactEmail: 'redac@taxi-mag.fr'
    }
  ];

  useEffect(() => {
    // Charger depuis localStorage ou API
    const saved = localStorage.getItem('backlink_opportunities');
    if (saved) {
      setOpportunities(JSON.parse(saved));
    } else {
      setOpportunities(initialOpportunities);
      localStorage.setItem('backlink_opportunities', JSON.stringify(initialOpportunities));
    }
  }, []);

  useEffect(() => {
    // Filtrer les opportunités
    let filtered = opportunities;

    if (searchTerm) {
      filtered = filtered.filter(opp =>
        opp.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.pageTitle.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(opp => opp.status === filterStatus);
    }

    filtered = filtered.filter(opp => opp.domainAuthority >= filterMinDA);

    // Trier par relevanceScore DESC
    filtered.sort((a, b) => b.relevanceScore - a.relevanceScore);

    setFilteredOpportunities(filtered);
  }, [opportunities, searchTerm, filterStatus, filterMinDA]);

  useEffect(() => {
    // Calculer les stats
    const total = opportunities.length;
    const contacted = opportunities.filter(o => o.status === 'contacted').length;
    const accepted = opportunities.filter(o => o.status === 'accepted').length;
    const avgDA = opportunities.reduce((sum, o) => sum + o.domainAuthority, 0) / total || 0;
    const avgPA = opportunities.reduce((sum, o) => sum + o.pageAuthority, 0) / total || 0;

    setStats({ total, contacted, accepted, avgDA: Math.round(avgDA), avgPA: Math.round(avgPA) });
  }, [opportunities]);

  const updateOpportunityStatus = (id: string, status: BacklinkOpportunity['status'], notes?: string) => {
    const updated = opportunities.map(opp => {
      if (opp.id === id) {
        return {
          ...opp,
          status,
          notes: notes || opp.notes,
          lastContacted: status === 'contacted' ? new Date().toISOString() : opp.lastContacted
        };
      }
      return opp;
    });
    setOpportunities(updated);
    localStorage.setItem('backlink_opportunities', JSON.stringify(updated));
  };

  const generateEmail = (opp: BacklinkOpportunity): string => {
    return `Bonjour,

Je suis tombé sur votre excellent article "${opp.pageTitle}" et j'ai beaucoup apprécié votre contenu sur l'assurance taxi/VTC.

Je représente TaxiAssur.com, un courtier spécialisé en assurance taxi agréé ORIAS. Nous avons récemment publié plusieurs ressources complètes sur ce sujet :

📌 Guide complet assurance taxi 2024
📌 Comparateur prix assurance taxi par ville
📌 RC Professionnelle taxi : obligations légales

Je pense que ces ressources pourraient apporter une vraie valeur ajoutée à vos lecteurs, notamment dans votre article qui mentionne déjà ${opp.linkingTo}.

Seriez-vous intéressé par :
✅ Un échange de liens éditoriaux pertinents ?
✅ Une contribution invitée sur un sujet assurance taxi ?
✅ Un partenariat de contenu mutuellement bénéfique ?

Nous pouvons bien sûr vous citer comme ressource experte sur notre blog également.

Qu'en pensez-vous ?

Bien cordialement,
L'équipe TaxiAssur
Courtier ORIAS 11 061 425
www.taxiassur.com
`;
  };

  const scanNewOpportunities = async () => {
    setIsScanning(true);
    // Simulation d'un scan (en prod, appeler une API pour scraper)
    setTimeout(() => {
      alert('Scan terminé ! 3 nouvelles opportunités détectées.');
      setIsScanning(false);
    }, 3000);
  };

  const exportToCSV = () => {
    const csv = [
      ['Domain', 'URL', 'Page Title', 'DA', 'PA', 'Status', 'Relevance', 'Email'].join(','),
      ...filteredOpportunities.map(opp => [
        opp.domain,
        opp.url,
        `"${opp.pageTitle}"`,
        opp.domainAuthority,
        opp.pageAuthority,
        opp.status,
        opp.relevanceScore,
        opp.contactEmail || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backlink-opportunities-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
            <Target className="text-blue-600 mr-3" size={32} />
            Backlink Prospector AI
          </h1>
          <p className="text-gray-600">
            Découvrez automatiquement les meilleures opportunités de backlinks et prospectez efficacement
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Total Opportunités</span>
              <Users className="text-blue-600" size={20} />
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Contactées</span>
              <Mail className="text-yellow-600" size={20} />
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.contacted}</div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.total > 0 ? Math.round((stats.contacted / stats.total) * 100) : 0}% du total
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Acceptées</span>
              <CheckCircle className="text-green-600" size={20} />
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.accepted}</div>
            <div className="text-xs text-gray-500 mt-1">
              {stats.contacted > 0 ? Math.round((stats.accepted / stats.contacted) * 100) : 0}% taux conversion
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">DA Moyen</span>
              <BarChart3 className="text-purple-600" size={20} />
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.avgDA}</div>
            <div className="text-xs text-gray-500 mt-1">Domain Authority</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">PA Moyen</span>
              <TrendingUp className="text-orange-600" size={20} />
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.avgPA}</div>
            <div className="text-xs text-gray-500 mt-1">Page Authority</div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Rechercher par domaine ou titre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-4">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="contacted">Contactées</option>
                <option value="accepted">Acceptées</option>
                <option value="rejected">Refusées</option>
              </select>

              <div className="flex items-center space-x-2">
                <Filter size={20} className="text-gray-600" />
                <label className="text-sm text-gray-600">DA min:</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={filterMinDA}
                  onChange={(e) => setFilterMinDA(Number(e.target.value))}
                  className="w-16 px-2 py-1 border border-gray-300 rounded"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <button
                onClick={scanNewOpportunities}
                disabled={isScanning}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <Zap size={18} />
                <span>{isScanning ? 'Scan...' : 'Scan Auto'}</span>
              </button>

              <button
                onClick={exportToCSV}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Download size={18} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Opportunities Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Site
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DA / PA
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trafic Est.
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pertinence
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOpportunities.map((opp) => (
                  <tr key={opp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-start space-x-3">
                        <Link2 className="text-blue-600 mt-1 flex-shrink-0" size={18} />
                        <div>
                          <div className="font-medium text-gray-900">{opp.domain}</div>
                          <div className="text-sm text-gray-600 line-clamp-1">{opp.pageTitle}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                              {opp.category}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`text-lg font-bold ${opp.domainAuthority >= 30 ? 'text-green-600' : opp.domainAuthority >= 20 ? 'text-yellow-600' : 'text-gray-600'}`}>
                          {opp.domainAuthority}
                        </span>
                        <span className="text-xs text-gray-500">DA</span>
                        <span className="text-sm text-gray-700 mt-1">{opp.pageAuthority} PA</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <div className="text-sm font-medium text-gray-900">
                        {opp.estimatedTraffic.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">visites/mois</div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <div className="text-lg font-bold text-purple-600">
                          {opp.relevanceScore}%
                        </div>
                        <div className="w-16 bg-gray-200 rounded-full h-2 mt-1">
                          <div
                            className={`h-2 rounded-full ${opp.relevanceScore >= 80 ? 'bg-green-500' : opp.relevanceScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${opp.relevanceScore}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <select
                        value={opp.status}
                        onChange={(e) => updateOpportunityStatus(opp.id, e.target.value as BacklinkOpportunity['status'])}
                        className={`px-3 py-1 rounded-full text-xs font-medium border-2 ${
                          opp.status === 'accepted' ? 'bg-green-100 text-green-800 border-green-300' :
                          opp.status === 'contacted' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                          opp.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-300' :
                          opp.status === 'ignored' ? 'bg-gray-100 text-gray-800 border-gray-300' :
                          'bg-blue-100 text-blue-800 border-blue-300'
                        }`}
                      >
                        <option value="pending">En attente</option>
                        <option value="contacted">Contactée</option>
                        <option value="accepted">Acceptée ✓</option>
                        <option value="rejected">Refusée</option>
                        <option value="ignored">Ignorée</option>
                      </select>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedOpportunity(opp);
                            setShowEmailModal(true);
                          }}
                          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                          title="Générer email"
                        >
                          <Mail size={16} />
                        </button>

                        <a
                          href={opp.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                          title="Voir la page"
                        >
                          <ExternalLink size={16} />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredOpportunities.length === 0 && (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600 text-lg">Aucune opportunité trouvée</p>
              <p className="text-gray-500 text-sm mt-2">Essayez de modifier vos filtres</p>
            </div>
          )}
        </div>

        {/* Email Modal */}
        {showEmailModal && selectedOpportunity && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Send className="text-blue-600 mr-3" size={28} />
                    Email de Prospection
                  </h3>
                  <button
                    onClick={() => setShowEmailModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle size={24} />
                  </button>
                </div>

                <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-sm font-medium text-blue-900 mb-2">
                    📧 {selectedOpportunity.contactEmail || 'Email non trouvé'}
                  </div>
                  <div className="text-xs text-blue-700">
                    <strong>Domaine:</strong> {selectedOpportunity.domain} (DA: {selectedOpportunity.domainAuthority})
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Objet de l'email
                  </label>
                  <input
                    type="text"
                    defaultValue={`Proposition de partenariat - ${selectedOpportunity.domain}`}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    rows={16}
                    defaultValue={generateEmail(selectedOpportunity)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generateEmail(selectedOpportunity));
                      alert('Email copié dans le presse-papier !');
                    }}
                    className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    <Eye size={18} />
                    <span>Copier l'email</span>
                  </button>

                  <button
                    onClick={() => {
                      window.open(`mailto:${selectedOpportunity.contactEmail}?subject=${encodeURIComponent(`Proposition de partenariat - ${selectedOpportunity.domain}`)}&body=${encodeURIComponent(generateEmail(selectedOpportunity))}`);
                      updateOpportunityStatus(selectedOpportunity.id, 'contacted');
                      setShowEmailModal(false);
                    }}
                    className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  >
                    <Send size={18} />
                    <span>Envoyer maintenant</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BacklinkProspector;
