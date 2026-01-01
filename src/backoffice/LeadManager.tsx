import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import {
  Users, Eye, Phone, Mail, FileText, CheckCircle, XCircle, Euro,
  Search, Filter, Download, Send, Edit as EditIcon, Star,
  TrendingUp, Clock, Home, Sparkles, Upload, MessageSquare
} from 'lucide-react';
import { getLeads, updateLeadStatus, sendDevisEmail, sendContractEmail, getLeadStatusColor, getLeadStatusLabel, type Lead, type LeadStatus } from '../lib/leads';
import { formatDate } from '../lib/utils';
import ElectronicSignature from '../components/ElectronicSignature';

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
      logger.error('Failed to load leads:', error);
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
      logger.error('Status update error:', error);
      alert('❌ Erreur de connexion');
    }
  };

  const handleSendEmail = async (type: 'devis' | 'contract') => {
    if (!selectedLead) return;

    try {
      const attachment = type === 'devis' ? attachments.devis : attachments.contract;

      const confirmMsg = type === 'devis'
        ? `Confirmer l'envoi du devis à ${selectedLead.email} ?${attachment ? '\n\nPièce jointe : ' + attachment.name : ''}\n\n✅ Le statut passera automatiquement à "Devis Envoyé"`
        : `Confirmer l'envoi du contrat à ${selectedLead.email} ?${attachment ? '\n\nPièce jointe : ' + attachment.name : ''}\n\n✅ Le statut passera automatiquement à "Client"`;

      if (!confirm(confirmMsg)) {
        return;
      }

      let success = false;
      if (type === 'devis') {
        success = await sendDevisEmail(selectedLead.id, attachment);
        if (success) {
          await updateLeadStatus(selectedLead.id, 'devis envoyé', {
            notes: `Devis envoyé le ${new Date().toLocaleDateString('fr-FR')}${attachment ? ' avec pièce jointe: ' + attachment.name : ''}`
          });
        }
      } else {
        success = await sendContractEmail(selectedLead.id, attachment);
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
        alert(`✅ ${type === 'devis' ? 'Devis' : 'Contrat'} envoyé avec succès !`);
      }
    } catch (error) {
      logger.error('Email sending error:', error);
      alert('❌ Erreur lors de l\'envoi');
    }
  };

  const exportLeads = () => {
    const csvContent = [
      ['Date', 'Nom', 'Email', 'Téléphone', 'Ville', 'Statut', 'Prime Réalisée', 'Notes'].join(','),
      ...filteredLeads.map(lead => [
        formatDate(lead.createdAt),
        lead.name,
        lead.email,
        lead.phone,
        lead.city,
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

  const getStats = () => {
    const stats = {
      total: leads.length,
      nouveau: leads.filter(l => l.leadStatus === 'nouveau').length,
      contacte: leads.filter(l => l.leadStatus === 'contacté').length,
      devis_envoye: leads.filter(l => l.leadStatus === 'devis envoyé').length,
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
      <div className="min-h-screen bg-gray-50">
        <div className="container-max py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container-max py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <Users className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-3xl font-black text-gray-900">Gestion des Leads</h1>
                <p className="text-gray-600">Suivi complet de vos prospects taxi</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={exportLeads}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-sm"
              >
                <Download size={18} />
                <span>Export CSV</span>
              </button>
              <button
                onClick={loadLeads}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors shadow-sm"
              >
                <TrendingUp size={18} />
                <span>Actualiser</span>
              </button>
              <a
                href="/backoffice"
                className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-2 px-4 rounded-lg transition-colors"
              >
                <Home size={18} />
                <span>Accueil</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="container-max py-6">
        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <Users className="mx-auto mb-2 text-blue-600" size={24} />
            <div className="text-3xl font-black text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <Clock className="mx-auto mb-2 text-orange-500" size={24} />
            <div className="text-3xl font-black text-gray-900">{stats.nouveau}</div>
            <div className="text-sm text-gray-600">Nouveaux</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <Phone className="mx-auto mb-2 text-yellow-500" size={24} />
            <div className="text-3xl font-black text-gray-900">{stats.contacte}</div>
            <div className="text-sm text-gray-600">Contactés</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <FileText className="mx-auto mb-2 text-blue-500" size={24} />
            <div className="text-3xl font-black text-gray-900">{stats.devis_envoye}</div>
            <div className="text-sm text-gray-600">Devis Envoyés</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <CheckCircle className="mx-auto mb-2 text-green-500" size={24} />
            <div className="text-3xl font-black text-gray-900">{stats.client}</div>
            <div className="text-sm text-gray-600">Clients</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <Euro className="mx-auto mb-2 text-purple-500" size={24} />
            <div className="text-3xl font-black text-gray-900">{stats.totalPrimes.toLocaleString()}€</div>
            <div className="text-sm text-gray-600">CA Réalisé</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
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
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
            >
              <option value="all">Toutes les villes</option>
              {uniqueCities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>

            <div className="text-sm text-gray-700 flex items-center">
              <Filter size={18} className="mr-2 text-gray-400" />
              <span className="font-bold">{filteredLeads.length}</span>
              <span className="ml-1">résultat{filteredLeads.length > 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        {/* Leads Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-4 px-4 font-bold text-gray-900">Client</th>
                  <th className="text-left py-4 px-4 font-bold text-gray-900">Contact</th>
                  <th className="text-left py-4 px-4 font-bold text-gray-900">Ville</th>
                  <th className="text-left py-4 px-4 font-bold text-gray-900">État</th>
                  <th className="text-left py-4 px-4 font-bold text-gray-900">Type</th>
                  <th className="text-left py-4 px-4 font-bold text-gray-900">Prime</th>
                  <th className="text-left py-4 px-4 font-bold text-gray-900">Date</th>
                  <th className="text-left py-4 px-4 font-bold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map(lead => (
                  <tr key={lead.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4">
                      <div>
                        <div className="font-bold text-gray-900">{lead.name}</div>
                        {lead.immatriculation && (
                          <div className="text-xs text-gray-500">{lead.immatriculation}</div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        <div className="text-sm text-gray-900">{lead.email}</div>
                        <div className="text-sm text-gray-600">{lead.phone}</div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-medium text-gray-900">{lead.city}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getLeadStatusColor(lead.leadStatus)}`}>
                        {getLeadStatusLabel(lead.leadStatus)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-bold uppercase">
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {lead.primeRealisee ? (
                        <span className="font-bold text-green-600">{lead.primeRealisee}€</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-600">
                        {formatDate(lead.createdAt)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedLead(lead);
                            setShowDetailModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="Voir détails"
                        >
                          <Eye size={18} />
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
                          className="text-green-600 hover:text-green-800 transition-colors"
                          title="Modifier statut"
                        >
                          <EditIcon size={18} />
                        </button>
                        <a
                          href={`tel:${lead.phone}`}
                          className="text-purple-600 hover:text-purple-800 transition-colors"
                          title="Appeler"
                        >
                          <Phone size={18} />
                        </a>
                        <a
                          href={`mailto:${lead.email}`}
                          className="text-orange-600 hover:text-orange-800 transition-colors"
                          title="Email"
                        >
                          <Mail size={18} />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredLeads.length === 0 && (
            <div className="py-12 text-center">
              <Users className="mx-auto text-gray-300 mb-4" size={64} />
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Aucun lead trouvé
              </h3>
              <p className="text-gray-600">
                {searchTerm || filterStatus !== 'all' || filterCity !== 'all'
                  ? 'Aucun lead ne correspond à vos critères'
                  : 'Aucun lead enregistré pour le moment'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-black text-white">
                Détails Lead - {selectedLead.name}
              </h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Info principales */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-gray-700">Nom</label>
                  <p className="text-gray-900 font-medium">{selectedLead.name}</p>
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700">Email</label>
                  <p className="text-gray-900">{selectedLead.email}</p>
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700">Téléphone</label>
                  <p className="text-gray-900">{selectedLead.phone}</p>
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700">Ville</label>
                  <p className="text-gray-900">{selectedLead.city}</p>
                </div>
              </div>

              {/* État & Prime */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-bold text-gray-700">État du lead</label>
                  <div className="mt-1">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${getLeadStatusColor(selectedLead.leadStatus)}`}>
                      {getLeadStatusLabel(selectedLead.leadStatus)}
                    </span>
                  </div>
                </div>
                {selectedLead.primeRealisee && (
                  <div className="text-right">
                    <label className="text-sm font-bold text-gray-700">Prime réalisée</label>
                    <p className="text-3xl font-black text-green-600">{selectedLead.primeRealisee}€</p>
                  </div>
                )}
              </div>

              {/* Gestion documents */}
              <div className="border-t pt-6">
                <h3 className="font-black text-gray-900 mb-4 flex items-center">
                  <FileText className="mr-2 text-blue-600" size={20} />
                  Gestion des Documents
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Devis */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                    <h4 className="font-bold text-blue-900 mb-3 flex items-center">
                      <FileText className="mr-2" size={18} />
                      Envoyer un Devis
                    </h4>
                    <div className="space-y-3">
                      <div className="bg-white p-3 rounded-lg">
                        <label className="block text-xs font-bold text-blue-900 mb-2">
                          Pièce jointe (optionnel)
                        </label>
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => setAttachments({ ...attachments, devis: e.target.files?.[0] || null })}
                          className="w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                        />
                      </div>
                      <button
                        onClick={() => handleSendEmail('devis')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center space-x-2"
                      >
                        <Send size={18} />
                        <span>Envoyer le Devis</span>
                      </button>
                    </div>
                  </div>

                  {/* Contrat */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                    <h4 className="font-bold text-green-900 mb-3 flex items-center">
                      <CheckCircle className="mr-2" size={18} />
                      Envoyer un Contrat
                    </h4>
                    <div className="space-y-3">
                      <div className="bg-white p-3 rounded-lg">
                        <label className="block text-xs font-bold text-green-900 mb-2">
                          Pièce jointe (optionnel)
                        </label>
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => setAttachments({ ...attachments, contract: e.target.files?.[0] || null })}
                          className="w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-green-100 file:text-green-700 hover:file:bg-green-200"
                        />
                      </div>
                      <button
                        onClick={() => handleSendEmail('contract')}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center space-x-2"
                      >
                        <CheckCircle size={18} />
                        <span>Envoyer le Contrat</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Signature électronique */}
              <div className="border-t pt-6">
                <ElectronicSignature
                  leadId={selectedLead.id}
                  leadName={selectedLead.name}
                  leadEmail={selectedLead.email}
                  leadPhone={selectedLead.phone}
                />
              </div>

              {/* Actions rapides */}
              <div className="border-t pt-6">
                <h3 className="font-black text-gray-900 mb-4">Actions Rapides</h3>
                <div className="grid grid-cols-2 gap-3">
                  <a
                    href={`tel:${selectedLead.phone}`}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center space-x-2"
                  >
                    <Phone size={18} />
                    <span>Appeler</span>
                  </a>
                  <a
                    href={`mailto:${selectedLead.email}`}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center space-x-2"
                  >
                    <Mail size={18} />
                    <span>Email</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Modal */}
      {showStatusModal && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <EditIcon size={20} />
                  Modifier le Statut
                </h2>
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="text-white hover:bg-white/20 rounded-full p-1"
                >
                  <XCircle size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-bold text-gray-900">{selectedLead.name}</h3>
                <p className="text-sm text-gray-600">{selectedLead.email} • {selectedLead.city}</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Nouveau statut
                </label>
                <select
                  value={statusUpdate.newStatus}
                  onChange={(e) => setStatusUpdate(prev => ({ ...prev, newStatus: e.target.value as LeadStatus }))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 bg-white font-bold"
                >
                  <option value="nouveau">Nouveau</option>
                  <option value="contacté">Contacté</option>
                  <option value="devis envoyé">Devis Envoyé</option>
                  <option value="client">Client</option>
                  <option value="perdu">Perdu</option>
                </select>
              </div>

              {statusUpdate.newStatus === 'client' && (
                <div className="bg-green-50 rounded-lg p-4">
                  <label className="block text-sm font-bold text-green-900 mb-2">
                    Prime réalisée (euros)
                  </label>
                  <input
                    type="number"
                    value={statusUpdate.primeRealisee}
                    onChange={(e) => setStatusUpdate(prev => ({ ...prev, primeRealisee: e.target.value }))}
                    placeholder="1500"
                    className="w-full px-4 py-3 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 text-gray-900 bg-white font-bold"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Notes (optionnel)
                </label>
                <textarea
                  value={statusUpdate.notes}
                  onChange={(e) => setStatusUpdate(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  placeholder="Commentaires..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-gray-900 bg-white"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-bold"
                >
                  Annuler
                </button>
                <button
                  onClick={handleStatusUpdate}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black rounded-lg"
                >
                  Mettre à Jour
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadManager;
