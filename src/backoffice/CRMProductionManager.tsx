import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  FileText, CheckCircle, Clock, CreditCard, PenTool, Upload,
  Search, RefreshCw, ChevronRight, Phone, Mail,
  XCircle, Eye, Calendar, Layers, ListChecks, Building2,
  TrendingUp, Users, Euro, FileCheck,
} from 'lucide-react';
import { nativeAdminInsuranceCompanies, nativeAdminLeads, nativeAdminLeadSummary } from '@/lib/native-admin-data';

interface Lead {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  pipeline_stage?: string;
  status?: string;
  vehicle_type?: string;
  updated_at?: string;
  created_at?: string;
  doc_count?: number;
  doc_validated?: number;
  quote_count?: number;
  quote_validated?: number;
  payment_count?: number;
  payment_success?: number;
}

interface Doc {
  id: string;
  document_type?: string;
  file_name?: string;
  status?: string;
  validated_at?: string;
  created_at?: string;
  file_url?: string;
  custom_label?: string;
}

interface Quote {
  id: string;
  status?: string;
  quote_amount?: number;
  created_at?: string;
  sent_at?: string;
  validated_at?: string;
  quote_accepted_at?: string;
  refused_at?: string;
  insurance_companies?: { name: string; logo_url?: string | null } | null;
}

interface Payment {
  id: string;
  amount?: number;
  currency?: string;
  status?: string;
  card_type?: string;
  card_last4?: string;
  payment_date?: string;
  created_at?: string;
  description?: string;
  reference?: string;
}

const PIPELINE_STAGES: { key: string; label: string; color: string; bg: string }[] = [
  { key: 'all',                  label: 'Tous',               color: 'text-gray-700',   bg: 'bg-gray-100' },
  { key: 'collecte_documents',   label: 'Collecte docs',      color: 'text-amber-700',  bg: 'bg-amber-100' },
  { key: 'saisie_devis',         label: 'Saisie devis',       color: 'text-blue-700',   bg: 'bg-blue-100' },
  { key: 'signature_devis',      label: 'Signature devis',    color: 'text-cyan-700',   bg: 'bg-cyan-100' },
  { key: 'contrat_signature',    label: 'Contrat/Signature',  color: 'text-teal-700',   bg: 'bg-teal-100' },
];

const STATUS_LABELS: Record<string, string> = {
  NOUVEAU_LEAD: 'Nouveau lead',
  COLLECTE_DOCUMENTS: 'Collecte docs',
  DEVIS: 'Devis',
  CONTRAT_SIGNATURE: 'Contrat',
  CLIENT_ACTIF: 'Client actif',
  RELANCE: 'Relance',
  PERDU: 'Perdu',
  RECONTACT_PROGRAMME: 'Recontact',
};

const STATUS_COLORS: Record<string, string> = {
  NOUVEAU_LEAD: 'bg-gray-100 text-gray-700',
  COLLECTE_DOCUMENTS: 'bg-amber-100 text-amber-700',
  DEVIS: 'bg-blue-100 text-blue-700',
  CONTRAT_SIGNATURE: 'bg-teal-100 text-teal-700',
  CLIENT_ACTIF: 'bg-emerald-100 text-emerald-700',
  RELANCE: 'bg-orange-100 text-orange-700',
  PERDU: 'bg-red-100 text-red-700',
  RECONTACT_PROGRAMME: 'bg-sky-100 text-sky-700',
};

const DOC_STATUS_MAP: Record<string, { cls: string; label: string; icon: typeof CheckCircle }> = {
  validated: { cls: 'text-emerald-600', label: 'Valide', icon: CheckCircle },
  pending:   { cls: 'text-amber-500',   label: 'En attente', icon: Clock },
  rejected:  { cls: 'text-red-500',     label: 'Refuse', icon: XCircle },
};

const QUOTE_STATUS_MAP: Record<string, { cls: string; label: string }> = {
  validated:        { cls: 'bg-emerald-100 text-emerald-700', label: 'Valide' },
  quote_submitted:  { cls: 'bg-blue-100 text-blue-700',      label: 'Soumis' },
  pending:          { cls: 'bg-amber-100 text-amber-700',    label: 'En attente' },
  refused:          { cls: 'bg-red-100 text-red-700',         label: 'Refuse' },
};

const PAY_STATUS_MAP: Record<string, { cls: string; label: string }> = {
  success:   { cls: 'bg-emerald-100 text-emerald-700', label: 'Paye' },
  pending:   { cls: 'bg-amber-100 text-amber-700',     label: 'En attente' },
  cancelled: { cls: 'bg-red-100 text-red-700',          label: 'Annule' },
  failed:    { cls: 'bg-red-100 text-red-700',          label: 'Echoue' },
};

function fmtDate(d?: string | null) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtName(lead: Lead) {
  return [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.email || 'Sans nom';
}
function initials(lead: Lead) {
  const n = [lead.first_name, lead.last_name].filter(Boolean).join(' ');
  if (n) return n.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (lead.email || '?')[0].toUpperCase();
}
function fmtAmount(n?: number | null) {
  if (!n) return '-';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}
function stageLabel(stage?: string) {
  return PIPELINE_STAGES.find(s => s.key === stage)?.label ?? stage ?? '-';
}
function stageColors(stage?: string) {
  const s = PIPELINE_STAGES.find(s => s.key === stage);
  return s ? `${s.bg} ${s.color}` : 'bg-gray-100 text-gray-600';
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

export default function CRMProductionManager() {
  const [loading, setLoading]             = useState(true);
  const [leads, setLeads]                 = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead]   = useState<Lead | null>(null);
  const [documents, setDocuments]         = useState<Doc[]>([]);
  const [quotes, setQuotes]               = useState<Quote[]>([]);
  const [payments, setPayments]           = useState<Payment[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [stageFilter, setStageFilter]     = useState('all');
  const [search, setSearch]               = useState('');
  const [activeTab, setActiveTab]         = useState<'documents' | 'quotes' | 'payments'>('documents');

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const { leads: allLeads = [] } = await nativeAdminLeads() as any;
      const data = allLeads
        .filter(lead => lead.status !== 'PERDU')
        .sort((a, b) => Date.parse(b.updated_at || b.created_at || '') - Date.parse(a.updated_at || a.created_at || ''));

      const rows = (data || []).filter(l =>
        l.pipeline_stage !== 'nouveau_lead' || ['DEVIS', 'COLLECTE_DOCUMENTS', 'CLIENT_ACTIF', 'RECONTACT_PROGRAMME', 'RELANCE'].includes(l.status || '')
      );
      setLeads(rows);
      if (rows.length > 0 && !selectedLead) setSelectedLead(rows[0]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (leadId: string) => {
    setDetailLoading(true);
    try {
      const [detail, companiesResult] = await Promise.all([
        nativeAdminLeadSummary(leadId) as Promise<any>,
        nativeAdminInsuranceCompanies() as Promise<any>,
      ]);
      const summary = detail.summary || {};
      const companies = companiesResult.companies || [];
      const companyById = new Map(companies.map((company: any) => [String(company.id), company]));
      setDocuments((summary.documents || []).sort((a, b) => Date.parse(b.created_at || b.upload_date || '') - Date.parse(a.created_at || a.upload_date || '')));
      setQuotes((summary.quotes || []).map((quote: any) => ({
        ...quote,
        insurance_companies: quote.insurance_companies || companyById.get(String(quote.company_id || quote.insurance_company_id || '')) || null,
      })).sort((a, b) => Date.parse(b.created_at || '') - Date.parse(a.created_at || '')));
      setPayments((summary.payments || []).sort((a, b) => Date.parse(b.created_at || b.payment_date || '') - Date.parse(a.created_at || a.payment_date || '')));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => { loadLeads(); }, [loadLeads]);
  useEffect(() => { if (selectedLead) loadDetail(selectedLead.id); }, [selectedLead, loadDetail]);

  const filtered = useMemo(() => leads
    .filter(l => stageFilter === 'all' || l.pipeline_stage === stageFilter)
    .filter(l => {
      if (!search) return true;
      const q = search.toLowerCase();
      return fmtName(l).toLowerCase().includes(q) || (l.email || '').toLowerCase().includes(q) || (l.phone || '').includes(q);
    }), [leads, stageFilter, search]);

  const globalStats = useMemo(() => ({
    total: leads.length,
    collecte: leads.filter(l => l.pipeline_stage === 'collecte_documents').length,
    devis: leads.filter(l => l.pipeline_stage === 'saisie_devis' || l.pipeline_stage === 'signature_devis').length,
    contrat: leads.filter(l => l.pipeline_stage === 'contrat_signature').length,
    actifs: leads.filter(l => l.status === 'CLIENT_ACTIF').length,
  }), [leads]);

  const detailStats = useMemo(() => {
    const docTotal = documents.length;
    const docValid = documents.filter(d => d.status === 'validated').length;
    const quoteTotal = quotes.length;
    const quoteValid = quotes.filter(q => q.status === 'validated').length;
    const payTotal = payments.length;
    const paySuccess = payments.filter(p => p.status === 'success').length;

    const docPct = docTotal > 0 ? Math.round((docValid / docTotal) * 100) : 0;
    const quotePct = quoteTotal > 0 ? Math.round((quoteValid / quoteTotal) * 100) : 0;
    const payPct = payTotal > 0 ? Math.round((paySuccess / payTotal) * 100) : 0;

    const parts = [
      docTotal > 0 ? docPct : null,
      quoteTotal > 0 ? quotePct : null,
      payTotal > 0 ? payPct : null,
    ].filter(v => v !== null) as number[];
    const overall = parts.length > 0 ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : 0;

    return {
      overall,
      documents: { pct: docPct, done: docValid, total: docTotal },
      quotes: { pct: quotePct, done: quoteValid, total: quoteTotal },
      payments: { pct: payPct, done: paySuccess, total: payTotal },
    };
  }, [documents, quotes, payments]);

  return (
    <div className="h-full overflow-hidden flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Layers size={20} className="text-orange-500" /> Manager de Production
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Documents, devis, paiements - suivi en temps reel</p>
          </div>
          <button onClick={loadLeads} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors" title="Actualiser">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="grid grid-cols-5 gap-3 mt-4">
          {[
            { label: 'Dossiers actifs', value: globalStats.total,     icon: Users,       color: 'text-gray-600',   bg: 'bg-gray-50' },
            { label: 'Collecte docs',   value: globalStats.collecte,  icon: FileText,    color: 'text-amber-600',  bg: 'bg-amber-50' },
            { label: 'Devis en cours',  value: globalStats.devis,     icon: FileCheck,   color: 'text-blue-600',   bg: 'bg-blue-50' },
            { label: 'Contrats',        value: globalStats.contrat,   icon: PenTool,     color: 'text-teal-600',   bg: 'bg-teal-50' },
            { label: 'Clients actifs',  value: globalStats.actifs,    icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
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

      <div className="flex-1 overflow-hidden flex min-h-0">
        <aside className="w-72 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-gray-100 space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
            </div>
            <div className="flex flex-wrap gap-1">
              {PIPELINE_STAGES.map(s => (
                <button key={s.key} onClick={() => setStageFilter(s.key)}
                  className={`text-xs px-2 py-1 rounded-full font-medium transition-all ${stageFilter === s.key ? 'bg-orange-500 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="p-3 rounded-lg border border-gray-100 space-y-2">
                    <div className="animate-pulse bg-gray-100 rounded h-4 w-3/4" />
                    <div className="animate-pulse bg-gray-100 rounded h-3 w-1/2" />
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
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stageColors(lead.pipeline_stage)}`}>
                          {stageLabel(lead.pipeline_stage)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[lead.status || ''] || 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[lead.status || ''] || lead.status}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-5 min-w-0">
          {!selectedLead ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Upload size={48} className="mb-3 opacity-30" />
              <p className="text-base font-medium">Selectionnez un dossier</p>
              <p className="text-sm mt-1">Cliquez sur un lead a gauche pour voir ses details</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-5">
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
                        {selectedLead.phone && selectedLead.phone !== '0000000000' && (
                          <span className="flex items-center gap-1 text-sm text-gray-500">
                            <Phone size={13} /> {selectedLead.phone}
                          </span>
                        )}
                        {selectedLead.vehicle_type && (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{selectedLead.vehicle_type}</span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${stageColors(selectedLead.pipeline_stage)}`}>
                          {stageLabel(selectedLead.pipeline_stage)}
                        </span>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[selectedLead.status || ''] || 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[selectedLead.status || ''] || selectedLead.status}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Calendar size={11} /> {fmtDate(selectedLead.updated_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {!detailLoading && (
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="relative">
                        <RingProgress pct={detailStats.overall} size={64} stroke={6} color="#f97316" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-bold text-gray-900">{detailStats.overall}%</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 leading-relaxed">
                        Progression<br />globale
                      </div>
                    </div>
                  )}
                </div>

                {!detailLoading && (
                  <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-gray-100">
                    {[
                      { label: 'Documents', pct: detailStats.documents.pct, done: detailStats.documents.done, total: detailStats.documents.total, color: 'bg-amber-500', ring: '#f59e0b' },
                      { label: 'Devis',     pct: detailStats.quotes.pct,    done: detailStats.quotes.done,    total: detailStats.quotes.total,    color: 'bg-blue-500',  ring: '#3b82f6' },
                      { label: 'Paiements', pct: detailStats.payments.pct,  done: detailStats.payments.done,  total: detailStats.payments.total,  color: 'bg-emerald-500', ring: '#22c55e' },
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

              <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-1">
                {[
                  { key: 'documents' as const, label: 'Documents',  icon: FileText,   count: documents.length },
                  { key: 'quotes' as const,    label: 'Devis',      icon: FileCheck,  count: quotes.length },
                  { key: 'payments' as const,  label: 'Paiements',  icon: CreditCard, count: payments.length },
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

              {detailLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
                      <div className="animate-pulse bg-gray-100 rounded h-4 w-1/2" />
                      <div className="animate-pulse bg-gray-100 rounded h-3 w-1/3" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {activeTab === 'documents' && (
                    <div className="space-y-2">
                      {documents.length === 0 ? (
                        <EmptyState icon={FileText} text="Aucun document" />
                      ) : documents.map(doc => {
                        const st = DOC_STATUS_MAP[doc.status || 'pending'] || DOC_STATUS_MAP.pending;
                        const Icon = st.icon;
                        return (
                          <div key={doc.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 hover:border-gray-300 transition-colors">
                            <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                              <FileText size={16} className="text-gray-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 text-sm truncate">
                                {doc.custom_label || doc.file_name || doc.document_type?.replace(/_/g, ' ') || 'Document'}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                                <span>{fmtDate(doc.created_at)}</span>
                                {doc.document_type && <span className="text-gray-400">-</span>}
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

                  {activeTab === 'quotes' && (
                    <div className="space-y-2">
                      {quotes.length === 0 ? (
                        <EmptyState icon={FileCheck} text="Aucun devis" />
                      ) : quotes.map(q => {
                        const st = QUOTE_STATUS_MAP[q.status || 'pending'] || QUOTE_STATUS_MAP.pending;
                        return (
                          <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 hover:border-gray-300 transition-colors">
                            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {q.insurance_companies?.logo_url ? (
                                <img src={q.insurance_companies.logo_url} alt="" className="w-full h-full object-contain p-1" />
                              ) : (
                                <Building2 size={16} className="text-blue-500" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 text-sm">
                                {q.insurance_companies?.name || 'Compagnie'}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                                <span>Cree le {fmtDate(q.created_at)}</span>
                                {q.quote_accepted_at && (
                                  <>
                                    <span className="text-gray-400">-</span>
                                    <span className="text-emerald-600 font-medium">Accepte le {fmtDate(q.quote_accepted_at)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              {q.quote_amount && Number(q.quote_amount) > 0 && (
                                <span className="text-sm font-bold text-gray-900">{fmtAmount(Number(q.quote_amount))}</span>
                              )}
                              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.cls}`}>{st.label}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {activeTab === 'payments' && (
                    <div className="space-y-2">
                      {payments.length === 0 ? (
                        <EmptyState icon={CreditCard} text="Aucun paiement enregistre" />
                      ) : payments.map(pay => {
                        const st = PAY_STATUS_MAP[pay.status || ''] || { cls: 'bg-gray-100 text-gray-600', label: pay.status || '-' };
                        return (
                          <div key={pay.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 hover:border-gray-300 transition-colors">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${pay.status === 'success' ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                              <CreditCard size={16} className={pay.status === 'success' ? 'text-emerald-500' : 'text-gray-500'} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-gray-900 text-base">
                                {fmtAmount(pay.amount)}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                                {pay.card_type && (
                                  <span className="capitalize">{pay.card_type}{pay.card_last4 ? ` ****${pay.card_last4}` : ''}</span>
                                )}
                                {pay.reference && (
                                  <>
                                    <span className="text-gray-400">-</span>
                                    <span className="font-mono text-gray-400">{pay.reference}</span>
                                  </>
                                )}
                                <span className="text-gray-400">-</span>
                                <span>{fmtDate(pay.payment_date || pay.created_at)}</span>
                              </div>
                              {pay.description && (
                                <p className="text-xs text-gray-400 mt-0.5 truncate">{pay.description}</p>
                              )}
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
