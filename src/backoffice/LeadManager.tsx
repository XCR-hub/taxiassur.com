import React, { useState, useEffect } from 'react';
import { Users, Eye, Phone, Mail, FileText, CheckCircle, XCircle, Euro, Calendar, Search, Filter, Download, Upload, Send, CreditCard as Edit, Trash2, Star, MessageSquare, Home } from 'lucide-react';
import AuthGuard from '../components/AuthGuard';
import { getLeads, updateLeadStatus, sendDevisEmail, sendContractEmail, getLeadStatusColor, getLeadStatusLabel, type Lead, type LeadStatus } from '../lib/leads';
import { formatDate } from '../lib/utils';
import Card from '../components/Card';

const LeadManager: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCity, setFilterCity] = useState<string>('all');

  const [statusUpdate, setStatusUpdate] = useState({
    newStatus: 'nouveau' as LeadStatus,
    primeRealisee: '',
    notes: ''
  });

  const [fileUpload, setFileUpload] = useState<{
    type: 'devis' | 'contract' | null;
    file: File | null;
  }>({ type: null, file: null });

  const [showReviewRequest, setShowReviewRequest] = useState(false);
  const [reviewRequestLead, setReviewRequestLead] = useState<Lead | null>(null);

  useEffect(() => {
    loadLeads();
  }, []);

  useEffect(() => {
    filterLeads();
  }, [leads, searchTerm, filterStatus, filterCity]);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const data = await getLeads();
      setLeads(data);
    } catch (error) {
      console.error('Failed to load leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterLeads = () => {
    let filtered = leads;

    if (searchTerm) {
      filtered = filtered.filter(lead =>
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone.includes(searchTerm)
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(lead => lead.leadStatus === filterStatus);
    }

    if (filterCity !== 'all') {
      filtered = filtered.filter(lead => lead.city === filterCity);
    }

    setFilteredLeads(filtered);
  };

  const handleStatusUpdate = async () => {
    if (!selectedLead) return;

    try {
      const additionalData: any = {
        notes: statusUpdate.notes
      };

      if (statusUpdate.newStatus === 'client' && statusUpdate.primeRealisee) {
        additionalData.primeRealisee = parseFloat(statusUpdate.primeRealisee);
      }

      const success = await updateLeadStatus(selectedLead.id, statusUpdate.newStatus, additionalData);
      
      if (success) {
        await loadLeads();
        setShowStatusModal(false);
        setSelectedLead(null);
        setStatusUpdate({ newStatus: 'nouveau', primeRealisee: '', notes: '' });
        alert('✅ Statut mis à jour avec succès !');
      } else {
        alert('❌ Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Status update error:', error);
      alert('❌ Erreur de connexion');
    }
  };

  const handleFileUpload = async (type: 'devis' | 'contract') => {
    if (!selectedLead || !fileUpload.file) return;

    try {
      let success = false;
      
      if (type === 'devis') {
        success = await sendDevisEmail(selectedLead.id, fileUpload.file);
      } else if (type === 'contract') {
        success = await sendContractEmail(selectedLead.id, fileUpload.file);
      }

      if (success) {
        await loadLeads();
        setFileUpload({ type: null, file: null });
        setShowDetailModal(false);
        alert(`✅ ${type === 'devis' ? 'Devis' : 'Contrat'} envoyé avec succès !`);
      } else {
        alert('❌ Erreur lors de l\'envoi');
      }
    } catch (error) {
      console.error('File upload error:', error);
      alert('❌ Erreur de connexion');
    }
  };

  const exportLeads = () => {
    const csvContent = [
      ['Date', 'Nom', 'Email', 'Téléphone', 'Ville', 'Statut', 'État Lead', 'Prime Réalisée', 'Notes'].join(','),
      ...filteredLeads.map(lead => [
        formatDate(lead.createdAt),
        lead.name,
        lead.email,
        lead.phone,
        lead.city,
        lead.status,
        getLeadStatusLabel(lead.leadStatus),
        lead.primeRealisee || '',
        (lead.notes || '').replace(/,/g, ';')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-taxiassur-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sendReviewRequest = async (lead: Lead) => {
    try {
      const response = await fetch('/api/lead-manager.php?action=request_review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId: lead.id,
          name: lead.name,
          email: lead.email,
          city: lead.city
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert('✅ Demande d\'avis envoyée avec succès !');
        setShowReviewRequest(false);
        setReviewRequestLead(null);
      } else {
        alert('❌ Erreur lors de l\'envoi de la demande d\'avis');
      }
    } catch (error) {
      console.error('Review request error:', error);
      alert('❌ Erreur de connexion');
    }
  };

  const getStats = () => {
    const stats = {
      total: leads.length,
      nouveau: leads.filter(l => l.leadStatus === 'nouveau').length,
      contacte: leads.filter(l => l.leadStatus === 'contacte').length,
      devis_envoye: leads.filter(l => l.leadStatus === 'devis_envoye').length,
      client: leads.filter(l => l.leadStatus === 'client').length,
      perdu: leads.filter(l => l.leadStatus === 'perdu').length,
      totalPrimes: leads.filter(l => l.primeRealisee).reduce((sum, l) => sum + (l.primeRealisee || 0), 0),
      conversionRate: leads.length > 0 ? ((leads.filter(l => l.leadStatus === 'client').length / leads.length) * 100).toFixed(1) : '0'
    };
    return stats;
  };

  const stats = getStats();
  const uniqueCities = Array.from(new Set(leads.map(lead => lead.city))).sort();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-8"></div>
            <div className="grid grid-cols-5 gap-6 mb-8">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 p-8">
        {/* Header with Home Button */}
        <header className="bg-white border-b-2 border-gray-200 shadow-sm mb-8">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                  <Users className="text-white" size={20} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Gestion des Leads
                  </h1>
                  <p className="text-sm text-gray-600">
                    Suivi complet de vos prospects taxi
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
              <button
                onClick={exportLeads}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                <Download size={16} />
                <span>Export CSV</span>
              </button>
              <button
                onClick={loadLeads}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                <Users size={16} />
                <span>Actualiser</span>
              </button>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
            <Card className="text-center bg-gradient-to-br from-blue-50 to-indigo-50">
              <Users className="mx-auto mb-2 text-blue-600" size={20} />
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </Card>

            <Card className="text-center bg-gradient-to-br from-yellow-50 to-amber-50">
              <Eye className="mx-auto mb-2 text-yellow-600" size={20} />
              <div className="text-2xl font-bold text-gray-900">{stats.nouveau}</div>
              <div className="text-sm text-gray-600">Nouveaux</div>
            </Card>

            <Card className="text-center bg-gradient-to-br from-orange-50 to-red-50">
              <Phone className="mx-auto mb-2 text-orange-600" size={20} />
              <div className="text-2xl font-bold text-gray-900">{stats.contacte}</div>
              <div className="text-sm text-gray-600">Contactés</div>
            </Card>

            <Card className="text-center bg-gradient-to-br from-purple-50 to-pink-50">
              <FileText className="mx-auto mb-2 text-purple-600" size={20} />
              <div className="text-2xl font-bold text-gray-900">{stats.devis_envoye}</div>
              <div className="text-sm text-gray-600">Devis Envoyés</div>
            </Card>

            <Card className="text-center bg-gradient-to-br from-green-50 to-emerald-50">
              <CheckCircle className="mx-auto mb-2 text-green-600" size={20} />
              <div className="text-2xl font-bold text-gray-900">{stats.client}</div>
              <div className="text-sm text-gray-600">Clients</div>
            </Card>

            <Card className="text-center bg-gradient-to-br from-gray-50 to-slate-50">
              <Euro className="mx-auto mb-2 text-gray-600" size={20} />
              <div className="text-2xl font-bold text-gray-900">{stats.totalPrimes.toLocaleString()}€</div>
              <div className="text-sm text-gray-600">CA Réalisé</div>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600" size={16} />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tous les statuts</option>
                <option value="nouveau">Nouveaux</option>
                <option value="contacte">Contactés</option>
                <option value="devis_envoye">Devis Envoyés</option>
                <option value="client">Clients</option>
                <option value="perdu">Perdus</option>
              </select>

              <select
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Toutes les villes</option>
                {uniqueCities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>

              <div className="text-sm text-gray-600 flex items-center">
                <Filter size={16} className="mr-2" />
                {filteredLeads.length} résultats
              </div>
            </div>
          </Card>

          {/* Leads Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Client</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Contact</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Ville</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Statut</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">État</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Prime</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map(lead => (
                    <tr key={lead.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-gray-900">{lead.name}</div>
                          {lead.immatriculation && (
                            <div className="text-xs text-gray-600">{lead.immatriculation}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="text-sm text-gray-900">{lead.email}</div>
                          <div className="text-sm text-gray-600">{lead.phone}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-gray-900">{lead.city}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          {lead.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLeadStatusColor(lead.leadStatus)}`}>
                          {getLeadStatusLabel(lead.leadStatus)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {lead.primeRealisee ? (
                          <span className="font-bold text-green-600">{lead.primeRealisee}€</span>
                        ) : (
                          <span className="text-gray-600">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">
                          {formatDate(lead.createdAt)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedLead(lead);
                              setShowDetailModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                            title="Voir détails"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedLead(lead);
                              setStatusUpdate({ 
                                newStatus: lead.leadStatus, 
                                primeRealisee: lead.primeRealisee?.toString() || '', 
                                notes: lead.notes || '' 
                              });
                              setShowStatusModal(true);
                            }}
                            className="text-green-600 hover:text-green-800"
                            title="Modifier statut"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setReviewRequestLead(lead);
                              setShowReviewRequest(true);
                            }}
                            className="text-yellow-600 hover:text-yellow-800"
                            title="Demander avis Google"
                          >
                            <Star size={16} />
                          </button>
                          <a
                            href={`tel:${lead.phone}`}
                            className="text-orange-600 hover:text-orange-800"
                            title="Appeler"
                            onClick={() => {
                              // Track call action
                              if (typeof gtag !== 'undefined') {
                                gtag('event', 'lead_call', {
                                  event_category: 'lead_management',
                                  event_label: lead.city
                                });
                              }
                            }}
                          >
                            <Phone size={16} />
                          </a>
                          <a
                            href={`mailto:${lead.email}?subject=Votre devis assurance taxi TaxiAssur&body=Bonjour ${lead.name},%0A%0AJe reviens vers vous concernant votre demande de devis d'assurance taxi.%0A%0ACordialement,%0AL'équipe TaxiAssur`}
                            className="text-purple-600 hover:text-purple-800"
                            title="Envoyer email"
                          >
                            <Mail size={16} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Empty State */}
          {filteredLeads.length === 0 && !loading && (
            <Card className="text-center py-12">
              <Users className="mx-auto mb-4 text-gray-600" size={48} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucun lead trouvé
              </h3>
              <p className="text-gray-600">
                {searchTerm || filterStatus !== 'all' || filterCity !== 'all'
                  ? 'Aucun lead ne correspond à vos critères'
                  : 'Aucun lead enregistré pour le moment'
                }
              </p>
            </Card>
          )}
        </div>

        {/* Detail Modal */}
        {showDetailModal && selectedLead && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  📋 Détails du Lead - {selectedLead.name}
                </h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-600 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Informations principales */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Nom</label>
                    <p className="text-gray-900 font-medium">{selectedLead.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <p className="text-gray-900">{selectedLead.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Téléphone</label>
                    <p className="text-gray-900">{selectedLead.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Ville</label>
                    <p className="text-gray-900">{selectedLead.city}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Statut</label>
                    <p className="text-gray-900">{selectedLead.status}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Immatriculation</label>
                    <p className="text-gray-900">{selectedLead.immatriculation || 'Non renseignée'}</p>
                  </div>
                </div>

                {/* État du lead */}
                <div>
                  <label className="text-sm font-medium text-gray-700">État du lead</label>
                  <div className="mt-1">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getLeadStatusColor(selectedLead.leadStatus)}`}>
                      {getLeadStatusLabel(selectedLead.leadStatus)}
                    </span>
                  </div>
                </div>

                {/* Prime réalisée */}
                {selectedLead.primeRealisee && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Prime réalisée</label>
                    <p className="text-2xl font-bold text-green-600">{selectedLead.primeRealisee}€</p>
                  </div>
                )}

                {/* Notes */}
                {selectedLead.notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Notes</label>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedLead.notes}</p>
                  </div>
                )}

                {/* Historique */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Créé le</label>
                    <p className="text-gray-900">{formatDate(selectedLead.createdAt)}</p>
                  </div>
                  {selectedLead.contactedAt && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Contacté le</label>
                      <p className="text-gray-900">{formatDate(selectedLead.contactedAt)}</p>
                    </div>
                  )}
                  {selectedLead.devisEnvoyeAt && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Devis envoyé le</label>
                      <p className="text-gray-900">{formatDate(selectedLead.devisEnvoyeAt)}</p>
                    </div>
                  )}
                  {selectedLead.clientAt && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Client depuis le</label>
                      <p className="text-gray-900">{formatDate(selectedLead.clientAt)}</p>
                    </div>
                  )}
                </div>

                {/* Actions sur documents */}
                <div className="border-t pt-6">
                  <h3 className="font-medium text-gray-900 mb-4">📄 Gestion des Documents</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Envoi de devis */}
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <h4 className="font-medium text-purple-900 mb-3 flex items-center">
                        <FileText className="mr-2" size={16} />
                        Envoyer un Devis
                      </h4>
                      
                      <div className="space-y-3">
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => setFileUpload({ type: 'devis', file: e.target.files?.[0] || null })}
                          className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200"
                        />
                        
                        <button
                          onClick={() => handleFileUpload('devis')}
                          disabled={!fileUpload.file || fileUpload.type !== 'devis'}
                          className="w-full flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                        >
                          <Send size={16} />
                          <span>Envoyer le Devis</span>
                        </button>
                      </div>
                      
                      <p className="text-xs text-purple-700 mt-2">
                        ✅ Passera automatiquement en "Devis Envoyé"
                      </p>
                    </div>

                    {/* Envoi de contrat */}
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h4 className="font-medium text-green-900 mb-3 flex items-center">
                        <CheckCircle className="mr-2" size={16} />
                        Envoyer un Contrat
                      </h4>
                      
                      <div className="space-y-3">
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => setFileUpload({ type: 'contract', file: e.target.files?.[0] || null })}
                          className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-100 file:text-green-700 hover:file:bg-green-200"
                        />
                        
                        <button
                          onClick={() => handleFileUpload('contract')}
                          disabled={!fileUpload.file || fileUpload.type !== 'contract'}
                          className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                        >
                          <CheckCircle size={16} />
                          <span>Envoyer le Contrat</span>
                        </button>
                      </div>
                      
                      <p className="text-xs text-green-700 mt-2">
                        ✅ Passera automatiquement en "Client"
                      </p>
                    </div>
                  </div>
                </div>

                {/* Demande d'avis Google */}
                <div className="border-t pt-6">
                  <h3 className="font-medium text-gray-900 mb-4">⭐ Avis Client Google</h3>
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <h4 className="font-medium text-yellow-900 mb-3 flex items-center">
                      <Star className="mr-2" size={16} />
                      Demander un Avis Google
                    </h4>
                    <p className="text-sm text-yellow-800 mb-4">
                      Envoyez un email automatique pour demander un avis Google à ce client.
                      L'avis sera publié automatiquement sur le site une fois reçu.
                    </p>
                    <button
                      onClick={() => {
                        setReviewRequestLead(selectedLead);
                        setShowReviewRequest(true);
                      }}
                      className="w-full flex items-center justify-center space-x-2 bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                    >
                      <Star size={16} />
                      <span>📧 Demander l'Avis Client</span>
                    </button>
                    <p className="text-xs text-yellow-700 mt-2">
                      ✅ Email automatique + Publication sur le site si avis positif
                    </p>
                  </div>
                </div>

                {/* Actions rapides */}
                <div className="border-t pt-6">
                  <h3 className="font-medium text-gray-900 mb-4">📞 Actions Rapides</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <a
                      href={`tel:${selectedLead.phone}`}
                      className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                      onClick={() => {
                        // Track call action
                        if (typeof gtag !== 'undefined') {
                          gtag('event', 'lead_call_detail', {
                            event_category: 'lead_management',
                            event_label: selectedLead.city,
                            lead_id: selectedLead.id
                          });
                        }
                      }}
                    >
                      <Phone size={16} />
                      <span>Appeler</span>
                    </a>
                    <a
                      href={`mailto:${selectedLead.email}?subject=Votre devis assurance taxi TaxiAssur&body=Bonjour ${selectedLead.name},%0A%0AJe reviens vers vous concernant votre demande de devis d'assurance taxi.%0A%0ACordialement,%0AL'équipe TaxiAssur`}
                      className="flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                      onClick={() => {
                        // Track email action
                        if (typeof gtag !== 'undefined') {
                          gtag('event', 'lead_email', {
                            event_category: 'lead_management',
                            event_label: selectedLead.city,
                            lead_id: selectedLead.id
                          });
                        }
                      }}
                    >
                      <Mail size={16} />
                      <span>Email</span>
                    </a>
                  </div>
                </div>
                
                {/* Bouton d'appel principal mis en évidence */}
                <div className="border-t pt-6">
                  <a
                    href={`tel:${selectedLead.phone}`}
                    className="w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                    onClick={() => {
                      // Track call action
                      if (typeof gtag !== 'undefined') {
                        gtag('event', 'lead_call_primary', {
                          event_category: 'lead_management',
                          event_label: selectedLead.city,
                          lead_id: selectedLead.id,
                          lead_status: selectedLead.leadStatus
                        });
                      }
                    }}
                  >
                    <Phone size={24} />
                    <span>📞 APPELER {selectedLead.name.toUpperCase()}</span>
                    <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                      {selectedLead.phone}
                    </span>
                  </a>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Review Request Modal */}
        {showReviewRequest && reviewRequestLead && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  ⭐ Demander un Avis Google
                </h2>
                <button
                  onClick={() => setShowReviewRequest(false)}
                  className="text-gray-600 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="font-medium text-blue-900 mb-2">📧 Email Automatique</h3>
                  <p className="text-sm text-blue-800">
                    Un email sera envoyé à <strong>{reviewRequestLead.name}</strong> pour demander 
                    un avis Google sur nos services.
                  </p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-900 mb-2">✅ Contenu de l'Email</h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• Remerciement personnalisé</li>
                    <li>• Lien direct vers Google Avis</li>
                    <li>• Instructions simples</li>
                    <li>• Signature TaxiAssur professionnelle</li>
                  </ul>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h4 className="font-medium text-yellow-900 mb-2">🤖 Publication Automatique</h4>
                  <p className="text-sm text-yellow-800">
                    Si l'avis est positif (4-5 étoiles), il sera automatiquement publié 
                    sur la section "Avis Clients" du site pour le SEO.
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowReviewRequest(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => sendReviewRequest(reviewRequestLead)}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <Star size={16} />
                    <span>Envoyer la Demande</span>
                  </button>
                </div>
              </div>
            </Card>
          </div>
        )}
        {/* Status Update Modal */}
        {showStatusModal && selectedLead && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  ✏️ Modifier le Statut
                </h2>
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="text-gray-600 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lead : {selectedLead.name}
                  </label>
                  <p className="text-sm text-gray-600">{selectedLead.email} • {selectedLead.city}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nouveau statut
                  </label>
                  <select
                    value={statusUpdate.newStatus}
                    onChange={(e) => setStatusUpdate(prev => ({ ...prev, newStatus: e.target.value as LeadStatus }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="nouveau">🆕 Nouveau</option>
                    <option value="contacte">📞 Contacté</option>
                    <option value="devis_envoye">📄 Devis Envoyé</option>
                    <option value="client">✅ Client</option>
                    <option value="perdu">❌ Perdu</option>
                  </select>
                </div>

                {statusUpdate.newStatus === 'client' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      💰 Prime réalisée (€)
                    </label>
                    <input
                      type="number"
                      value={statusUpdate.primeRealisee}
                      onChange={(e) => setStatusUpdate(prev => ({ ...prev, primeRealisee: e.target.value }))}
                      placeholder="1500"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📝 Notes (optionnel)
                  </label>
                  <textarea
                    value={statusUpdate.notes}
                    onChange={(e) => setStatusUpdate(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    placeholder="Commentaires sur ce lead..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowStatusModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleStatusUpdate}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Mettre à Jour
                  </button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AuthGuard>
  );
};

export default LeadManager;