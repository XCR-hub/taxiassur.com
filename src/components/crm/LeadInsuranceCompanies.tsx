import { useState, useEffect } from 'react';
import { Building2, CheckCircle, Circle, FileText, Phone, Mail, Clock, Plus, X, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Badge } from '../Badge';
import { Modal, ModalFooter } from '../Modal';

interface InsuranceCompany {
  id: string;
  name: string;
  code: string;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_hours: string | null;
  website: string | null;
  is_active: boolean;
}

interface LeadCompanyStatus {
  id: string;
  lead_id: string;
  company_id: string;
  status: 'contacted' | 'quoted' | 'accepted' | 'rejected' | 'pending';
  quote_amount: number | null;
  quote_sent_at: string | null;
  response_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  company?: InsuranceCompany;
}

interface LeadInsuranceCompaniesProps {
  leadId: string;
  onCompanySelected?: (companyId: string) => void;
}

export function LeadInsuranceCompanies({ leadId, onCompanySelected }: LeadInsuranceCompaniesProps) {
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [leadCompanies, setLeadCompanies] = useState<LeadCompanyStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    status: 'contacted' as const,
    quote_amount: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, [leadId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Charger toutes les compagnies actives
      const { data: allCompanies, error: companiesError } = await supabase
        .from('insurance_companies')
        .select('*')
        .eq('is_active', true)
        .order('priority_order', { ascending: true });

      if (companiesError) throw companiesError;
      setCompanies(allCompanies || []);

      // Charger les compagnies déjà assignées à ce lead
      const { data: assignedCompanies, error: assignedError } = await supabase
        .from('crm_lead_companies')
        .select(`
          *,
          company:insurance_companies(*)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (assignedError) throw assignedError;
      setLeadCompanies(assignedCompanies || []);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCompany = async () => {
    if (!selectedCompanyId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('crm_lead_companies')
        .insert([{
          lead_id: leadId,
          company_id: selectedCompanyId,
          status: form.status,
          quote_amount: form.quote_amount ? parseFloat(form.quote_amount) : null,
          notes: form.notes || null,
          quote_sent_at: form.status === 'quoted' ? new Date().toISOString() : null
        }]);

      if (error) throw error;

      setShowAddModal(false);
      setSelectedCompanyId(null);
      setForm({ status: 'contacted', quote_amount: '', notes: '' });
      await loadData();

      if (onCompanySelected) {
        onCompanySelected(selectedCompanyId);
      }
    } catch (error) {
      console.error('Erreur ajout compagnie:', error);
      alert('Erreur lors de l\'ajout de la compagnie');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'quoted' && !leadCompanies.find(lc => lc.id === id)?.quote_sent_at) {
        updateData.quote_sent_at = new Date().toISOString();
      }

      if (newStatus === 'accepted' || newStatus === 'rejected') {
        updateData.response_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('crm_lead_companies')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Erreur mise à jour statut:', error);
    }
  };

  const handleRemoveCompany = async (id: string) => {
    if (!confirm('Retirer cette compagnie de la liste ?')) return;

    try {
      const { error } = await supabase
        .from('crm_lead_companies')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      contacted: { variant: 'default' as const, label: 'Contactée' },
      quoted: { variant: 'info' as const, label: 'Devis envoyé' },
      accepted: { variant: 'success' as const, label: 'Accepté' },
      rejected: { variant: 'error' as const, label: 'Refusé' },
      pending: { variant: 'warning' as const, label: 'En attente' }
    };
    const cfg = config[status as keyof typeof config] || config.pending;
    return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
  };

  const availableCompanies = companies.filter(
    c => !leadCompanies.some(lc => lc.company_id === c.id)
  );

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-800 rounded w-1/3"></div>
          <div className="h-20 bg-gray-800 rounded"></div>
          <div className="h-20 bg-gray-800 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-500" />
            Compagnies d'Assurance
          </h3>
          <p className="text-sm text-gray-400">
            {leadCompanies.length} compagnie{leadCompanies.length > 1 ? 's' : ''} contactée{leadCompanies.length > 1 ? 's' : ''}
          </p>
        </div>
        {availableCompanies.length > 0 && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Ajouter
          </button>
        )}
      </div>

      {/* Liste des compagnies */}
      {leadCompanies.length > 0 ? (
        <div className="space-y-4">
          {leadCompanies.map((lc) => {
            const company = lc.company as InsuranceCompany | undefined;
            if (!company) return null;

            return (
              <div
                key={lc.id}
                className="border border-gray-800 rounded-lg p-4 hover:border-blue-500/30 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-bold text-white">{company.name}</h4>
                      {getStatusBadge(lc.status)}
                    </div>
                    <p className="text-sm text-gray-500">Code: {company.code}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveCompany(lc.id)}
                    className="text-red-500 hover:text-red-400 p-1"
                    title="Retirer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Montant devis */}
                {lc.quote_amount && (
                  <div className="mb-3 text-2xl font-bold text-blue-500">
                    {lc.quote_amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} / an
                  </div>
                )}

                {/* Actions rapides */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {company.contact_phone && (
                    <a
                      href={`tel:${company.contact_phone}`}
                      className="flex items-center gap-1 px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded"
                    >
                      <Phone className="w-3 h-3" />
                      {company.contact_phone}
                    </a>
                  )}
                  {company.contact_email && (
                    <a
                      href={`mailto:${company.contact_email}`}
                      className="flex items-center gap-1 px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded"
                    >
                      <Mail className="w-3 h-3" />
                      Email
                    </a>
                  )}
                  {company.website && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Site web
                    </a>
                  )}
                </div>

                {/* Horaires */}
                {company.contact_hours && (
                  <div className="flex items-start gap-2 mb-3 text-xs text-gray-400">
                    <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{company.contact_hours}</span>
                  </div>
                )}

                {/* Notes */}
                {lc.notes && (
                  <div className="mb-3 text-sm text-gray-400 bg-gray-800 rounded px-3 py-2">
                    {lc.notes}
                  </div>
                )}

                {/* Changement de statut */}
                <div className="flex flex-wrap gap-2">
                  {lc.status !== 'contacted' && (
                    <button
                      onClick={() => handleUpdateStatus(lc.id, 'contacted')}
                      className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded"
                    >
                      Contactée
                    </button>
                  )}
                  {lc.status !== 'quoted' && (
                    <button
                      onClick={() => handleUpdateStatus(lc.id, 'quoted')}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
                    >
                      Devis envoyé
                    </button>
                  )}
                  {lc.status !== 'accepted' && (
                    <button
                      onClick={() => handleUpdateStatus(lc.id, 'accepted')}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
                    >
                      Accepté
                    </button>
                  )}
                  {lc.status !== 'rejected' && (
                    <button
                      onClick={() => handleUpdateStatus(lc.id, 'rejected')}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
                    >
                      Refusé
                    </button>
                  )}
                </div>

                {/* Dates */}
                <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-gray-500 space-y-1">
                  {lc.quote_sent_at && (
                    <div>Devis envoyé le {new Date(lc.quote_sent_at).toLocaleDateString('fr-FR')}</div>
                  )}
                  {lc.response_at && (
                    <div>Réponse reçue le {new Date(lc.response_at).toLocaleDateString('fr-FR')}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">Aucune compagnie contactée</p>
          {availableCompanies.length > 0 && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Contacter une compagnie
            </button>
          )}
        </div>
      )}

      {/* Modal Ajout */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSelectedCompanyId(null);
          setForm({ status: 'contacted', quote_amount: '', notes: '' });
        }}
        title="Ajouter une compagnie"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Compagnie *</label>
            <select
              value={selectedCompanyId || ''}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              required
            >
              <option value="">Sélectionner...</option>
              {availableCompanies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name} ({company.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Statut *</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as any })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
            >
              <option value="contacted">Contactée</option>
              <option value="quoted">Devis envoyé</option>
              <option value="pending">En attente</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Montant du devis (annuel)</label>
            <input
              type="number"
              step="0.01"
              value={form.quote_amount}
              onChange={(e) => setForm({ ...form, quote_amount: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
              rows={3}
              placeholder="Notes sur cette compagnie..."
            />
          </div>
        </div>

        <ModalFooter>
          <button
            onClick={() => {
              setShowAddModal(false);
              setSelectedCompanyId(null);
              setForm({ status: 'contacted', quote_amount: '', notes: '' });
            }}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg"
          >
            Annuler
          </button>
          <button
            onClick={handleAddCompany}
            disabled={saving || !selectedCompanyId}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg"
          >
            {saving ? 'Ajout...' : 'Ajouter'}
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
