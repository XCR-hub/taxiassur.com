import React, { useState, useEffect } from 'react';
import { Users, Eye, Phone, Mail, FileText, CheckCircle, XCircle, Euro, Calendar, Search, Filter, Download, Upload, Send, CreditCard as Edit, Trash2, Star, MessageSquare, Home } from 'lucide-react';
import { getLeads, updateLeadStatus, sendDevisEmail, sendContractEmail, getLeadStatusColor, getLeadStatusLabel, type Lead, type LeadStatus } from '../lib/leads';
import { formatDate } from '../lib/utils';
import Card from '../components/Card';
import ElectronicSignature from '../components/ElectronicSignature';
import BackButton from './BackButton';

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

  const [attachments, setAttachments] = useState<{
    devis: File | null;
    contract: File | null;
  }>({ devis: null, contract: null });

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

  const handleSendEmail = async (type: 'devis' | 'contract') => {
    if (!selectedLead) return;

    try {
      let success = false;
      const attachment = type === 'devis' ? attachments.devis : attachments.contract;

      // Demander confirmation
      const confirmMsg = type === 'devis'
        ? `Confirmer l'envoi du devis à ${selectedLead.email} ?${attachment ? '\n\nPièce jointe : ' + attachment.name : ''}\n\n✅ Le statut passera automatiquement à "Devis Envoyé"`
        : `Confirmer l'envoi du contrat à ${selectedLead.email} ?${attachment ? '\n\nPièce jointe : ' + attachment.name : ''}\n\n✅ Le statut passera automatiquement à "Client"`;

      if (!confirm(confirmMsg)) {
        return;
      }

      if (type === 'devis') {
        success = await sendDevisEmail(selectedLead.id, attachment);

        // Auto-changement statut vers "Devis Envoyé"
        if (success) {
          await updateLeadStatus(selectedLead.id, 'devis_envoye', {
            notes: `Devis envoyé le ${new Date().toLocaleDateString('fr-FR')}${attachment ? ' avec pièce jointe: ' + attachment.name : ''}`
          });
        }
      } else if (type === 'contract') {
        success = await sendContractEmail(selectedLead.id, attachment);

        // Auto-changement statut vers "Client"
        if (success) {
          await updateLeadStatus(selectedLead.id, 'client', {
            notes: `Contrat envoyé le ${new Date().toLocaleDateString('fr-FR')}${attachment ? ' avec pièce jointe: ' + attachment.name : ''}`
          });
        }
      }

      if (success) {
        await loadLeads();
        setAttachments({ devis: null, contract: null });
        setShowDetailModal(false);
        const attachmentMsg = attachment ? '\n\nPièce jointe incluse : ' + attachment.name : '';
        const statusMsg = type === 'devis' ? '\n\n✅ Statut automatiquement changé en "Devis Envoyé"' : '\n\n✅ Statut automatiquement changé en "Client"';
        alert(`✅ ${type === 'devis' ? 'Devis' : 'Contrat'} envoyé avec succès !\n\nL'email a été envoyé à ${selectedLead.email}${attachmentMsg}${statusMsg}`);
      }
    } catch (error) {
      console.error('Email sending error:', error);
      alert('❌ Erreur de connexion au serveur');
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-700 rounded mb-8"></div>
            <div className="grid grid-cols-5 gap-6 mb-8">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-800 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
        <div className="max-w-7xl mx-auto">
          <BackButton />

          {/* Header with Home Button */}
          <header className="bg-slate-800 border-b-2 border-slate-700 shadow-xl mb-8 rounded-xl">
            <div className="px-6 py-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Users className="text-white" size={20} />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">
                      Gestion des Leads
                  </h1>
                  <p className="text-sm text-slate-300">
                    Suivi complet de vos prospects taxi
                  </p>
                </div>
              </div>

              <a
                href="/backoffice"
                className="bg-orange-600 hover:bg-orange-500 text-white font-medium px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 shadow-lg"
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
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-500 text-white font-medium py-2 px-4 rounded-lg transition-colors shadow-lg"
              >
                <Download size={16} />
                <span>Export CSV</span>
              </button>
              <button
                onClick={loadLeads}
                className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-500 text-white font-medium py-2 px-4 rounded-lg transition-colors shadow-lg"
              >
                <Users size={16} />
                <span>Actualiser</span>
              </button>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
            <Card className="text-center bg-slate-800 border border-slate-700">
              <Users className="mx-auto mb-2 text-orange-400" size={20} />
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-sm text-slate-300">Total</div>
            </Card>

            <Card className="text-center bg-slate-800 border border-slate-700">
              <Eye className="mx-auto mb-2 text-yellow-500" size={20} />
              <div className="text-2xl font-bold text-white">{stats.nouveau}</div>
              <div className="text-sm text-slate-300">Nouveaux</div>
            </Card>

            <Card className="text-center bg-slate-800 border border-slate-700">
              <Phone className="mx-auto mb-2 text-orange-400" size={20} />
              <div className="text-2xl font-bold text-white">{stats.contacte}</div>
              <div className="text-sm text-slate-300">Contactés</div>
            </Card>

            <Card className="text-center bg-slate-800 border border-slate-700">
              <FileText className="mx-auto mb-2 text-orange-400" size={20} />
              <div className="text-2xl font-bold text-white">{stats.devis_envoye}</div>
              <div className="text-sm text-slate-300">Devis Envoyés</div>
            </Card>

            <Card className="text-center bg-slate-800 border border-slate-700">
              <CheckCircle className="mx-auto mb-2 text-green-400" size={20} />
              <div className="text-2xl font-bold text-white">{stats.client}</div>
              <div className="text-sm text-slate-300">Clients</div>
            </Card>

            <Card className="text-center bg-slate-800 border border-slate-700">
              <Euro className="mx-auto mb-2 text-yellow-500" size={20} />
              <div className="text-2xl font-bold text-white">{stats.totalPrimes.toLocaleString()}€</div>
              <div className="text-sm text-slate-300">CA Réalisé</div>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-8 bg-slate-800 border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-white bg-slate-700 placeholder-slate-400"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-white bg-slate-700"
              >
                <option value="all">Tous les statuts</option>
                <option value="nouveau">Nouveaux</option>
                <option value="contacté">Contactés</option>
                <option value="devis envoyé">Devis Envoyés</option>
                <option value="client">Clients</option>
                <option value="perdu">Perdus</option>
              </select>

              <select
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
                className="px-3 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-white bg-slate-700"
              >
                <option value="all">Toutes les villes</option>
                {uniqueCities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>

              <div className="text-sm text-slate-300 flex items-center">
                <Filter size={16} className="mr-2" />
                {filteredLeads.length} résultats
              </div>
            </div>
          </Card>

          {/* Leads Table */}
          <Card className="bg-slate-800 border-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 font-medium text-white">Client</th>
                    <th className="text-left py-3 px-4 font-medium text-white">Contact</th>
                    <th className="text-left py-3 px-4 font-medium text-white">Ville</th>
                    <th className="text-left py-3 px-4 font-medium text-white">État Lead</th>
                    <th className="text-left py-3 px-4 font-medium text-white">Type Contrat</th>
                    <th className="text-left py-3 px-4 font-medium text-white">Prime</th>
                    <th className="text-left py-3 px-4 font-medium text-white">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map(lead => (
                    <tr key={lead.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-white">{lead.name}</div>
                          {lead.immatriculation && (
                            <div className="text-xs text-slate-400">{lead.immatriculation}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="text-sm text-white">{lead.email}</div>
                          <div className="text-sm text-slate-400">{lead.phone}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-white">{lead.city}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLeadStatusColor(lead.leadStatus)}`}>
                          {getLeadStatusLabel(lead.leadStatus)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-orange-600 text-white rounded-full text-xs font-medium">
                          {lead.status.toUpperCase()}
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
                            className="text-orange-600 hover:text-orange-800"
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
                            className="text-orange-600 hover:text-orange-800"
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
              <p className="text-gray-600 mb-4">
                {searchTerm || filterStatus !== 'all' || filterCity !== 'all'
                  ? 'Aucun lead ne correspond à vos critères'
                  : 'Aucun lead enregistré pour le moment'
                }
              </p>
              {leads.length === 0 && (
                <div className="mt-4 text-sm text-gray-600">
                  <p>ℹ️ Les leads apparaîtront ici dès qu'un visiteur remplira le formulaire sur le site.</p>
                  <p className="mt-2">En attente de la première soumission...</p>
                </div>
              )}
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
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <h4 className="font-medium text-orange-900 mb-3 flex items-center">
                        <FileText className="mr-2" size={16} />
                        Envoyer un Devis
                      </h4>

                      <p className="text-sm text-orange-800 mb-3">
                        Un email professionnel avec votre offre de devis sera envoyé automatiquement au client.
                      </p>

                      <div className="space-y-3">
                        <div className="bg-white p-3 rounded-lg border border-orange-200">
                          <label className="block text-xs font-medium text-orange-900 mb-2">
                            📎 Pièce jointe (optionnel)
                          </label>
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={(e) => setAttachments({ ...attachments, devis: e.target.files?.[0] || null })}
                            className="w-full text-xs text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200"
                          />
                          {attachments.devis && (
                            <p className="text-xs text-orange-700 mt-1 flex items-center">
                              ✅ {attachments.devis.name}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => handleSendEmail('devis')}
                          className="w-full flex items-center justify-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 px-4 rounded-lg transition-colors shadow-md hover:shadow-lg"
                        >
                          <Send size={18} />
                          <span>Envoyer le Devis</span>
                        </button>
                      </div>

                      <p className="text-xs text-orange-700 mt-3 text-center">
                        ✅ Passera automatiquement en "Devis Envoyé"
                      </p>
                    </div>

                    {/* Envoi de contrat */}
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h4 className="font-medium text-green-900 mb-3 flex items-center">
                        <CheckCircle className="mr-2" size={16} />
                        Envoyer un Contrat
                      </h4>

                      <p className="text-sm text-green-800 mb-3">
                        Un email de confirmation de contrat sera envoyé automatiquement au client.
                      </p>

                      <div className="space-y-3">
                        <div className="bg-white p-3 rounded-lg border border-green-200">
                          <label className="block text-xs font-medium text-green-900 mb-2">
                            📎 Pièce jointe (optionnel)
                          </label>
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={(e) => setAttachments({ ...attachments, contract: e.target.files?.[0] || null })}
                            className="w-full text-xs text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-green-100 file:text-green-700 hover:file:bg-green-200"
                          />
                          {attachments.contract && (
                            <p className="text-xs text-green-700 mt-1 flex items-center">
                              ✅ {attachments.contract.name}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => handleSendEmail('contract')}
                          className="w-full flex items-center justify-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors shadow-md hover:shadow-lg"
                        >
                          <CheckCircle size={18} />
                          <span>Envoyer le Contrat</span>
                        </button>
                      </div>

                      <p className="text-xs text-green-700 mt-3 text-center">
                        ✅ Passera automatiquement en "Client"
                      </p>
                    </div>
                  </div>
                </div>

                {/* Signature Électronique */}
                <div className="border-t pt-6">
                  <ElectronicSignature
                    leadId={selectedLead.id}
                    leadName={selectedLead.name}
                    leadEmail={selectedLead.email}
                    leadPhone={selectedLead.phone}
                  />
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
                      className="flex items-center justify-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
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
                      className="flex items-center justify-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
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
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <h3 className="font-medium text-orange-900 mb-2">📧 Email Automatique</h3>
                  <p className="text-sm text-orange-800">
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
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 overflow-hidden">
              {/* Header avec style Actualités */}
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-black flex items-center gap-2">
                    <Edit size={20} />
                    Modifier le Statut
                  </h2>
                  <button
                    onClick={() => setShowStatusModal(false)}
                    className="text-black hover:bg-black/10 rounded-full p-1 transition-colors"
                  >
                    <XCircle size={24} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Info Lead */}
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-1">Lead : {selectedLead.name}</h3>
                  <p className="text-sm text-gray-600">{selectedLead.email} • {selectedLead.city}</p>
                </div>

                {/* Sélection du statut */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Nouveau statut
                  </label>
                  <select
                    value={statusUpdate.newStatus}
                    onChange={(e) => setStatusUpdate(prev => ({ ...prev, newStatus: e.target.value as LeadStatus }))}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-gray-900 bg-white font-medium transition-all"
                  >
                    <option value="nouveau">🆕 Nouveau</option>
                    <option value="contacté">📞 Contacté</option>
                    <option value="devis envoyé">📄 Devis Envoyé</option>
                    <option value="client">✅ Client</option>
                    <option value="perdu">❌ Perdu</option>
                  </select>
                </div>

                {/* Prime réalisée (si client) */}
                {statusUpdate.newStatus === 'client' && (
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <label className="block text-sm font-semibold text-green-900 mb-2">
                      💰 Chiffre d'affaires réalisé (€)
                    </label>
                    <input
                      type="number"
                      value={statusUpdate.primeRealisee}
                      onChange={(e) => setStatusUpdate(prev => ({ ...prev, primeRealisee: e.target.value }))}
                      placeholder="1500"
                      className="w-full px-4 py-3 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 bg-white placeholder-gray-400 font-medium"
                    />
                    <p className="text-xs text-green-700 mt-2">Montant de la prime annuelle</p>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    📝 Notes (optionnel)
                  </label>
                  <textarea
                    value={statusUpdate.notes}
                    onChange={(e) => setStatusUpdate(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    placeholder="Commentaires sur ce lead..."
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-gray-900 bg-white placeholder-gray-400"
                  />
                </div>

                {/* Boutons d'action */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowStatusModal(false)}
                    className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleStatusUpdate}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-bold rounded-lg transition-all shadow-md hover:shadow-lg"
                  >
                    Mettre à Jour
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

export default LeadManager;