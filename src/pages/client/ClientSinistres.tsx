import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Shield, Plus, CheckCircle, AlertCircle, Clock, X, Upload,
  ChevronRight, FileText, Loader, Phone, Calendar
} from 'lucide-react';
import ClientLayout from '../../components/client/ClientLayout';
import SEOHead from '../../components/SEOHead';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

interface Claim {
  id: string;
  claim_number: string | null;
  incident_type: string | null;
  claim_type: string;
  incident_date: string;
  incident_description: string;
  claim_status: string | null;
  created_at: string;
  estimated_amount: number | null;
}

const INCIDENT_TYPES = [
  { value: 'accident_responsable',   label: 'Accident responsable' },
  { value: 'accident_non_responsable', label: 'Accident non responsable' },
  { value: 'bris_de_glace',          label: 'Bris de glace' },
  { value: 'vol',                    label: 'Vol ou tentative de vol' },
  { value: 'incendie',               label: 'Incendie' },
  { value: 'catastrophe_naturelle',  label: 'Catastrophe naturelle' },
  { value: 'vandalisme',             label: 'Vandalisme / dégradation' },
  { value: 'autre',                  label: 'Autre incident' },
];

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  open:        { label: 'Ouvert',          bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
  in_progress: { label: 'En cours',        bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
  pending:     { label: 'En attente',      bg: 'bg-amber-100',  text: 'text-amber-700',  icon: Clock },
  resolved:    { label: 'Résolu',          bg: 'bg-green-100',  text: 'text-green-700',  icon: CheckCircle },
  closed:      { label: 'Clôturé',         bg: 'bg-gray-100',   text: 'text-gray-600',   icon: CheckCircle },
  rejected:    { label: 'Refusé',          bg: 'bg-red-100',    text: 'text-red-700',    icon: AlertCircle },
  default:     { label: 'Ouvert',          bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
};

function StatusBadge({ status }: { status: string | null }) {
  const cfg = STATUS_CONFIG[status || 'default'] || STATUS_CONFIG.default;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

export default function ClientSinistres() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email') || sessionStorage.getItem('client_email') || '';

  const [claims, setClaims] = useState<Claim[]>([]);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [form, setForm] = useState({
    incident_type: '',
    incident_date: '',
    description: '',
    location: '',
    third_party_involved: false,
    third_party_info: '',
    police_report: false,
    police_report_number: '',
  });

  useEffect(() => {
    if (!email) {
      navigate('/espace-client');
      return;
    }
    sessionStorage.setItem('client_email', email);
    loadData();
  }, [email, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: portal } = await supabase
        .from('client_portal_users')
        .select('lead_id')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      let id = portal?.lead_id;
      if (!id) {
        const { data: lead } = await supabase
          .from('crm_leads')
          .select('id')
          .eq('email', email.toLowerCase().trim())
          .maybeSingle();
        id = lead?.id;
      }

      if (id) {
        setLeadId(id);
        const { data, error } = await supabase
          .from('crm_claims')
          .select('id, claim_number, incident_type, claim_type, incident_date, incident_description, claim_status, created_at, estimated_amount')
          .eq('lead_id', id)
          .order('created_at', { ascending: false });

        if (!error) setClaims((data || []) as Claim[]);
      }
    } catch (err) {
      logger.error('Error loading claims:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadId || !form.incident_type || !form.incident_date || !form.description) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const { error } = await supabase.from('crm_claims').insert({
        lead_id: leadId,
        incident_type: form.incident_type,
        claim_type: form.incident_type,
        incident_date: form.incident_date,
        incident_description: form.description,
        incident_location: form.location || null,
        third_party_involved: form.third_party_involved,
        third_party_info: form.third_party_involved ? form.third_party_info : null,
        police_report_number: form.police_report ? form.police_report_number : null,
        claim_status: 'open',
        reported_by: 'client',
        declared_at: new Date().toISOString(),
        client_notes: form.description,
        claim_number: `SIN-${Date.now()}`,
      });

      if (error) throw error;

      setSubmitSuccess(true);
      setShowForm(false);
      setForm({
        incident_type: '',
        incident_date: '',
        description: '',
        location: '',
        third_party_involved: false,
        third_party_info: '',
        police_report: false,
        police_report_number: '',
      });
      await loadData();
      setTimeout(() => setSubmitSuccess(false), 6000);
    } catch (err: any) {
      setSubmitError(err.message || 'Erreur lors de la déclaration');
    } finally {
      setSubmitting(false);
    }
  };

  const activeClaims = claims.filter(c => !['closed', 'rejected'].includes(c.claim_status || 'open'));
  const closedClaims = claims.filter(c => ['closed', 'rejected'].includes(c.claim_status || 'open'));

  return (
    <>
      <SEOHead
        title="Mes Sinistres - Espace Client TaxiAssur"
        description="Déclarez et suivez vos sinistres"
        noIndex={true}
      />

      <ClientLayout email={email}>
        <div className="space-y-6">

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mes Sinistres</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                Déclarez et suivez vos sinistres en temps réel
              </p>
            </div>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black rounded-lg font-semibold text-sm transition-all shadow-sm flex-shrink-0"
              >
                <Plus size={16} />
                Déclarer un sinistre
              </button>
            )}
          </div>

          {/* Success banner */}
          {submitSuccess && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
              <CheckCircle size={18} className="text-green-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-800 text-sm">Sinistre déclaré avec succès</p>
                <p className="text-green-700 text-xs">Notre équipe va prendre en charge votre dossier rapidement.</p>
              </div>
            </div>
          )}

          {/* Declaration form */}
          {showForm && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
                <h2 className="font-bold text-gray-900">Déclarer un sinistre</h2>
                <button
                  onClick={() => { setShowForm(false); setSubmitError(null); }}
                  className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors text-gray-500"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {submitError && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                    <AlertCircle size={14} className="text-red-600 flex-shrink-0" />
                    <p className="text-sm text-red-700">{submitError}</p>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Type d'incident <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={form.incident_type}
                      onChange={e => setForm(f => ({ ...f, incident_type: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white"
                    >
                      <option value="">Sélectionnez...</option>
                      {INCIDENT_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Date de l'incident <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      max={new Date().toISOString().split('T')[0]}
                      value={form.incident_date}
                      onChange={e => setForm(f => ({ ...f, incident_date: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Lieu de l'incident
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Paris 15ème, Boulevard du Montparnasse"
                    value={form.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Description des faits <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Décrivez précisément les circonstances de l'incident..."
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent resize-none"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.third_party_involved}
                        onChange={e => setForm(f => ({ ...f, third_party_involved: e.target.checked }))}
                        className="w-4 h-4 accent-yellow-500 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">Tiers impliqué</span>
                    </label>
                    {form.third_party_involved && (
                      <input
                        type="text"
                        placeholder="Nom, prénom, plaque du tiers..."
                        value={form.third_party_info}
                        onChange={e => setForm(f => ({ ...f, third_party_info: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                      />
                    )}
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.police_report}
                        onChange={e => setForm(f => ({ ...f, police_report: e.target.checked }))}
                        className="w-4 h-4 accent-yellow-500 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">Procès-verbal établi</span>
                    </label>
                    {form.police_report && (
                      <input
                        type="text"
                        placeholder="Numéro du PV"
                        value={form.police_report_number}
                        onChange={e => setForm(f => ({ ...f, police_report_number: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                      />
                    )}
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
                  Après déclaration, vous pourrez envoyer vos photos et documents justificatifs depuis la section "Mes Documents".
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setSubmitError(null); }}
                    className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !form.incident_type || !form.incident_date || !form.description}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold text-sm rounded-lg transition-all"
                  >
                    {submitting ? <><Loader size={14} className="animate-spin" /> Envoi...</> : <><ChevronRight size={14} /> Déclarer le sinistre</>}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <div className="w-10 h-10 rounded-full animate-spin mx-auto mb-3" style={{ border: '3px solid #fbbf24', borderTopColor: 'transparent' }} />
              <p className="text-sm text-gray-500">Chargement de vos sinistres...</p>
            </div>
          ) : claims.length === 0 ? (
            <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <h2 className="font-bold text-lg">Aucun sinistre en cours</h2>
                  <p className="text-sm opacity-90">
                    Excellente nouvelle ! Vous n'avez aucun sinistre à traiter.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {activeClaims.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                    Sinistres en cours ({activeClaims.length})
                  </h2>
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                    {activeClaims.map(claim => (
                      <div key={claim.id} className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Shield size={18} className="text-yellow-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-semibold text-gray-900 text-sm">
                                  {INCIDENT_TYPES.find(t => t.value === (claim.incident_type || claim.claim_type))?.label || claim.incident_type || claim.claim_type}
                                </span>
                                <StatusBadge status={claim.claim_status} />
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Calendar size={11} />
                                  {new Date(claim.incident_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </span>
                                {claim.claim_number && (
                                  <span className="flex items-center gap-1">
                                    <FileText size={11} />
                                    N° {claim.claim_number}
                                  </span>
                                )}
                                {claim.estimated_amount != null && (
                                  <span className="font-medium text-gray-700">
                                    ~{claim.estimated_amount.toFixed(2)} €
                                  </span>
                                )}
                              </div>
                              {claim.incident_description && (
                                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed line-clamp-2">{claim.incident_description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {closedClaims.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-base font-semibold text-gray-500 flex items-center gap-2">
                    <CheckCircle size={15} className="text-gray-400" />
                    Historique ({closedClaims.length})
                  </h2>
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50 opacity-80">
                    {closedClaims.map(claim => (
                      <div key={claim.id} className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Shield size={16} className="text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-gray-700 text-sm">
                                {INCIDENT_TYPES.find(t => t.value === (claim.incident_type || claim.claim_type))?.label || claim.incident_type || claim.claim_type}
                              </span>
                              <StatusBadge status={claim.claim_status} />
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(claim.incident_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* How to declare guide */}
          {claims.length === 0 && !showForm && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-gray-900 mb-4">Comment déclarer un sinistre ?</h2>
              <div className="grid sm:grid-cols-3 gap-5">
                {[
                  { step: '1', title: 'Cliquez sur "Déclarer"', desc: 'Remplissez le formulaire en 3 minutes depuis votre espace' },
                  { step: '2', title: 'Ajoutez vos documents', desc: 'Photos, PV, constat amiable depuis "Mes Documents"' },
                  { step: '3', title: 'Suivez l\'avancement', desc: 'Notre équipe traite votre dossier et vous tient informé' },
                ].map(({ step, title, desc }) => (
                  <div key={step} className="flex gap-4">
                    <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-yellow-700 text-sm">
                      {step}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm mb-0.5">{title}</h3>
                      <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Emergency block */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-gray-900 mb-1">Urgence sinistre ?</h3>
                <p className="text-sm text-gray-700 mb-3">
                  En cas d'accident grave ou d'urgence, contactez notre assistance disponible 24h/24, 7j/7.
                </p>
                <a
                  href="tel:0180855786"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm transition-all"
                >
                  <Phone size={14} />
                  Assistance 24/7 — 01 80 85 57 86
                </a>
              </div>
            </div>
          </div>

        </div>
      </ClientLayout>
    </>
  );
}
