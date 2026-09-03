import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, Send, Mail, Phone, FileText,
  Check, Loader2, ArrowLeft, Copy,
  RefreshCw, Clock, CheckCircle2, XCircle,
  Search, ReceiptText, ChevronRight, AlertCircle,
  Banknote, Hash, Layers, Zap, ChevronDown, ChevronUp,
  ExternalLink, AlertTriangle,
} from 'lucide-react';
import { nativeAdminCreateMoneticoPayment, nativeAdminInvoicing, nativeAdminLeads, nativeAdminQueuePaymentEmail } from '@/lib/native-admin-data';
import { withTimeout } from '@/lib/promise-timeout';
import { clearPaymentRequestId, getPaymentRequestId } from '@/lib/payment-idempotency';
import { Link } from 'react-router-dom';

/* ─────────────── Types ─────────────────────────────────────── */
interface InvoiceForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  amount: string;
  description: string;
  reference: string;
  leadId: string | null;
}

interface Payment {
  id: string;
  reference: string;
  payment_reference: string;
  amount: number;
  currency: string;
  status: string;
  customer_name?: string;
  customer_email?: string;
  description?: string;
  lead_id?: string | null;
  created_at: string;
  paid_at?: string | null;
}

interface AdvancedLead {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  status: string;
  pipeline_stage: string | null;
  city: string | null;
  company_name: string | null;
  created_at: string;
  payments?: Payment[];
}

/* ─────────────── Constants ─────────────────────────────────── */
const EMPTY_FORM: InvoiceForm = {
  firstName: '', lastName: '', email: '', phone: '',
  amount: '', description: '', reference: '', leadId: null,
};

const ADVANCED_STATUSES = [
  'devis_envoye', 'validation_devis_prospect', 'signature_en_attente',
  'signe', 'paiement_rib_en_attente', 'paiement_comptant_requis',
  'client_actif',
];
const ADVANCED_PIPELINE = [
  'saisie_devis', 'validation_devis_prospect', 'signature_devis',
  'paiement_rib', 'contrat_signature',
];

const STATUS_LABELS: Record<string, string> = {
  nouveau_lead: 'Nouveau',
  contact_tente: 'Contact tenté',
  contact_confirme: 'Contact confirmé',
  documents_requis: 'Docs requis',
  documents_partiels: 'Docs partiels',
  pret_pour_devis: 'Prêt pour devis',
  devis_envoye: 'Devis envoyé',
  validation_devis_prospect: 'Validation devis',
  signature_en_attente: 'Signature att.',
  signe: 'Signé',
  paiement_rib_en_attente: 'RIB att.',
  paiement_comptant_requis: 'Paiement requis',
  client_actif: 'Client actif',
  perdu: 'Perdu',
  archive: 'Archivé',
};

const STAGE_LABELS: Record<string, string> = {
  saisie_devis: 'Saisie devis',
  validation_devis_prospect: 'Validation devis',
  signature_devis: 'Signature',
  paiement_rib: 'Paiement RIB',
  contrat_signature: 'Contrat signé',
};

const STATUS_PAY: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  pending:   { label: 'En attente', cls: 'bg-amber-100 text-amber-700 border border-amber-200', icon: Clock },
  sent:      { label: 'Envoyé',     cls: 'bg-blue-100 text-blue-700 border border-blue-200',    icon: Send },
  paid:      { label: 'Payé',       cls: 'bg-green-100 text-green-700 border border-green-200', icon: CheckCircle2 },
  failed:    { label: 'Échoué',     cls: 'bg-red-100 text-red-700 border border-red-200',        icon: XCircle },
  cancelled: { label: 'Annulé',     cls: 'bg-gray-100 text-gray-600 border border-gray-200',     icon: XCircle },
};

/* ─────────────── Sub-components ────────────────────────────── */
function PayBadge({ status }: { status: string }) {
  const cfg = STATUS_PAY[status] ?? STATUS_PAY.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.cls}`}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

function LeadStagePill({ status, stage }: { status: string; stage?: string | null }) {
  const label = stage ? (STAGE_LABELS[stage] ?? stage) : (STATUS_LABELS[status] ?? status);
  const isPayment = ['paiement_rib_en_attente', 'paiement_comptant_requis'].includes(status) ||
    ['paiement_rib', 'contrat_signature'].includes(stage ?? '');
  const isSign = ['signe', 'signature_en_attente', 'signature_devis'].includes(status + (stage ?? ''));
  const cls = isPayment
    ? 'bg-orange-100 text-orange-700 border border-orange-200'
    : isSign
    ? 'bg-purple-100 text-purple-700 border border-purple-200'
    : 'bg-sky-100 text-sky-700 border border-sky-200';
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}

/* ─────────────── Main component ────────────────────────────── */
export default function FreeInvoicing() {
  const [tab, setTab] = useState<'dossiers' | 'libre'>('dossiers');
  const [form, setForm] = useState<InvoiceForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [sendEmail, setSendEmail] = useState(true);
  const [emailSent, setEmailSent] = useState(false);
  const [lastClientEmail, setLastClientEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [advancedLeads, setAdvancedLeads] = useState<AdvancedLead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadSearch, setLeadSearch] = useState('');
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const [leadPayAmount, setLeadPayAmount] = useState('');
  const [leadPayDesc, setLeadPayDesc] = useState('');
  const [leadPayLoading, setLeadPayLoading] = useState<string | null>(null);
  const [leadPaySuccess, setLeadPaySuccess] = useState<{ leadId: string; url: string } | null>(null);
  const [leadPayCopied, setLeadPayCopied] = useState(false);

  const loadPayments = useCallback(async () => {
    setHistLoading(true);
    try {
      const { payments = [] } = await nativeAdminInvoicing() as any;
      setPayments(payments.slice(0, 100) as Payment[]);
    } finally {
      setHistLoading(false);
    }
  }, []);

  const loadAdvancedLeads = useCallback(async () => {
    setLeadsLoading(true);
    try {
      const { leads = [] } = await nativeAdminLeads() as any;
      const data = leads.filter((lead: any) => !lead.deleted_at && (ADVANCED_STATUSES.includes(lead.status) || ADVANCED_PIPELINE.includes(lead.pipeline_stage)))
        .sort((a: any, b: any) => Date.parse(b.updated_at || b.created_at || '') - Date.parse(a.updated_at || a.created_at || ''))
        .slice(0, 200);
      setAdvancedLeads(data as AdvancedLead[]);
    } finally {
      setLeadsLoading(false);
    }
  }, []);

  useEffect(() => { loadPayments(); loadAdvancedLeads(); }, [loadPayments, loadAdvancedLeads]);

  /* Stats */
  const freePayments = payments.filter(p => !p.lead_id);
  const linkedPayments = payments.filter(p => !!p.lead_id);
  const stats = {
    dossiers: advancedLeads.length,
    freePending: freePayments.filter(p => p.status === 'pending').length,
    paid: payments.filter(p => p.status === 'paid').length,
    revenue: payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount ?? 0), 0),
  };

  /* Payments per lead for display */
  const paymentsByLead = payments.reduce<Record<string, Payment[]>>((acc, p) => {
    if (p.lead_id) { (acc[p.lead_id] ??= []).push(p); }
    return acc;
  }, {});

  /* Filtered free payments */
  const filteredFree = freePayments.filter(p => {
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || (p.customer_name ?? '').toLowerCase().includes(q)
      || (p.customer_email ?? '').toLowerCase().includes(q)
      || (p.reference ?? p.payment_reference ?? '').toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  /* Filtered advanced leads */
  const filteredLeads = advancedLeads.filter(l => {
    if (!leadSearch) return true;
    const q = leadSearch.toLowerCase();
    return (l.first_name ?? '').toLowerCase().includes(q)
      || (l.last_name ?? '').toLowerCase().includes(q)
      || l.email.toLowerCase().includes(q)
      || (l.phone ?? '').includes(q)
      || (l.company_name ?? '').toLowerCase().includes(q);
  });

  /* Helpers */
  const handleChange = (field: keyof InvoiceForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));

  const fmtDate = (d: string) =>
    new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const leadName = (l: AdvancedLead) =>
    [l.first_name, l.last_name].filter(Boolean).join(' ') || l.email;

  /* Free payment submit */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setLoading(true);
    setPaymentLink(null);
    setEmailSent(false);
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      setFormError('Le montant doit être supérieur à 0.');
      setLoading(false);
      return;
    }
    try {
      const paymentSignature = JSON.stringify({ leadId: form.leadId, amount: amount.toFixed(2), email: form.email.trim().toLowerCase(), description: form.description.trim() });
      const paymentRequestId = getPaymentRequestId(paymentSignature);
      const data = await withTimeout(nativeAdminCreateMoneticoPayment({
          amount, lead_id: form.leadId ?? undefined,
          description: form.description || `Paiement ${form.firstName} ${form.lastName}`,
          customerEmail: form.email, customerFirstName: form.firstName,
          customerLastName: form.lastName, customerPhone: form.phone,
          requestId: paymentRequestId,
      }), 45_000) as any;
      if (data?.ok && data?.reference && /^[0-9a-f]{64}$/i.test(data.paymentAccessToken || '')) {
        const url = `${window.location.origin}/paiement/${encodeURIComponent(data.reference)}?token=${encodeURIComponent(data.paymentAccessToken)}`;
        clearPaymentRequestId(paymentSignature);
        setPaymentLink(url);
        setLastClientEmail(form.email);
        if (sendEmail && form.email) {
          try {
            await nativeAdminQueuePaymentEmail(data.payment.id);
            setEmailSent(true);
          } catch {
            setFormError("Lien créé, mais l'email n'a pas pu être envoyé. Copiez le lien.");
          }
        }
        setForm(EMPTY_FORM);
        loadPayments();
      } else throw new Error(data?.error ?? 'Réponse inattendue');
    } catch (err) {
      setFormError(err.message ?? 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  /* Lead payment submit */
  const handleLeadPayment = async (lead: AdvancedLead) => {
    const amount = parseFloat(leadPayAmount);
    if (isNaN(amount) || amount <= 0) return;
    setLeadPayLoading(lead.id);
    try {
      const paymentSignature = JSON.stringify({ leadId: lead.id, amount: amount.toFixed(2), description: leadPayDesc.trim() });
      const paymentRequestId = getPaymentRequestId(paymentSignature);
      const data = await withTimeout(nativeAdminCreateMoneticoPayment({
          amount, lead_id: lead.id,
          description: leadPayDesc || `Paiement assurance taxi - ${leadName(lead)}`,
          customerEmail: lead.email,
          customerFirstName: lead.first_name ?? '',
          customerLastName: lead.last_name ?? '',
          customerPhone: lead.phone ?? '', requestId: paymentRequestId,
      }), 45_000) as any;
      if (data?.ok && data?.reference && /^[0-9a-f]{64}$/i.test(data.paymentAccessToken || '')) {
        const url = `${window.location.origin}/paiement/${encodeURIComponent(data.reference)}?token=${encodeURIComponent(data.paymentAccessToken)}`;
        clearPaymentRequestId(paymentSignature);
        if (sendEmail && lead.email) {
          await nativeAdminQueuePaymentEmail(data.payment.id);
        }
        setLeadPaySuccess({ leadId: lead.id, url });
        setLeadPayAmount('');
        setLeadPayDesc('');
        loadPayments();
        loadAdvancedLeads();
      }
    } catch {
      /* silent */
    } finally {
      setLeadPayLoading(null);
    }
  };

  const handleCopy = (url: string, cb: (v: boolean) => void) => {
    navigator.clipboard.writeText(url);
    cb(true);
    setTimeout(() => cb(false), 2000);
  };

  const inputCls = 'w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:bg-white transition-all';
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide';

  return (
    <div className="h-full overflow-hidden">
      <main className="h-full bg-slate-100 overflow-y-auto">

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center gap-4 sticky top-0 z-10">
          <Link to="/backoffice" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>
          <ChevronRight className="w-4 h-4 text-gray-300" />
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-sm">
              <ReceiptText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Facturation Libre</h1>
              <p className="text-xs text-gray-500">Gestion des paiements sur dossiers avancés + paiements libres</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => { loadPayments(); loadAdvancedLeads(); }}
              disabled={histLoading || leadsLoading}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${histLoading || leadsLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>
        </div>

        <div className="p-6 max-w-7xl mx-auto space-y-6">

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Dossiers avancés" value={stats.dossiers} color="text-sky-700" sub="en attente de paiement" />
            <StatCard label="Paiements libres" value={stats.freePending} color="text-amber-600" sub="en attente" />
            <StatCard label="Payés (total)" value={stats.paid} color="text-emerald-600" sub="tous types confondus" />
            <StatCard label="CA encaissé" value={`${stats.revenue.toFixed(2)} €`} color="text-blue-600" sub="Monético validés" />
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setTab('dossiers')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold transition-colors border-b-2 -mb-px ${tab === 'dossiers' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <Layers className="w-4 h-4" />
                Dossiers en paiement
                {advancedLeads.length > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tab === 'dossiers' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                    {advancedLeads.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setTab('libre')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold transition-colors border-b-2 -mb-px ${tab === 'libre' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <Zap className="w-4 h-4" />
                Paiement libre
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tab === 'libre' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                  sans lead
                </span>
              </button>
            </div>

            {/* ── TAB : DOSSIERS ──────────────────────────────────── */}
            {tab === 'dossiers' && (
              <div className="flex flex-col xl:flex-row gap-0 xl:divide-x xl:divide-gray-100">

                {/* Liste dossiers */}
                <div className="xl:w-1/2 flex flex-col">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
                    <p className="text-xs text-gray-500 mb-3">
                      Leads CRM aux stades avancés du pipeline — devis, signature, paiement, contrat.
                      Cliquez sur un dossier pour créer ou renvoyer un lien de paiement.
                    </p>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="text" value={leadSearch} onChange={e => setLeadSearch(e.target.value)}
                        placeholder="Rechercher un dossier (nom, email, téléphone)..."
                        className="w-full pl-8 pr-3 py-2.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="overflow-y-auto max-h-[calc(100vh-340px)]">
                    {leadsLoading ? (
                      <div className="flex items-center justify-center py-16 text-gray-400">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Chargement...
                      </div>
                    ) : filteredLeads.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <Layers className="w-10 h-10 mb-3 opacity-30" />
                        <p className="text-sm font-medium">Aucun dossier avancé</p>
                        <p className="text-xs mt-1 opacity-60">
                          {leadSearch ? 'Modifiez votre recherche' : 'Les dossiers apparaîtront ici quand ils auront avancé dans le pipeline'}
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {filteredLeads.map(lead => {
                          const lp = paymentsByLead[lead.id] ?? [];
                          const hasPending = lp.some(p => p.status === 'pending' || p.status === 'sent');
                          const hasPaid = lp.some(p => p.status === 'paid');
                          const isExpanded = expandedLeadId === lead.id;
                          const successInfo = leadPaySuccess?.leadId === lead.id ? leadPaySuccess : null;

                          return (
                            <div key={lead.id} className={`transition-colors ${isExpanded ? 'bg-emerald-50/40' : 'hover:bg-gray-50'}`}>
                              <button
                                onClick={() => setExpandedLeadId(isExpanded ? null : lead.id)}
                                className="w-full px-6 py-4 text-left flex items-start gap-3"
                              >
                                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-sm font-semibold text-slate-600">
                                  {(lead.first_name ?? lead.email).slice(0, 1).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className="font-semibold text-gray-900 text-sm">{leadName(lead)}</span>
                                    <div className="flex items-center gap-1.5">
                                      {hasPaid && <PayBadge status="paid" />}
                                      {hasPending && !hasPaid && <PayBadge status="pending" />}
                                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs text-gray-500 flex items-center gap-1"><Mail className="w-3 h-3" />{lead.email}</span>
                                    {lead.city && <span className="text-xs text-gray-400">{lead.city}</span>}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1.5">
                                    <LeadStagePill status={lead.status} stage={lead.pipeline_stage} />
                                    {lp.length > 0 && (
                                      <span className="text-xs text-gray-400">{lp.length} paiement{lp.length > 1 ? 's' : ''}</span>
                                    )}
                                  </div>
                                </div>
                              </button>

                              {/* Panneau expanded */}
                              {isExpanded && (
                                <div className="px-6 pb-5 space-y-4">

                                  {/* Paiements existants */}
                                  {lp.length > 0 && (
                                    <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                                      <div className="px-3 py-2 bg-gray-50 rounded-t-lg">
                                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Paiements existants</span>
                                      </div>
                                      {lp.map(p => (
                                        <div key={p.id} className="px-3 py-2.5 flex items-center justify-between gap-3">
                                          <div className="min-w-0">
                                            <div className="text-xs font-mono text-gray-600 truncate">{p.reference ?? p.payment_reference}</div>
                                            <div className="text-xs text-gray-400">{fmtDate(p.created_at)}</div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className={`font-bold text-sm ${p.status === 'paid' ? 'text-emerald-600' : 'text-gray-700'}`}>
                                              {p.amount?.toFixed(2)} {p.currency}
                                            </span>
                                            <PayBadge status={p.status} />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Succès */}
                                  {successInfo && (
                                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-emerald-800">Lien créé {sendEmail ? '+ email envoyé' : ''}!</p>
                                        <p className="text-xs text-emerald-600 truncate font-mono">{successInfo.url}</p>
                                      </div>
                                      <button
                                        onClick={() => handleCopy(successInfo.url, setLeadPayCopied)}
                                        className="shrink-0 px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs rounded-md transition-colors"
                                      >
                                        {leadPayCopied ? 'Copié !' : <Copy className="w-3.5 h-3.5" />}
                                      </button>
                                    </div>
                                  )}

                                  {/* Nouveau paiement */}
                                  <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                      {lp.length > 0 ? 'Nouveau lien de paiement' : 'Créer un lien de paiement'}
                                    </p>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <label className="block text-xs text-gray-500 mb-1 font-medium">Montant (EUR) *</label>
                                        <div className="relative">
                                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">€</span>
                                          <input
                                            type="number" step="0.01" min="0.01"
                                            value={leadPayAmount} onChange={e => setLeadPayAmount(e.target.value)}
                                            className="w-full pl-7 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                                            placeholder="100.00"
                                          />
                                        </div>
                                      </div>
                                      <div>
                                        <label className="block text-xs text-gray-500 mb-1 font-medium">Description</label>
                                        <input
                                          type="text"
                                          value={leadPayDesc} onChange={e => setLeadPayDesc(e.target.value)}
                                          className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                                          placeholder={`Paiement assurance taxi`}
                                        />
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <input id={`email-${lead.id}`} type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500" />
                                      <label htmlFor={`email-${lead.id}`} className="text-xs text-gray-600 cursor-pointer">Envoyer le lien par email à <span className="font-medium text-gray-800">{lead.email}</span></label>
                                    </div>
                                    <button
                                      onClick={() => handleLeadPayment(lead)}
                                      disabled={!leadPayAmount || leadPayLoading === lead.id}
                                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold text-sm rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {leadPayLoading === lead.id ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Création...</>
                                      ) : (
                                        <><Send className="w-4 h-4" /> {sendEmail ? 'Créer et envoyer' : 'Créer le lien'}</>
                                      )}
                                    </button>
                                    <Link
                                      to={`/backoffice/crm/${lead.id}`}
                                      className="flex items-center justify-center gap-1.5 text-xs text-sky-600 hover:text-sky-800 transition-colors"
                                    >
                                      <ExternalLink className="w-3 h-3" /> Ouvrir le dossier complet
                                    </Link>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Historique paiements liés */}
                <div className="xl:w-1/2 flex flex-col">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Paiements liés à des dossiers</p>
                      <p className="text-xs text-gray-400 mt-0.5">{linkedPayments.length} paiement{linkedPayments.length !== 1 ? 's' : ''} enregistré{linkedPayments.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-[calc(100vh-340px)]">
                    {linkedPayments.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <CreditCard className="w-10 h-10 mb-3 opacity-30" />
                        <p className="text-sm font-medium">Aucun paiement lié</p>
                        <p className="text-xs mt-1 opacity-60">Créez un paiement depuis un dossier</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {linkedPayments.map(p => {
                          const lead = advancedLeads.find(l => l.id === p.lead_id);
                          return (
                            <div key={p.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center shrink-0 text-xs font-semibold text-sky-700">
                                  {(p.customer_name ?? 'C').slice(0, 1).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className="font-semibold text-gray-900 text-sm truncate">{p.customer_name ?? 'Client'}</span>
                                    <PayBadge status={p.status} />
                                  </div>
                                  {p.customer_email && (
                                    <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Mail className="w-3 h-3" />{p.customer_email}</p>
                                  )}
                                  {lead && (
                                    <LeadStagePill status={lead.status} stage={lead.pipeline_stage} />
                                  )}
                                  <div className="flex items-center justify-between mt-1.5">
                                    <span className="text-xs text-gray-400 font-mono">{p.reference ?? p.payment_reference}</span>
                                    <span className={`font-bold text-sm ${p.status === 'paid' ? 'text-emerald-600' : 'text-gray-700'}`}>
                                      {p.amount?.toFixed(2)} {p.currency}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-400">{fmtDate(p.created_at)}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB : LIBRE ─────────────────────────────────────── */}
            {tab === 'libre' && (
              <div className="flex flex-col xl:flex-row gap-0 xl:divide-x xl:divide-gray-100">

                {/* Formulaire libre */}
                <div className="xl:w-2/5 p-6 space-y-5">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-sm text-amber-800">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Mode <strong>paiement libre</strong> — pour tout client hors CRM. Pour un dossier existant, utilisez l'onglet <em>Dossiers en paiement</em>.</span>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Client</p>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className={labelCls}>Prénom *</label>
                          <input type="text" required value={form.firstName} onChange={handleChange('firstName')} className={inputCls} placeholder="Jean" />
                        </div>
                        <div>
                          <label className={labelCls}>Nom *</label>
                          <input type="text" required value={form.lastName} onChange={handleChange('lastName')} className={inputCls} placeholder="Dupont" />
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className={labelCls}><Mail className="w-3 h-3 inline mr-1" />Email *</label>
                        <input type="email" required value={form.email} onChange={handleChange('email')} className={inputCls} placeholder="jean.dupont@example.com" />
                      </div>
                      <div>
                        <label className={labelCls}><Phone className="w-3 h-3 inline mr-1" />Téléphone</label>
                        <input type="tel" value={form.phone} onChange={handleChange('phone')} className={inputCls} placeholder="0612345678" />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Paiement</p>
                      <div className="mb-3">
                        <label className={labelCls}><Banknote className="w-3 h-3 inline mr-1" />Montant (EUR) *</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">€</span>
                          <input type="number" required step="0.01" min="0.01" value={form.amount} onChange={handleChange('amount')} className={`${inputCls} pl-8`} placeholder="100.00" />
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className={labelCls}><FileText className="w-3 h-3 inline mr-1" />Description</label>
                        <textarea value={form.description} onChange={handleChange('description')} rows={2} className={inputCls} placeholder="Paiement comptant assurance taxi..." />
                      </div>
                      <div>
                        <label className={labelCls}><Hash className="w-3 h-3 inline mr-1" />Référence personnalisée</label>
                        <input type="text" value={form.reference} onChange={handleChange('reference')} className={inputCls} placeholder="FACT-2026-001" />
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <input id="send-email-libre" type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} className="mt-0.5 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500" />
                      <label htmlFor="send-email-libre" className="cursor-pointer">
                        <span className="text-sm font-medium text-gray-800">Envoyer par email</span>
                        <p className="text-xs text-gray-500 mt-0.5">Email professionnel avec le lien de paiement sécurisé</p>
                      </label>
                    </div>

                    {formError && (
                      <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {formError}
                      </div>
                    )}

                    <button
                      type="submit" disabled={loading}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold rounded-lg shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Création...</>
                      ) : (
                        <><Send className="w-4 h-4" /> {sendEmail ? 'Créer et envoyer' : 'Créer le lien'}</>
                      )}
                    </button>
                  </form>

                  {paymentLink && (
                    <div className="space-y-3">
                      <div className={`p-3.5 rounded-lg border flex items-start gap-2.5 ${emailSent ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
                        <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-semibold text-sm">{emailSent ? 'Email envoyé !' : 'Lien créé !'}</p>
                          {emailSent && <p className="text-xs mt-0.5 opacity-80">Envoyé à {lastClientEmail}</p>}
                        </div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-xs font-medium text-gray-600 mb-2">Lien de paiement :</p>
                        <div className="flex gap-2">
                          <input readOnly value={paymentLink} className="flex-1 text-xs px-2.5 py-2 bg-white border border-gray-200 rounded-md text-gray-700 min-w-0" />
                          <button
                            onClick={() => handleCopy(paymentLink, setCopied)}
                            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${copied ? 'bg-emerald-600 text-white' : 'bg-gray-800 hover:bg-gray-900 text-white'}`}
                          >
                            {copied ? <><Check className="w-3.5 h-3.5" /> Copié</> : <><Copy className="w-3.5 h-3.5" /> Copier</>}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Historique paiements libres */}
                <div className="xl:w-3/5 flex flex-col">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Historique paiements libres</p>
                        <p className="text-xs text-gray-400 mt-0.5">{freePayments.length} paiements sans dossier CRM</p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all" />
                      </div>
                      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                        {['all', 'pending', 'paid', 'failed'].map(s => (
                          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${statusFilter === s ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                            {s === 'all' ? 'Tous' : STATUS_PAY[s]?.label ?? s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="overflow-y-auto max-h-[calc(100vh-340px)]">
                    {histLoading ? (
                      <div className="flex items-center justify-center py-16 text-gray-400">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Chargement...
                      </div>
                    ) : filteredFree.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <CreditCard className="w-10 h-10 mb-3 opacity-30" />
                        <p className="text-sm font-medium">Aucun paiement libre</p>
                        <p className="text-xs mt-1 opacity-60">{search || statusFilter !== 'all' ? 'Modifiez vos filtres' : 'Créez votre premier paiement libre'}</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {filteredFree.map(p => (
                          <div key={p.id} className="px-6 py-4 hover:bg-gray-50 transition-colors group">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-xs font-semibold text-gray-600 group-hover:bg-gray-200 transition-colors">
                                {(p.customer_name ?? 'C').slice(0, 1).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                  <span className="font-semibold text-gray-900 text-sm truncate">{p.customer_name ?? 'Client'}</span>
                                  <PayBadge status={p.status} />
                                </div>
                                {p.customer_email && (
                                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Mail className="w-3 h-3" />{p.customer_email}</p>
                                )}
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-400 font-mono">{p.reference ?? p.payment_reference}</span>
                                  <span className={`font-bold text-sm ${p.status === 'paid' ? 'text-emerald-600' : 'text-gray-700'}`}>
                                    {p.amount?.toFixed(2)} {p.currency}
                                  </span>
                                </div>
                                {p.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{p.description}</p>}
                                <p className="text-xs text-gray-400">{fmtDate(p.created_at)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
