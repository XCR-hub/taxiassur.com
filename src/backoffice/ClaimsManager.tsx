import { useEffect, useState } from 'react';
import {
  Shield, Search, Filter, ChevronDown, ChevronUp,
  Calendar, MapPin, User, Phone, Mail, Car, Wrench,
  AlertCircle, CheckCircle, Clock, XCircle, DollarSign,
  Plus, Save, Loader, Eye, EyeOff, FileText, Building2,
  RefreshCw, ChevronRight, type LucideIcon
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ClaimEvent {
  id: string;
  event_type: string;
  event_date: string;
  title: string;
  description: string | null;
  is_visible_to_client: boolean;
  created_by_admin: boolean;
}

interface Claim {
  id: string;
  claim_number: string | null;
  incident_type: string | null;
  claim_type: string;
  incident_date: string;
  incident_location: string | null;
  incident_description: string;
  claim_status: string;
  client_visible_status: string | null;
  client_visible_notes: string | null;
  estimated_amount: number | null;
  indemnisation_amount: number | null;
  indemnisation_date: string | null;
  indemnisation_paid_at: string | null;
  expert_name: string | null;
  expert_company: string | null;
  expert_phone: string | null;
  expert_email: string | null;
  expert_mission_date: string | null;
  expert_appointment_date: string | null;
  expertise_garage_name: string | null;
  expertise_garage_address: string | null;
  expertise_garage_phone: string | null;
  expertise_date: string | null;
  repair_garage_name: string | null;
  repair_garage_address: string | null;
  repair_garage_phone: string | null;
  repair_start_date: string | null;
  repair_end_date: string | null;
  third_party_involved: boolean;
  third_party_info: string | null;
  police_report_number: string | null;
  internal_notes: string | null;
  reported_by: string | null;
  declared_at: string;
  created_at: string;
  updated_at: string;
  lead_id: string | null;
  lead_first_name: string | null;
  lead_last_name: string | null;
  lead_email: string | null;
  lead_phone: string | null;
  events: ClaimEvent[];
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: LucideIcon }> = {
  open:                    { label: 'Ouvert',                  bg: 'bg-blue-50',   text: 'text-blue-700',   icon: Clock },
  DECLARED:                { label: 'Déclaré',                 bg: 'bg-yellow-50', text: 'text-yellow-700', icon: FileText },
  DOCUMENTS_PENDING:       { label: 'Docs attendus',           bg: 'bg-amber-50',  text: 'text-amber-700',  icon: Clock },
  EXPERT_MISSIONED:        { label: 'Expert missionné',        bg: 'bg-blue-50',   text: 'text-blue-700',   icon: User },
  EXPERTISE_SCHEDULED:     { label: 'Expertise planifiée',     bg: 'bg-cyan-50',   text: 'text-cyan-700',   icon: Calendar },
  EXPERTISE_DONE:          { label: 'Expertise réalisée',      bg: 'bg-teal-50',   text: 'text-teal-700',   icon: CheckCircle },
  UNDER_REVIEW:            { label: 'En examen',               bg: 'bg-blue-50',   text: 'text-blue-700',   icon: Search },
  INDEMNISATION_PROPOSED:  { label: 'Indemnisation proposée',  bg: 'bg-orange-50', text: 'text-orange-700', icon: DollarSign },
  REPAIR_IN_PROGRESS:      { label: 'Réparation en cours',     bg: 'bg-purple-50', text: 'text-purple-700', icon: Wrench },
  APPROVED:                { label: 'Approuvé',                bg: 'bg-green-50',  text: 'text-green-700',  icon: CheckCircle },
  REJECTED:                { label: 'Refusé',                  bg: 'bg-red-50',    text: 'text-red-700',    icon: XCircle },
  PAID:                    { label: 'Indemnisé',               bg: 'bg-green-50',  text: 'text-green-700',  icon: CheckCircle },
  CLOSED:                  { label: 'Clôturé',                 bg: 'bg-gray-50',   text: 'text-gray-600',   icon: CheckCircle },
};

const INCIDENT_LABELS: Record<string, string> = {
  ACCIDENT_RESPONSABLE:     'Accident responsable',
  ACCIDENT_NON_RESPONSABLE: 'Accident non responsable',
  BRIS_GLACE:               'Bris de glace',
  VOL:                      'Vol',
  INCENDIE:                 'Incendie',
  CATASTROPHE_NATURELLE:    'Catastrophe naturelle',
  VANDALISME:               'Vandalisme',
  DOMMAGES_COLLISION:       'Dommages / collision',
  ASSISTANCE:               'Assistance',
  AUTRE:                    'Autre',
};

const EVENT_TYPES = [
  { value: 'declaration',       label: 'Déclaration' },
  { value: 'status_update',     label: 'Mise à jour statut' },
  { value: 'expert_assigned',   label: 'Expert missionné' },
  { value: 'appointment',       label: 'Rendez-vous' },
  { value: 'expertise',         label: 'Expertise' },
  { value: 'repair',            label: 'Réparation' },
  { value: 'indemnisation',     label: 'Indemnisation' },
  { value: 'document',          label: 'Document' },
  { value: 'note',              label: 'Note' },
  { value: 'closure',           label: 'Clôture' },
];

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DECLARED;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function ClaimsManager() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const [editForms, setEditForms] = useState<Record<string, any>>({});
  const [newEvent, setNewEvent] = useState<Record<string, { title: string; description: string; type: string; visible: boolean }>>({});

  useEffect(() => {
    loadClaims();
  }, [filterStatus]);

  const loadClaims = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_all_claims_for_admin', {
        p_status: filterStatus || null,
        p_limit: 100,
        p_offset: 0,
      });
      if (error) throw error;
      if (data?.success) setClaims(data.claims || []);
    } catch (err) {
      console.error('Error loading claims:', err);
    } finally {
      setLoading(false);
    }
  };

  const initEdit = (claim: Claim) => {
    if (editForms[claim.id]) return;
    setEditForms(prev => ({
      ...prev,
      [claim.id]: {
        claim_status:             claim.claim_status,
        client_visible_status:    claim.client_visible_status || '',
        client_visible_notes:     claim.client_visible_notes || '',
        expert_name:              claim.expert_name || '',
        expert_company:           claim.expert_company || '',
        expert_phone:             claim.expert_phone || '',
        expert_email:             claim.expert_email || '',
        expert_mission_date:      claim.expert_mission_date || '',
        expert_appointment_date:  claim.expert_appointment_date ? claim.expert_appointment_date.split('T')[0] : '',
        expertise_garage_name:    claim.expertise_garage_name || '',
        expertise_garage_address: claim.expertise_garage_address || '',
        expertise_garage_phone:   claim.expertise_garage_phone || '',
        expertise_date:           claim.expertise_date || '',
        repair_garage_name:       claim.repair_garage_name || '',
        repair_garage_address:    claim.repair_garage_address || '',
        repair_garage_phone:      claim.repair_garage_phone || '',
        repair_start_date:        claim.repair_start_date || '',
        repair_end_date:          claim.repair_end_date || '',
        indemnisation_amount:     claim.indemnisation_amount ?? '',
        indemnisation_date:       claim.indemnisation_date || '',
        indemnisation_paid_at:    claim.indemnisation_paid_at ? claim.indemnisation_paid_at.split('T')[0] : '',
        internal_notes:           claim.internal_notes || '',
      },
    }));
    setNewEvent(prev => ({
      ...prev,
      [claim.id]: { title: '', description: '', type: 'status_update', visible: true },
    }));
  };

  const handleSave = async (claimId: string) => {
    const form = editForms[claimId];
    const evt = newEvent[claimId];
    if (!form) return;

    setSaving(claimId);
    try {
      const { error } = await supabase.rpc('update_claim_tracking', {
        p_claim_id:                 claimId,
        p_claim_status:             form.claim_status || null,
        p_client_visible_status:    form.client_visible_status || null,
        p_client_visible_notes:     form.client_visible_notes || null,
        p_expert_name:              form.expert_name || null,
        p_expert_company:           form.expert_company || null,
        p_expert_phone:             form.expert_phone || null,
        p_expert_email:             form.expert_email || null,
        p_expert_mission_date:      form.expert_mission_date || null,
        p_expert_appointment_date:  form.expert_appointment_date ? form.expert_appointment_date + 'T00:00:00Z' : null,
        p_expertise_garage_name:    form.expertise_garage_name || null,
        p_expertise_garage_address: form.expertise_garage_address || null,
        p_expertise_garage_phone:   form.expertise_garage_phone || null,
        p_expertise_date:           form.expertise_date || null,
        p_repair_garage_name:       form.repair_garage_name || null,
        p_repair_garage_address:    form.repair_garage_address || null,
        p_repair_garage_phone:      form.repair_garage_phone || null,
        p_repair_start_date:        form.repair_start_date || null,
        p_repair_end_date:          form.repair_end_date || null,
        p_indemnisation_amount:     form.indemnisation_amount !== '' ? parseFloat(form.indemnisation_amount) : null,
        p_indemnisation_date:       form.indemnisation_date || null,
        p_indemnisation_paid_at:    form.indemnisation_paid_at ? form.indemnisation_paid_at + 'T00:00:00Z' : null,
        p_internal_notes:           form.internal_notes || null,
        p_add_event_title:          evt?.title || null,
        p_add_event_description:    evt?.description || null,
        p_add_event_type:           evt?.type || null,
        p_event_visible_to_client:  evt?.visible ?? true,
      });
      if (error) throw error;

      setNewEvent(prev => ({ ...prev, [claimId]: { title: '', description: '', type: 'status_update', visible: true } }));
      await loadClaims();
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(null);
    }
  };

  const updateField = (claimId: string, field: string, value: string | number | boolean | null) => {
    setEditForms(prev => ({ ...prev, [claimId]: { ...prev[claimId], [field]: value } }));
  };

  const filtered = claims.filter(c => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      (c.lead_first_name || '').toLowerCase().includes(q) ||
      (c.lead_last_name || '').toLowerCase().includes(q) ||
      (c.lead_email || '').toLowerCase().includes(q) ||
      (c.claim_number || '').toLowerCase().includes(q) ||
      (c.incident_type || c.claim_type || '').toLowerCase().includes(q)
    );
  });

  const stats = {
    total: claims.length,
    open: claims.filter(c => !['CLOSED', 'PAID', 'REJECTED'].includes(c.claim_status)).length,
    pending: claims.filter(c => ['DECLARED', 'open', 'DOCUMENTS_PENDING'].includes(c.claim_status)).length,
    inProgress: claims.filter(c => ['EXPERT_MISSIONED', 'EXPERTISE_SCHEDULED', 'EXPERTISE_DONE', 'UNDER_REVIEW', 'REPAIR_IN_PROGRESS'].includes(c.claim_status)).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Sinistres</h1>
          <p className="text-sm text-gray-500 mt-0.5">Suivi complet des dossiers sinistres clients</p>
        </div>
        <button onClick={loadClaims} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors">
          <RefreshCw size={14} />
          Actualiser
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'bg-gray-50 border-gray-200', textColor: 'text-gray-900' },
          { label: 'En cours', value: stats.open, color: 'bg-blue-50 border-blue-200', textColor: 'text-blue-700' },
          { label: 'En attente', value: stats.pending, color: 'bg-yellow-50 border-yellow-200', textColor: 'text-yellow-700' },
          { label: 'Instruction', value: stats.inProgress, color: 'bg-orange-50 border-orange-200', textColor: 'text-orange-700' },
        ].map(s => (
          <div key={s.label} className={`${s.color} border rounded-xl p-4`}>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.textColor}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par client, N° dossier..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="pl-3 pr-8 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white"
          >
            <option value="">Tous les statuts</option>
            {Object.entries(STATUS_CONFIG).map(([v, c]) => (
              <option key={v} value={v}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Claims list */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <Loader size={24} className="animate-spin mx-auto text-yellow-500 mb-3" />
          <p className="text-sm text-gray-500">Chargement des sinistres...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <Shield size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Aucun sinistre trouvé</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(claim => {
            const isExpanded = expandedId === claim.id;
            const form = editForms[claim.id];
            const evt = newEvent[claim.id];
            const incidentLabel = INCIDENT_LABELS[claim.incident_type || claim.claim_type] || claim.incident_type || claim.claim_type;

            return (
              <div key={claim.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Header row */}
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => {
                    if (!isExpanded) initEdit(claim);
                    setExpandedId(isExpanded ? null : claim.id);
                  }}
                >
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Shield size={18} className="text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">{incidentLabel}</span>
                      <StatusBadge status={claim.claim_status} />
                      {claim.claim_number && <span className="text-xs text-gray-400">N° {claim.claim_number}</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        <User size={10} />
                        {claim.lead_first_name} {claim.lead_last_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />
                        {formatDate(claim.incident_date)}
                      </span>
                      {claim.incident_location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={10} />
                          {claim.incident_location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-gray-400">
                      {claim.reported_by === 'client_portal' ? 'Client' : 'Commercial'}
                    </span>
                    {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && form && (
                  <div className="border-t border-gray-100">
                    <div className="p-5 space-y-6">

                      {/* Client info */}
                      <div className="bg-gray-50 rounded-xl p-4">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Informations client</h3>
                        <div className="grid sm:grid-cols-3 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <User size={13} className="text-gray-400" />
                            <span className="text-gray-700">{claim.lead_first_name} {claim.lead_last_name}</span>
                          </div>
                          {claim.lead_email && (
                            <div className="flex items-center gap-2">
                              <Mail size={13} className="text-gray-400" />
                              <span className="text-gray-700">{claim.lead_email}</span>
                            </div>
                          )}
                          {claim.lead_phone && (
                            <div className="flex items-center gap-2">
                              <Phone size={13} className="text-gray-400" />
                              <span className="text-gray-700">{claim.lead_phone}</span>
                            </div>
                          )}
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-500 font-medium mb-1">Description</p>
                          <p className="text-sm text-gray-700 leading-relaxed">{claim.incident_description}</p>
                        </div>
                        {claim.third_party_involved && claim.third_party_info && (
                          <p className="text-xs text-gray-600 mt-2"><span className="font-medium">Tiers :</span> {claim.third_party_info}</p>
                        )}
                        {claim.police_report_number && (
                          <p className="text-xs text-gray-600 mt-1"><span className="font-medium">N° PV :</span> {claim.police_report_number}</p>
                        )}
                      </div>

                      <div className="grid lg:grid-cols-2 gap-6">
                        {/* Left: Status + Client info visible */}
                        <div className="space-y-5">
                          {/* Status */}
                          <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                              <Shield size={12} />
                              Statut & Informations client
                            </h3>
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Statut du dossier</label>
                                <select
                                  value={form.claim_status}
                                  onChange={e => updateField(claim.id, 'claim_status', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white"
                                >
                                  {Object.entries(STATUS_CONFIG).map(([v, c]) => (
                                    <option key={v} value={v}>{c.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><Eye size={11} /> Message visible client</label>
                                <input
                                  type="text"
                                  placeholder="Ex: Votre expert est missionné, RDV le 25 mars..."
                                  value={form.client_visible_status}
                                  onChange={e => updateField(claim.id, 'client_visible_status', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><Eye size={11} /> Notes visibles client</label>
                                <textarea
                                  rows={3}
                                  placeholder="Informations supplémentaires pour le client..."
                                  value={form.client_visible_notes}
                                  onChange={e => updateField(claim.id, 'client_visible_notes', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><EyeOff size={11} /> Notes internes</label>
                                <textarea
                                  rows={3}
                                  placeholder="Notes internes (non visibles par le client)..."
                                  value={form.internal_notes}
                                  onChange={e => updateField(claim.id, 'internal_notes', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Expert */}
                          <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                              <User size={12} />
                              Missionnement expert
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Nom de l'expert</label>
                                <input type="text" value={form.expert_name} onChange={e => updateField(claim.id, 'expert_name', e.target.value)} placeholder="Jean Dupont" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Société</label>
                                <input type="text" value={form.expert_company} onChange={e => updateField(claim.id, 'expert_company', e.target.value)} placeholder="Cabinet XYZ" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Téléphone</label>
                                <input type="tel" value={form.expert_phone} onChange={e => updateField(claim.id, 'expert_phone', e.target.value)} placeholder="06..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                                <input type="email" value={form.expert_email} onChange={e => updateField(claim.id, 'expert_email', e.target.value)} placeholder="expert@..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Date de mission</label>
                                <input type="date" value={form.expert_mission_date} onChange={e => updateField(claim.id, 'expert_mission_date', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">RDV expert</label>
                                <input type="date" value={form.expert_appointment_date} onChange={e => updateField(claim.id, 'expert_appointment_date', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                              </div>
                            </div>
                          </div>

                          {/* Indemnisation */}
                          <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                              <DollarSign size={12} />
                              Indemnisation
                            </h3>
                            <div className="grid grid-cols-3 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Montant proposé (€)</label>
                                <input type="number" step="0.01" value={form.indemnisation_amount} onChange={e => updateField(claim.id, 'indemnisation_amount', e.target.value)} placeholder="0.00" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Date proposition</label>
                                <input type="date" value={form.indemnisation_date} onChange={e => updateField(claim.id, 'indemnisation_date', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Date paiement</label>
                                <input type="date" value={form.indemnisation_paid_at} onChange={e => updateField(claim.id, 'indemnisation_paid_at', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right: Garages + Timeline */}
                        <div className="space-y-5">
                          {/* Garage expertise */}
                          <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                              <Car size={12} />
                              Garage expertise
                            </h3>
                            <div className="space-y-3">
                              <input type="text" value={form.expertise_garage_name} onChange={e => updateField(claim.id, 'expertise_garage_name', e.target.value)} placeholder="Nom du garage" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                              <input type="text" value={form.expertise_garage_address} onChange={e => updateField(claim.id, 'expertise_garage_address', e.target.value)} placeholder="Adresse" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                              <div className="grid grid-cols-2 gap-3">
                                <input type="tel" value={form.expertise_garage_phone} onChange={e => updateField(claim.id, 'expertise_garage_phone', e.target.value)} placeholder="Téléphone" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Date expertise</label>
                                  <input type="date" value={form.expertise_date} onChange={e => updateField(claim.id, 'expertise_date', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Garage réparation */}
                          <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                              <Wrench size={12} />
                              Garage réparation
                            </h3>
                            <div className="space-y-3">
                              <input type="text" value={form.repair_garage_name} onChange={e => updateField(claim.id, 'repair_garage_name', e.target.value)} placeholder="Nom du garage" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                              <input type="text" value={form.repair_garage_address} onChange={e => updateField(claim.id, 'repair_garage_address', e.target.value)} placeholder="Adresse" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                              <div className="grid grid-cols-3 gap-3">
                                <input type="tel" value={form.repair_garage_phone} onChange={e => updateField(claim.id, 'repair_garage_phone', e.target.value)} placeholder="Tel" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Début réparation</label>
                                  <input type="date" value={form.repair_start_date} onChange={e => updateField(claim.id, 'repair_start_date', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Fin prévue</label>
                                  <input type="date" value={form.repair_end_date} onChange={e => updateField(claim.id, 'repair_end_date', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Timeline events */}
                          <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                              <Clock size={12} />
                              Historique & Événements
                            </h3>
                            <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                              {claim.events.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-3">Aucun événement</p>
                              ) : (
                                claim.events.map(ev => (
                                  <div key={ev.id} className="flex items-start gap-2 text-xs">
                                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${ev.is_visible_to_client ? 'bg-green-400' : 'bg-gray-300'}`} />
                                    <div>
                                      <span className="font-medium text-gray-700">{ev.title}</span>
                                      <span className="text-gray-400 ml-1.5">{formatDateTime(ev.event_date)}</span>
                                      {!ev.is_visible_to_client && <span className="ml-1.5 text-gray-400">(interne)</span>}
                                      {ev.description && <p className="text-gray-500 mt-0.5">{ev.description}</p>}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>

                            {/* Add event */}
                            {evt && (
                              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-2">
                                <p className="text-xs font-semibold text-blue-700">Ajouter un événement</p>
                                <div className="grid grid-cols-2 gap-2">
                                  <select value={evt.type} onChange={e => setNewEvent(prev => ({ ...prev, [claim.id]: { ...prev[claim.id], type: e.target.value } }))} className="px-2 py-1.5 border border-blue-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white col-span-2">
                                    {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                  </select>
                                  <input
                                    type="text"
                                    placeholder="Titre de l'événement *"
                                    value={evt.title}
                                    onChange={e => setNewEvent(prev => ({ ...prev, [claim.id]: { ...prev[claim.id], title: e.target.value } }))}
                                    className="col-span-2 px-2 py-1.5 border border-blue-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                                  />
                                  <textarea
                                    rows={2}
                                    placeholder="Description (optionnel)"
                                    value={evt.description}
                                    onChange={e => setNewEvent(prev => ({ ...prev, [claim.id]: { ...prev[claim.id], description: e.target.value } }))}
                                    className="col-span-2 px-2 py-1.5 border border-blue-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                                  />
                                  <label className="flex items-center gap-1.5 text-xs text-blue-700 cursor-pointer col-span-2">
                                    <input type="checkbox" checked={evt.visible} onChange={e => setNewEvent(prev => ({ ...prev, [claim.id]: { ...prev[claim.id], visible: e.target.checked } }))} className="accent-blue-500" />
                                    Visible par le client
                                  </label>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                          onClick={() => setExpandedId(null)}
                          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          Fermer
                        </button>
                        <button
                          onClick={() => handleSave(claim.id)}
                          disabled={saving === claim.id}
                          className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 disabled:opacity-50 text-black font-semibold text-sm rounded-lg transition-all"
                        >
                          {saving === claim.id ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
                          Enregistrer
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
