import React, { useState, useEffect } from 'react';
import { CreditCard, Search, User, Mail, Phone, Euro, Send, Loader2, Check, X, ExternalLink, Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

interface Lead {
  id: string;
  email: string;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  status: string;
  created_at: string;
  city: string | null;
}

interface Payment {
  id: string;
  reference: string;
  amount: number;
  status: string;
  created_at: string;
  lead_id: string;
  customer_name: string;
  description: string;
}

const LeadInvoicing: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredLeads(leads);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = leads.filter(lead =>
        lead.email?.toLowerCase().includes(term) ||
        lead.first_name?.toLowerCase().includes(term) ||
        lead.last_name?.toLowerCase().includes(term) ||
        lead.phone?.includes(term)
      );
      setFilteredLeads(filtered);
    }
  }, [searchTerm, leads]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Charger les leads
      const { data: leadsData, error: leadsError } = await supabase
        .from('crm_leads')
        .select('id, email, phone, first_name, last_name, status, created_at, city')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!leadsError && leadsData) {
        setLeads(leadsData);
        setFilteredLeads(leadsData);
      }

      // Charger les paiements récents
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('monetico_payments')
        .select('*')
        .not('lead_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!paymentsError && paymentsData) {
        setRecentPayments(paymentsData);
      }
    } catch (err) {
      console.error('Erreur chargement données:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setPaymentSuccess(false);
    setDescription(`Paiement assurance taxi - ${lead.first_name} ${lead.last_name}`);
  };

  const handleCreatePayment = async () => {
    if (!selectedLead || !amount || parseFloat(amount) <= 0) {
      toast.warning('Veuillez sélectionner un lead et entrer un montant valide');
      return;
    }

    setCreating(true);
    setPaymentSuccess(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.info('Session expirée');
        setCreating(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-monetico-payment', {
        body: {
          leadId: selectedLead.id,
          amount: parseFloat(amount),
          description: description || `Paiement ${selectedLead.first_name} ${selectedLead.last_name}`
        }
      });

      if (error) {
        console.error('Erreur création paiement:', error);
        toast.error('Erreur lors de la création du lien de paiement');
        setCreating(false);
        return;
      }

      if (data?.success && data?.htmlForm) {
        const newWindow = window.open('', '_blank', 'width=800,height=600');
        if (newWindow) {
          newWindow.document.write(data.htmlForm);
          newWindow.document.close();
        }

        setPaymentSuccess(true);
        setAmount('');
        setDescription('');
        setSelectedLead(null);
        loadData();
      }
    } catch (err) {
      console.error('Erreur:', err);
      toast.error('Erreur lors de la création du paiement');
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      success: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };

    const labels: Record<string, string> = {
      pending: 'En attente',
      paid: 'Payé',
      success: 'Payé',
      failed: 'Échoué',
      cancelled: 'Annulé'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <CreditCard className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Facturation Leads</h1>
              <p className="text-gray-600">Créez un lien de paiement pour vos leads existants</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sélection Lead et Création Paiement */}
          <div className="space-y-6">
            {/* Recherche Lead */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Search className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">Sélectionner un Lead</h2>
              </div>

              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Rechercher par nom, email ou téléphone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : filteredLeads.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Aucun lead trouvé</p>
                  </div>
                ) : (
                  filteredLeads.map((lead) => (
                    <button
                      key={lead.id}
                      onClick={() => handleSelectLead(lead)}
                      className={`w-full text-left p-3 rounded-lg border transition-all hover:shadow-md ${
                        selectedLead?.id === lead.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">
                            {lead.first_name} {lead.last_name}
                          </div>
                          <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                            <Mail className="w-3 h-3" />
                            {lead.email}
                          </div>
                          {lead.phone && (
                            <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                              <Phone className="w-3 h-3" />
                              {lead.phone}
                            </div>
                          )}
                        </div>
                        {selectedLead?.id === lead.id && (
                          <Check className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Formulaire Paiement */}
            {selectedLead && (
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <Euro className="w-5 h-5 text-green-600" />
                  <h2 className="text-xl font-bold text-gray-900">Créer le Paiement</h2>
                </div>

                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="font-semibold text-gray-900">
                      {selectedLead.first_name} {selectedLead.last_name}
                    </div>
                    <div className="text-sm text-gray-600">{selectedLead.email}</div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Montant (EUR) *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="100.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Paiement comptant assurance taxi..."
                    />
                  </div>

                  <button
                    onClick={handleCreatePayment}
                    disabled={creating || !amount}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Création en cours...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Créer le Lien de Paiement
                      </>
                    )}
                  </button>

                  {paymentSuccess && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-green-800">
                        <Check className="w-5 h-5" />
                        <span className="font-semibold">Lien de paiement créé !</span>
                      </div>
                      <p className="text-sm text-green-700 mt-1">
                        Une nouvelle fenêtre s'est ouverte avec le formulaire Monético.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Historique Paiements */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">Paiements Leads Récents</h2>
              </div>
              <button
                onClick={loadData}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Actualiser"
              >
                <Loader2 className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="space-y-3 max-h-[700px] overflow-y-auto">
              {recentPayments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Aucun paiement pour le moment</p>
                </div>
              ) : (
                recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-gray-600" />
                          <span className="font-semibold text-gray-900">
                            {payment.customer_name || 'Client'}
                          </span>
                        </div>
                        {payment.description && (
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {payment.description}
                          </p>
                        )}
                      </div>
                      {getStatusBadge(payment.status)}
                    </div>

                    <div className="flex items-center justify-between text-sm mt-3">
                      <span className="text-gray-600">Réf: {payment.reference}</span>
                      <span className="font-bold text-green-600 text-lg">
                        {payment.amount?.toFixed(2)} EUR
                      </span>
                    </div>

                    <div className="text-xs text-gray-500 mt-2">
                      {formatDate(payment.created_at)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadInvoicing;
