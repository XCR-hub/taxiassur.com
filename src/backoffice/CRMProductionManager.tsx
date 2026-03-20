import React, { useEffect, useState, useCallback } from 'react';
import {
  FileText, CheckCircle, Clock, CreditCard, PenTool, Upload,
  Search, RefreshCw, ChevronRight, User, Phone, Mail,
  AlertCircle, CheckSquare, XCircle, Eye, Calendar,
  Download, Shield, Layers, ListChecks,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

/* ── Types ──────────────────────────────────────────────────────── */
interface Lead {
  id: string;
  prenom?: string;
  nom?: string;
  email?: string;
  telephone?: string;
  pipeline_stage?: string;
  updated_at?: string;
  created_at?: string;
}

interface Doc {
  id: string;
  document_type?: string;
  file_name?: string;
  status?: string;
  validated?: boolean;
  created_at?: string;
  file_url?: string;
}

interface Sig {
  id: string;
  document_name?: string;
  status?: string;
  sent_at?: string;
  signed_at?: string;
}

interface Payment {
  id: string;
  amount?: number;
  currency?: string;
  status?: string;
  payment_method?: string;
  due_date?: string;
  created_at?: string;
}

interface Progress {
  overall: number;
  documents: { percentage: number; completed: number; total: number };
  signatures: { percentage: number; completed: number; total: number };
  payments: { percentage: number; completed: number; total: number };
}

const STAGES: { key: string; label: string; color: string }[] = [
  { key: 'all',                 label: 'Tous',              color: 'bg-gray-100 text-gray-700'   },
  { key: 'collecte_documents',  label: 'Collecte docs',     color: 'bg-amber-100 text-amber-700' },
  { key: 'validation_documents',label: 'Validation docs',   color: 'bg-blue-100 text-blue-700'   },
  { key: 'signature_devis',     label: 'Signature devis',   color: 'bg-violet-100 text-violet-700'},
  { key: 'paiement_rib',        label: 'Paiement / RIB',   color: 'bg-green-100 text-green-700' },
  { key: 'production',          label: 'En production',     color: 'bg-teal-100 text-teal-700'   },
];

const DOC_STATUS: Record<string, { icon: React.ElementType; cls: string; label: string }> = {
  validated: { icon: CheckCircle, cls: 'text-green-600',  label: 'Validé'     },
  pending:   { icon: Clock,       cls: 'text-amber-500',  label: 'En attente' },
  rejected:  { icon: XCircle,     cls: 'text-red-500',    label: 'Refusé'     },
};

const SIG_STATUS: Record<string, { cls: string; label: string }> = {
  signed:  { cls: 'bg-green-100 text-green-700',  label: 'Signé'      },
  opened:  { cls: 'bg-blue-100 text-blue-700',    label: 'Ouvert'     },
  sent:    { cls: 'bg-amber-100 text-amber-700',  label: 'Envoyé'     },
  expired: { cls: 'bg-red-100 text-red-700',      label: 'Expiré'     },
};

const PAY_STATUS: Record<string, { cls: string; label: string }> = {
  completed: { cls: 'bg-green-100 text-green-700',  label: 'Payé'      },
  paid:      { cls: 'bg-green-100 text-green-700',  label: 'Payé'      },
  pending:   { cls: 'bg-amber-100 text-amber-700',  label: 'En attente'},
  failed:    { cls: 'bg-red-100 text-red-700',      label: 'Échoué'    },
};

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-gray-100 rounded ${className}`} />;
}

function stageColor(stage?: string) {
  return STAGES.find(s => s.key === stage)?.color ?? 'bg-gray-100 text-gray-600';
}
function stageLabel(stage?: string) {
  return STAGES.find(s => s.key === stage)?.label ?? stage ?? '—';
}
function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtName(lead: Lead) {
  return [lead.prenom, lead.nom].filter(Boolean).join(' ') || lead.email || 'Sans nom';
}
function initials(lead: Lead) {
  const n = [lead.prenom, lead.nom].filter(Boolean).join(' ');
  if (n) return n.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (lead.email || '?')[0].toUpperCase();
}

function RingProgress({ pct, size = 56, stroke = 5, color = '#22c55e' }: { pct: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition: 'stroke-dasharray .7s ease' }} />
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════ */
export default function CRMProductionManager() {
  const [loading, setLoading]             = useState(true);
  const [leads, setLeads]                 = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead]   = useState<Lead | null>(null);
  const [documents, setDocuments]         = useState<Doc[]>([]);
  const [signatures, setSignatures]       = useState<Sig[]>([]);
  const [payments, setPayments]           = useState<Payment[]>([]);
  const [progress, setProgress]           = useState<Progress | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [stageFilter, setStageFilter]     = useState('all');
  const [search, setSearch]               = useState('');
  const [activeTab, setActiveTab]         = useState<'documents' | 'signatures' | 'payments'>('documents');

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('crm_leads')
        .select('id,prenom,nom,email,telephone,pipeline_stage,updated_at,created_at')
        .in('pipeline_stage', ['collecte_documents','validation_documents','signature_devis','paiement_rib','production'])
        .order('updated_at', { ascending: false });
      const rows = data || [];
      setLeads(rows);
      if (rows.length > 0 && !selectedLead) setSelectedLead(rows[0]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (leadId: string) => {
    setDetailLoading(true);
    try {
      const [docsRes, paysRes, sigsRes] = await Promise.all([
        supabase.from('crm_lead_documents').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }),
        supabase.from('monetico_payments').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }),
        supabase.from('crm_lead_signatures').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }),
      ]);

      const docs = docsRes.data || [];
      const pays = paysRes.data || [];
      const sigs = sigsRes.data || [];

      setDocuments(docs);
      setPayments(pays);
      setSignatures(sigs);

      const valDocs = docs.filter(d => d.validated || d.status === 'validated').length;
      const sigSigned = sigs.filter(s => s.status === 'signed').length;
      const payDone   = pays.filter(p => p.status === 'paid' || p.status === 'completed').length;

      const docPct = docs.length > 0 ? Math.round((valDocs / docs.length) * 100) : 0;
      const sigPct = sigs.length > 0 ? Math.round((sigSigned / sigs.length) * 100) : 0;
      const payPct = pays.length > 0 ? Math.round((payDone / pays.length) * 100) : 0;
      const counts = [docs.length > 0 ? docPct : null, sigs.length > 0 ? sigPct : null, pays.length > 0 ? payPct : null].filter(v => v !== null) as number[];
      const overall = counts.length > 0 ? Math.round(counts.reduce((a, b) => a + b, 0) / counts.length) : 0;

      setProgress({
        overall,
        documents:  { percentage: docPct, completed: valDocs,   total: docs.length },
        signatures: { percentage: sigPct, completed: sigSigned, total: sigs.length },
        payments:   { percentage: payPct, completed: payDone,   total: pays.length },
      });
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => { loadLeads(); }, [loadLeads]);
  useEffect(() => { if (selectedLead) loadDetail(selectedLead.id); }, [selectedLead, loadDetail]);

  /* ── Derived ── */
  const filtered = leads
    .filter(l => stageFilter === 'all' || l.pipeline_stage === stageFilter)
    .filter(l => {
      if (!search) return true;
      const q = search.toLowerCase();
      return fmtName(l).toLowerCase().includes(q) || (l.email || '').toLowerCase().includes(q);
    });

  const stats = {
    total:    leads.length,
    docs:     leads.filter(l => l.pipeline_stage === 'collecte_documents' || l.pipeline_stage === 'validation_documents').length,
    sigs:     leads.filter(l => l.pipeline_stage === 'signature_devis').length,
    payments: leads.filter(l => l.pipeline_stage === 'paiement_rib').length,
    prod:     leads.filter(l => l.pipeline_stage === 'production').length,
  };

  return (
    <div className="h-full overflow-hidden flex flex-col bg-gray-50">
      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Layers size={20} className="text-orange-500" /> Manager de Production
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Documents · Signatures · Paiements</p>
          </div>
          <button onClick={loadLeads} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors" title="Actualiser">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-5 gap-3 mt-4">
          {[
            { label: 'Total',         value: stats.total,    icon: ListChecks, color: 'text-gray-600',   bg: 'bg-gray-50'   },
            { label: 'Docs en att.', value: stats.docs,     icon: FileText,   color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Signatures',    value: stats.sigs,     icon: PenTool,    color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'Paiements',     value: stats.payments, icon: CreditCard, color: 'text-green-600',  bg: 'bg-green-50'  },
            { label: 'En prod.',      value: stats.prod,     icon: CheckCircle,color: 'text-teal-600',   bg: 'bg-teal-50'   },
          ].map(k => (
            <div key={k.label} className={`${k.bg} rounded-xl px-4 py-3 flex items-center gap-3`}>
              <k.icon size={18} className={k.color} />
              <div>
                <div className="text-xl font-bold text-gray-900 leading-none">{k.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
              </div>
            </div>
          ))}
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex-1 overflow-hidden flex min-h-0">

        {/* ── Left panel: lead list ── */}
        <aside className="w-72 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
          {/* Search + filter */}
          <div className="p-3 border-b border-gray-100 space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher…"
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
            </div>
            <div className="flex flex-wrap gap-1">
              {STAGES.map(s => (
                <button key={s.key} onClick={() => setStageFilter(s.key)}
                  className={`text-xs px-2 py-1 rounded-full font-medium transition-all ${stageFilter === s.key ? 'bg-orange-500 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="p-3 rounded-lg border border-gray-100 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Upload size={32} className="mb-2 opacity-40" />
                <p className="text-sm">Aucun dossier</p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filtered.map(lead => {
                  const active = selectedLead?.id === lead.id;
                  return (
                    <button key={lead.id} onClick={() => setSelectedLead(lead)}
                      className={`w-full text-left p-3 rounded-xl transition-all group ${active ? 'bg-orange-50 border border-orange-200 shadow-sm' : 'border border-transparent hover:bg-gray-50 hover:border-gray-200'}`}>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${active ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                          {initials(lead)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-semibold truncate ${active ? 'text-orange-900' : 'text-gray-900'}`}>{fmtName(lead)}</div>
                          <div className="text-xs text-gray-500 truncate">{lead.email}</div>
                        </div>
                        {active && <ChevronRight size={14} className="text-orange-400 flex-shrink-0" />}
                      </div>
                      <div className="mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stageColor(lead.pipeline_stage)}`}>
                          {stageLabel(lead.pipeline_stage)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* ── Right panel: detail ── */}
        <main className="flex-1 overflow-y-auto p-5 min-w-0">
          {!selectedLead ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Upload size={48} className="mb-3 opacity-30" />
              <p className="text-base font-medium">Sélectionnez un dossier</p>
              <p className="text-sm mt-1">Cliquez sur un lead à gauche pour voir ses détails</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-5">

              {/* ── Lead header card ── */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-lg flex-shrink-0">
                      {initials(selectedLead)}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{fmtName(selectedLead)}</h2>
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        {selectedLead.email && (
                          <span className="flex items-center gap-1 text-sm text-gray-500">
                            <Mail size={13} /> {selectedLead.email}
                          </span>
                        )}
                        {selectedLead.telephone && (
                          <span className="flex items-center gap-1 text-sm text-gray-500">
                            <Phone size={13} /> {selectedLead.telephone}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Calendar size={11} /> Mis à jour {fmtDate(selectedLead.updated_at)}
                        </span>
                      </div>
                      <div className="mt-2">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${stageColor(selectedLead.pipeline_stage)}`}>
                          {stageLabel(selectedLead.pipeline_stage)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ring progress */}
                  {progress && !detailLoading && (
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="relative">
                        <RingProgress pct={progress.overall} size={64} stroke={6} color="#f97316" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-bold text-gray-900">{progress.overall}%</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 leading-relaxed">
                        Progression<br />globale
                      </div>
                    </div>
                  )}
                </div>

                {/* Mini progress bars */}
                {progress && !detailLoading && (
                  <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-gray-100">
                    {[
                      { label: 'Documents',  pct: progress.documents.percentage,  done: progress.documents.completed,  total: progress.documents.total,  color: 'bg-amber-500',  ring: '#f59e0b' },
                      { label: 'Signatures', pct: progress.signatures.percentage, done: progress.signatures.completed, total: progress.signatures.total, color: 'bg-violet-500', ring: '#8b5cf6' },
                      { label: 'Paiements',  pct: progress.payments.percentage,   done: progress.payments.completed,   total: progress.payments.total,   color: 'bg-green-500',  ring: '#22c55e' },
                    ].map(m => (
                      <div key={m.label} className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-gray-700">{m.label}</span>
                          <span className="text-xs text-gray-500">{m.done}/{m.total}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div className={`h-1.5 rounded-full transition-all duration-700 ${m.color}`} style={{ width: `${m.pct}%` }} />
                        </div>
                        <div className="text-xs font-semibold" style={{ color: m.ring }}>{m.pct}%</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Tabs ── */}
              <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-1">
                {[
                  { key: 'documents' as const,  label: 'Documents',  icon: FileText,   count: documents.length   },
                  { key: 'signatures' as const, label: 'Signatures', icon: PenTool,    count: signatures.length  },
                  { key: 'payments' as const,   label: 'Paiements',  icon: CreditCard, count: payments.length    },
                ].map(t => (
                  <button key={t.key} onClick={() => setActiveTab(t.key)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === t.key ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <t.icon size={15} />
                    {t.label}
                    <span className={`text-xs font-bold rounded-full px-1.5 ${activeTab === t.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {t.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* ── Tab content ── */}
              {detailLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {/* Documents tab */}
                  {activeTab === 'documents' && (
                    <div className="space-y-2">
                      {documents.length === 0 ? (
                        <EmptyState icon={FileText} text="Aucun document" />
                      ) : documents.map(doc => {
                        const st = doc.validated ? DOC_STATUS.validated : DOC_STATUS[doc.status || 'pending'] || DOC_STATUS.pending;
                        const Icon = st.icon;
                        return (
                          <div key={doc.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                            <div className={`w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0`}>
                              <FileText size={16} className="text-gray-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 text-sm truncate">
                                {doc.file_name || doc.document_type?.replace(/_/g, ' ') || 'Document'}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                                <span>{fmtDate(doc.created_at)}</span>
                                {doc.document_type && <span className="text-gray-400">·</span>}
                                {doc.document_type && <span className="capitalize">{doc.document_type.replace(/_/g, ' ')}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`flex items-center gap-1 text-xs font-medium ${st.cls}`}>
                                <Icon size={13} /> {st.label}
                              </span>
                              {doc.file_url && (
                                <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                                  <Eye size={14} />
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Signatures tab */}
                  {activeTab === 'signatures' && (
                    <div className="space-y-2">
                      {signatures.length === 0 ? (
                        <EmptyState icon={PenTool} text="Aucune signature en cours" />
                      ) : signatures.map(sig => {
                        const st = SIG_STATUS[sig.status || ''] || { cls: 'bg-gray-100 text-gray-600', label: sig.status || '—' };
                        return (
                          <div key={sig.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                            <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                              <PenTool size={16} className="text-violet-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 text-sm">{sig.document_name || 'Document à signer'}</div>
                              <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                                <span>Envoyé le {fmtDate(sig.sent_at)}</span>
                                {sig.signed_at && <><span className="text-gray-400">·</span><span className="text-green-600">Signé le {fmtDate(sig.signed_at)}</span></>}
                              </div>
                            </div>
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.cls}`}>{st.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Payments tab */}
                  {activeTab === 'payments' && (
                    <div className="space-y-2">
                      {payments.length === 0 ? (
                        <EmptyState icon={CreditCard} text="Aucun paiement enregistré" />
                      ) : payments.map(pay => {
                        const st = PAY_STATUS[pay.status || ''] || { cls: 'bg-gray-100 text-gray-600', label: pay.status || '—' };
                        return (
                          <div key={pay.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                              <CreditCard size={16} className="text-green-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-gray-900 text-base">
                                {pay.amount != null ? `${Number(pay.amount).toLocaleString('fr-FR')} ${pay.currency || 'EUR'}` : '—'}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                                {pay.payment_method && <span className="capitalize">{pay.payment_method}</span>}
                                {pay.due_date && <><span className="text-gray-400">·</span><span>Échéance {fmtDate(pay.due_date)}</span></>}
                                {pay.created_at && <><span className="text-gray-400">·</span><span>{fmtDate(pay.created_at)}</span></>}
                              </div>
                            </div>
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.cls}`}>{st.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="bg-white rounded-xl border border-dashed border-gray-200 py-12 flex flex-col items-center text-gray-400">
      <Icon size={32} className="mb-2 opacity-30" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
