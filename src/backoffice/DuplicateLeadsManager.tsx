import { useState, useEffect } from 'react';
import { nativeAdminSession } from '@/lib/native-admin-auth';
import { nativeAdminCall } from '@/lib/native-admin-data';
import {
  Trash2, AlertTriangle, Users, Mail, Calendar, Shield, GitMerge,
  FileText, MessageSquare, RefreshCw, ChevronDown, ChevronUp,
  CheckCircle, XCircle, Phone, MapPin, Loader2, X, Info, Zap
} from 'lucide-react';

interface DuplicateLead {
  email: string;
  count: number;
  lead_ids: string[];
  first_created: string;
  last_created: string;
}

interface Lead {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  city: string;
  status: string;
  source: string;
  created_at: string;
  metadata: Record<string, unknown>;
  _counts?: { interactions: number; documents: number; emails: number; quotes: number };
}

interface DuplicateLeadsResponse {
  duplicates?: DuplicateLead[];
  details?: Record<string, Lead[]>;
}

interface MergeResponse {
  success?: boolean;
  documents_moved?: number;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  NOUVEAU_LEAD:        { label: 'Nouveau lead',        color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200' },
  RELANCE:             { label: 'Relance',              color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' },
  DEVIS:               { label: 'Devis',                color: 'text-sky-700',     bg: 'bg-sky-50 border-sky-200' },
  COLLECTE_DOCUMENTS:  { label: 'Collecte documents',  color: 'text-teal-700',    bg: 'bg-teal-50 border-teal-200' },
  PAIEMENT:            { label: 'Paiement',             color: 'text-orange-700',  bg: 'bg-orange-50 border-orange-200' },
  CONTRAT_SIGNATURE:   { label: 'Contrat signé',        color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  CLIENT_ACTIF:        { label: 'Client actif',         color: 'text-green-700',   bg: 'bg-green-50 border-green-200' },
  PERDU:               { label: 'Perdu',                color: 'text-red-700',     bg: 'bg-red-50 border-red-200' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] || { label: status, color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel: string;
  confirmClass?: string;
  onConfirm: () => void;
  onCancel: () => void;
}
function ConfirmModal({ title, message, confirmLabel, confirmClass = 'bg-red-600 hover:bg-red-700', onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1 whitespace-pre-line">{message}</p>
          </div>
        </div>
        <div className="px-6 py-4 flex items-center justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
            Annuler
          </button>
          <button onClick={onConfirm} className={`px-5 py-2 text-sm font-bold text-white rounded-xl transition-colors shadow-sm ${confirmClass}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ToastProps { message: string; type: 'success' | 'error' }
function Toast({ message, type }: ToastProps) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-semibold ${
      type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
    }`}>
      {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
      {message}
    </div>
  );
}

export default function DuplicateLeadsManager() {
  const [duplicates, setDuplicates] = useState<DuplicateLead[]>([]);
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [leadsDetails, setLeadsDetails] = useState<Record<string, Lead[]>>({});
  const [loading, setLoading] = useState(true);
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [merging, setMerging] = useState<string | false>(false);
  const [toast, setToast] = useState<ToastProps | null>(null);
  const [confirm, setConfirm] = useState<null | {
    title: string; message: string; confirmLabel: string; confirmClass?: string; onConfirm: () => void;
  }>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const askConfirm = (opts: typeof confirm) => setConfirm(opts);

  useEffect(() => {
    checkMasterAdmin();
    loadDuplicates();
  }, []);

  async function checkMasterAdmin() {
    try {
      const { user } = await nativeAdminSession();
      setIsMasterAdmin(user?.role === 'master');
    } catch { setIsMasterAdmin(false); }
  }

  async function loadDuplicates() {
    setLoading(true);
    try {
      const data = await nativeAdminCall<DuplicateLeadsResponse>('/v1/admin/leads/duplicates');
      setDuplicates(data.duplicates || []);
      setLeadsDetails(data.details || {});
    } catch (e) {
      console.error(e);
      showToast('Impossible de charger les doublons', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadLeadDetails(email: string, leadIds: string[]) {
    if (leadsDetails[email]) {
      setExpandedEmail(expandedEmail === email ? null : email);
      return;
    }
    try {
      const data = await nativeAdminCall<DuplicateLeadsResponse>('/v1/admin/leads/duplicates');
      const details = data.details?.[email] || [];
      setLeadsDetails(prev => ({ ...prev, [email]: details.filter(lead => leadIds.includes(lead.id)) }));
      setExpandedEmail(email);
    } catch (e) { console.error(e); showToast('Impossible de charger les leads', 'error'); }
  }

  function confirmDelete(leadId: string, email: string) {
    if (!isMasterAdmin) { showToast('Seul le Master Admin peut supprimer des leads', 'error'); return; }
    askConfirm({
      title: 'Supprimer ce lead ?',
      message: 'Cette action est irréversible. Le lead et ses données associées seront supprimés. Un journal d\'audit conservera la trace de l\'opération.',
      confirmLabel: 'Supprimer',
      onConfirm: () => { setConfirm(null); executeDelete(leadId, email); },
    });
  }

  async function executeDelete(leadId: string, email: string) {
    try {
      setDeletingId(leadId);
      const data = await nativeAdminCall<{ ok?: boolean }>(`/v1/admin/leads/${encodeURIComponent(leadId)}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason: 'doublon', confirmation: 'SUPPRIMER' }),
      });
      if (data.ok) {
        showToast('Lead supprimé avec succès', 'success');
        setLeadsDetails(prev => ({ ...prev, [email]: prev[email]?.filter(l => l.id !== leadId) || [] }));
        await loadDuplicates();
      } else throw new Error(data?.error);
    } catch (e) {
      showToast('Erreur : ' + (e.message || 'Impossible de supprimer'), 'error');
    } finally {
      setDeletingId(null);
    }
  }

  function confirmMerge(email: string) {
    askConfirm({
      title: `Fusionner les doublons`,
      message: `Email : ${email}\n\nLe système va garder le lead le plus complet et transférer toutes les données (emails, documents, interactions, devis) vers lui.\n\nLes doublons seront archivés.`,
      confirmLabel: 'Fusionner',
      confirmClass: 'bg-blue-600 hover:bg-blue-700',
      onConfirm: () => { setConfirm(null); executeMerge(email); },
    });
  }

  async function executeMerge(email: string) {
    try {
      setMerging(email);
      const result = await mergeDuplicateGroup(email);
      showToast(`${result.merged} lead(s) fusionné(s) — ${result.documents} doc(s) transféré(s)`, 'success');
      await loadDuplicates();
      setExpandedEmail(null);
    } catch (e) {
      showToast('Erreur : ' + (e.message || 'Impossible de fusionner'), 'error');
    } finally {
      setMerging(false);
    }
  }

  function confirmMergeAll() {
    askConfirm({
      title: 'Fusion globale de tous les doublons',
      message: `${duplicates.length} email(s) concerné(s) — ${totalDuplicates} lead(s) au total.\n\nCette opération peut prendre plusieurs secondes.`,
      confirmLabel: 'Tout fusionner',
      confirmClass: 'bg-orange-600 hover:bg-orange-700',
      onConfirm: () => { setConfirm(null); executeAutoMergeAll(); },
    });
  }

  async function executeAutoMergeAll() {
    try {
      setMerging('all');
      let merged = 0;
      for (const duplicate of duplicates) merged += (await mergeDuplicateGroup(duplicate.email)).merged;
      showToast(`${duplicates.length} email(s) — ${merged} lead(s) fusionné(s)`, 'success');
      await loadDuplicates();
      setExpandedEmail(null);
    } catch (e) {
      showToast('Erreur : ' + (e.message || 'Impossible de fusionner'), 'error');
    } finally {
      setMerging(false);
    }
  }

  async function mergeDuplicateGroup(email: string) {
    const leads = leadsDetails[email] || [];
    if (leads.length < 2) throw new Error('Détails des doublons indisponibles');
    const score = (lead: Lead) => Object.values(lead._counts || {}).reduce((sum, count) => sum + count, 0)
      + Object.values(lead).filter(value => value !== null && value !== undefined && value !== '').length;
    const [target, ...sources] = [...leads].sort((a, b) => score(b) - score(a));
    let documents = 0;
    for (const source of sources) {
      const result = await nativeAdminCall<MergeResponse>('/v1/admin/leads/merge', {
        method: 'POST',
        body: JSON.stringify({ source_id: source.id, target_id: target.id }),
      });
      if (!result.success) throw new Error('Fusion refusée par le serveur');
      documents += result.documents_moved || 0;
    }
    return { merged: sources.length, documents };
  }

  const totalDuplicates = duplicates.reduce((acc, d) => acc + d.count, 0);

  if (!isMasterAdmin && !loading) {
    return (
      <div className="p-6 max-w-lg mx-auto mt-16">
        <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-10 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Accès restreint</h2>
          <p className="text-gray-500 text-sm">Cette section est réservée au Master Admin.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-sky-500 animate-spin" />
          <p className="text-gray-500 text-sm font-medium">Chargement des doublons...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Gestion des doublons</h1>
          <p className="text-sm text-gray-500 mt-1">Identifiez et fusionnez les leads en doublon. Suppression réservée au Master Admin.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadDuplicates}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
          {duplicates.length > 0 && (
            <button
              onClick={confirmMergeAll}
              disabled={merging !== false}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-xl text-sm font-bold shadow-sm transition-all disabled:opacity-50"
            >
              {merging === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Tout fusionner
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Emails en doublon</p>
              <p className="text-3xl font-black text-orange-600">{duplicates.length}</p>
            </div>
            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
              <Mail className="w-6 h-6 text-orange-400" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total leads dupliqués</p>
              <p className="text-3xl font-black text-red-600">{totalDuplicates}</p>
            </div>
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-red-400" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Leads économisés</p>
              <p className="text-3xl font-black text-emerald-600">{totalDuplicates - duplicates.length}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {duplicates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-16 text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Aucun doublon</h3>
          <p className="text-gray-500 text-sm">Tous les emails sont uniques dans votre base de données.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {duplicates.map((dup) => (
            <div key={dup.email} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Row header */}
              <button
                onClick={() => loadLeadDetails(dup.email, dup.lead_ids)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-orange-100 text-orange-700 rounded-xl flex items-center justify-center font-black text-sm">
                    {dup.count}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{dup.email}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{dup.count} leads avec cet email</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-0.5">
                      <Calendar className="w-3 h-3" />
                      <span>1er : {new Date(dup.first_created).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Calendar className="w-3 h-3" />
                      <span>Dernier : {new Date(dup.last_created).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                  {expandedEmail === dup.email
                    ? <ChevronUp className="w-4 h-4 text-gray-400" />
                    : <ChevronDown className="w-4 h-4 text-gray-400" />
                  }
                </div>
              </button>

              {/* Expanded details */}
              {expandedEmail === dup.email && leadsDetails[dup.email] && (
                <div className="border-t border-gray-100 bg-gray-50 p-5 space-y-4">
                  {/* Merge action bar */}
                  <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                        <GitMerge className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Fusion intelligente</p>
                        <p className="text-xs text-gray-500">Garde le lead le plus complet et transfère toutes les données</p>
                      </div>
                    </div>
                    <button
                      onClick={() => confirmMerge(dup.email)}
                      disabled={merging !== false}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 shadow-sm flex-shrink-0"
                    >
                      {merging === dup.email ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitMerge className="w-4 h-4" />}
                      Fusionner
                    </button>
                  </div>

                  {/* Lead cards */}
                  <div className="space-y-3">
                    {leadsDetails[dup.email].map((lead, index) => (
                      <div key={lead.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        {/* Card header */}
                        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                              Lead #{index + 1}
                            </span>
                            <StatusBadge status={lead.status} />
                          </div>
                          <button
                            onClick={() => confirmDelete(lead.id, dup.email)}
                            disabled={deletingId === lead.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold transition-colors border border-red-200 disabled:opacity-50"
                          >
                            {deletingId === lead.id
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              : <Trash2 className="w-3.5 h-3.5" />
                            }
                            Supprimer
                          </button>
                        </div>

                        {/* Card body */}
                        <div className="p-5">
                          {/* Activity counters */}
                          {lead._counts && (
                            <div className="grid grid-cols-4 gap-3 mb-4">
                              <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 text-center">
                                <div className="flex items-center justify-center gap-1 text-sky-600 mb-1"><MessageSquare className="w-3.5 h-3.5" /><span className="text-xs font-medium">Interactions</span></div>
                                <p className="text-xl font-black text-sky-700">{lead._counts.interactions}</p>
                              </div>
                              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                                <div className="flex items-center justify-center gap-1 text-blue-600 mb-1"><Mail className="w-3.5 h-3.5" /><span className="text-xs font-medium">Emails</span></div>
                                <p className="text-xl font-black text-blue-700">{lead._counts.emails}</p>
                              </div>
                              <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 text-center">
                                <div className="flex items-center justify-center gap-1 text-teal-600 mb-1"><FileText className="w-3.5 h-3.5" /><span className="text-xs font-medium">Documents</span></div>
                                <p className="text-xl font-black text-teal-700">{lead._counts.documents}</p>
                              </div>
                              <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-center">
                                <div className="flex items-center justify-center gap-1 text-orange-600 mb-1"><CheckCircle className="w-3.5 h-3.5" /><span className="text-xs font-medium">Devis</span></div>
                                <p className="text-xl font-black text-orange-700">{lead._counts.quotes}</p>
                              </div>
                            </div>
                          )}

                          {/* Info grid */}
                          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                            <div>
                              <p className="text-xs text-gray-400 font-medium mb-0.5">Nom complet</p>
                              <p className="font-semibold text-gray-900">{lead.full_name || <span className="text-gray-400 font-normal italic">Non renseigné</span>}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 font-medium mb-0.5">Téléphone</p>
                              <p className="font-semibold text-gray-900 flex items-center gap-1.5">
                                {lead.phone ? <><Phone className="w-3.5 h-3.5 text-gray-400" />{lead.phone}</> : <span className="text-gray-400 font-normal italic">Non renseigné</span>}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 font-medium mb-0.5">Ville</p>
                              <p className="font-semibold text-gray-900 flex items-center gap-1.5">
                                {lead.city ? <><MapPin className="w-3.5 h-3.5 text-gray-400" />{lead.city}</> : <span className="text-gray-400 font-normal italic">Non renseignée</span>}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 font-medium mb-0.5">Source</p>
                              <p className="font-semibold text-gray-900">{lead.source || <span className="text-gray-400 font-normal italic">Inconnue</span>}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 font-medium mb-0.5">Créé le</p>
                              <p className="font-semibold text-gray-900">{new Date(lead.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 font-medium mb-0.5">ID</p>
                              <p className="font-mono text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg inline-block">{lead.id.substring(0, 12)}...</p>
                            </div>
                          </div>

                          {lead.metadata?.submission_count && (
                            <div className="mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                              <p className="text-xs text-amber-800 font-medium">
                                Ce prospect a soumis le formulaire {lead.metadata.submission_count} fois
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info banner */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 bg-sky-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
            <Info className="w-4 h-4 text-sky-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 mb-2">Informations importantes</p>
            <ul className="text-xs text-gray-600 space-y-1.5">
              <li className="flex items-start gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" /><span>Les doublons sont autorisés pour ne pas bloquer les demandes de devis</span></li>
              <li className="flex items-start gap-2"><Shield className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" /><span>Seul le <strong>Master Admin</strong> peut supprimer des leads</span></li>
              <li className="flex items-start gap-2"><FileText className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" /><span>Toutes les suppressions sont tracées dans les logs d'audit</span></li>
              <li className="flex items-start gap-2"><X className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" /><span>Les suppressions retirent les données du lead et conservent un journal d'audit dédié</span></li>
            </ul>
          </div>
        </div>
      </div>

      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          confirmClass={confirm.confirmClass}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
