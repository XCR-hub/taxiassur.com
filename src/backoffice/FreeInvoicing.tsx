import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, Send, User, Mail, Phone, Euro, FileText,
  Check, Loader2, ExternalLink, ArrowLeft, Home, Copy,
  RefreshCw, TrendingUp, Clock, CheckCircle2, XCircle,
  Filter, Search, ReceiptText, ChevronRight, AlertCircle,
  Banknote, Hash,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Link } from 'react-router-dom';
import NavigationMenu from './NavigationMenu';

interface InvoiceForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  amount: string;
  description: string;
  reference: string;
}

interface Payment {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  customer_name?: string;
  customer_email?: string;
  description?: string;
  created_at: string;
}

const EMPTY_FORM: InvoiceForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  amount: '',
  description: '',
  reference: '',
};

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  pending:   { label: 'En attente', cls: 'bg-amber-100 text-amber-700 border border-amber-200',  icon: Clock },
  paid:      { label: 'Payé',       cls: 'bg-green-100 text-green-700 border border-green-200',  icon: CheckCircle2 },
  failed:    { label: 'Échoué',     cls: 'bg-red-100 text-red-700 border border-red-200',         icon: XCircle },
  cancelled: { label: 'Annulé',     cls: 'bg-gray-100 text-gray-600 border border-gray-200',      icon: XCircle },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.cls}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1`}>
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}

export default function FreeInvoicing() {
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

  const loadPayments = useCallback(async () => {
    setHistLoading(true);
    try {
      const { data } = await supabase
        .from('monetico_payments')
        .select('*')
        .is('lead_id', null)
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) setPayments(data as Payment[]);
    } finally {
      setHistLoading(false);
    }
  }, []);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const stats = {
    total: payments.length,
    pending: payments.filter(p => p.status === 'pending').length,
    paid: payments.filter(p => p.status === 'paid').length,
    revenue: payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount ?? 0), 0),
  };

  const filtered = payments.filter(p => {
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch = !q || (p.customer_name ?? '').toLowerCase().includes(q)
      || (p.customer_email ?? '').toLowerCase().includes(q)
      || (p.reference ?? '').toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const handleChange = (field: keyof InvoiceForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm(f => ({ ...f, [field]: e.target.value }));

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
      const { data, error } = await supabase.functions.invoke('create-monetico-payment', {
        body: {
          amount,
          description: form.description || `Paiement ${form.firstName} ${form.lastName}`,
          customerEmail: form.email,
          customerFirstName: form.firstName,
          customerLastName: form.lastName,
          customerPhone: form.phone,
          customReference: form.reference || undefined,
        },
      });

      if (error) throw new Error(error.message);

      if (data?.success && data?.reference) {
        const url = `${window.location.origin}/paiement/${data.reference}`;
        setPaymentLink(url);
        setLastClientEmail(form.email);

        if (sendEmail && form.email) {
          try {
            await supabase.functions.invoke('send-payment-link-email', {
              body: {
                lead_id: null,
                payment_url: url,
                amount,
                email: form.email,
                first_name: form.firstName,
                last_name: form.lastName,
              },
            });
            setEmailSent(true);
          } catch {
            setFormError("Lien créé mais l'email n'a pas pu être envoyé. Copiez le lien ci-dessous.");
          }
        }

        setForm(EMPTY_FORM);
        loadPayments();
      } else {
        throw new Error(data?.error ?? 'Réponse inattendue du serveur');
      }
    } catch (err: any) {
      setFormError(err.message ?? 'Erreur lors de la création du paiement');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!paymentLink) return;
    navigator.clipboard.writeText(paymentLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const inputCls = 'w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:bg-white transition-all';
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide';

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="w-72 shrink-0 bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700/60 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-700/60">
          <Link
            to="/backoffice"
            className="flex items-center gap-2.5 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors shadow-md"
          >
            <Home className="w-4 h-4 shrink-0" />
            Retour au Dashboard
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-3">
          <NavigationMenu />
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────── */}
      <main className="flex-1 bg-slate-100 overflow-y-auto">

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-5 flex items-center gap-4">
          <Link
            to="/backoffice"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Link>
          <ChevronRight className="w-4 h-4 text-gray-300" />
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-sm">
              <ReceiptText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Facturation Libre</h1>
              <p className="text-xs text-gray-500">Créez un lien de paiement pour n'importe quel client</p>
            </div>
          </div>
          <div className="ml-auto">
            <button
              onClick={loadPayments}
              disabled={histLoading}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${histLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>
        </div>

        <div className="p-6 max-w-7xl mx-auto space-y-6">

          {/* ── Stats ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total envoyés" value={stats.total} color="text-gray-800" sub="liens de paiement" />
            <StatCard label="En attente" value={stats.pending} color="text-amber-600" sub="paiements non complétés" />
            <StatCard label="Payés" value={stats.paid} color="text-emerald-600" sub="paiements confirmés" />
            <StatCard
              label="CA encaissé"
              value={`${stats.revenue.toFixed(2)} €`}
              color="text-blue-600"
              sub="paiements Monético validés"
            />
          </div>

          {/* ── Grid principal ────────────────────────────────── */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

            {/* Formulaire — 2 colonnes */}
            <div className="xl:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-emerald-50 flex items-center justify-center">
                  <User className="w-4 h-4 text-emerald-600" />
                </div>
                <h2 className="font-semibold text-gray-900">Nouveau paiement</h2>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">

                {/* Identité */}
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

                {/* Paiement */}
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Paiement</p>
                  <div className="mb-3">
                    <label className={labelCls}><Banknote className="w-3 h-3 inline mr-1" />Montant (EUR) *</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">€</span>
                      <input
                        type="number" required step="0.01" min="0.01"
                        value={form.amount} onChange={handleChange('amount')}
                        className={`${inputCls} pl-8`} placeholder="100.00"
                      />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className={labelCls}><FileText className="w-3 h-3 inline mr-1" />Description</label>
                    <textarea
                      value={form.description} onChange={handleChange('description')}
                      rows={3} className={inputCls}
                      placeholder="Paiement comptant assurance taxi..."
                    />
                  </div>
                  <div>
                    <label className={labelCls}><Hash className="w-3 h-3 inline mr-1" />Référence personnalisée</label>
                    <input type="text" value={form.reference} onChange={handleChange('reference')} className={inputCls} placeholder="FACT-2026-001" />
                  </div>
                </div>

                {/* Option email */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <input
                    id="send-email" type="checkbox" checked={sendEmail}
                    onChange={e => setSendEmail(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                  />
                  <label htmlFor="send-email" className="cursor-pointer">
                    <span className="text-sm font-medium text-gray-800">Envoyer par email</span>
                    <p className="text-xs text-gray-500 mt-0.5">Le client recevra un email professionnel avec le lien de paiement sécurisé</p>
                  </label>
                </div>

                {/* Erreur */}
                {formError && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    {formError}
                  </div>
                )}

                <button
                  type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold rounded-lg shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Création en cours...</>
                  ) : (
                    <><Send className="w-4 h-4" /> {sendEmail ? 'Créer et envoyer par email' : 'Créer le lien de paiement'}</>
                  )}
                </button>
              </form>

              {/* Résultat */}
              {paymentLink && (
                <div className="mx-6 mb-6 space-y-3">
                  <div className={`p-3.5 rounded-lg border flex items-start gap-2.5 ${emailSent ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">
                        {emailSent ? 'Email envoyé avec succès !' : 'Lien créé !'}
                      </p>
                      {emailSent && (
                        <p className="text-xs mt-0.5 opacity-80">Email envoyé à {lastClientEmail}</p>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs font-medium text-gray-600 mb-2">Lien de paiement :</p>
                    <div className="flex gap-2">
                      <input readOnly value={paymentLink} className="flex-1 text-xs px-2.5 py-2 bg-white border border-gray-200 rounded-md text-gray-700 min-w-0" />
                      <button
                        onClick={handleCopy}
                        className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${copied ? 'bg-emerald-600 text-white' : 'bg-gray-800 hover:bg-gray-900 text-white'}`}
                      >
                        {copied ? <><Check className="w-3.5 h-3.5" /> Copié</> : <><Copy className="w-3.5 h-3.5" /> Copier</>}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Historique — 3 colonnes */}
            <div className="xl:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                    </div>
                    <h2 className="font-semibold text-gray-900">Historique des paiements</h2>
                    {payments.length > 0 && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">{payments.length}</span>
                    )}
                  </div>
                </div>

                {/* Filtres */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text" value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Rechercher un client, email, réf..."
                      className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                    {['all', 'pending', 'paid', 'failed'].map(s => (
                      <button
                        key={s}
                        onClick={() => setStatusFilter(s)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${statusFilter === s ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        {s === 'all' ? 'Tous' : STATUS_CONFIG[s]?.label ?? s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {histLoading ? (
                  <div className="flex items-center justify-center py-16 text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    Chargement...
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <CreditCard className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm font-medium">Aucun paiement trouvé</p>
                    <p className="text-xs mt-1 opacity-60">
                      {search || statusFilter !== 'all' ? 'Modifiez vos filtres' : 'Créez votre premier lien de paiement'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filtered.map(payment => (
                      <div key={payment.id} className="px-6 py-4 hover:bg-gray-50 transition-colors group">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0 text-sm font-semibold text-gray-600 group-hover:bg-gray-200 transition-colors">
                            {(payment.customer_name ?? 'C').slice(0, 1).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <span className="font-semibold text-gray-900 text-sm truncate">
                                {payment.customer_name ?? 'Client'}
                              </span>
                              <StatusBadge status={payment.status} />
                            </div>
                            {payment.customer_email && (
                              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                                <Mail className="w-3 h-3" />
                                {payment.customer_email}
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 text-xs text-gray-400">
                                <span>Réf: <span className="font-mono text-gray-600">{payment.reference}</span></span>
                                <span>{fmtDate(payment.created_at)}</span>
                              </div>
                              <span className={`text-base font-bold ${payment.status === 'paid' ? 'text-emerald-600' : 'text-gray-700'}`}>
                                {payment.amount?.toFixed(2)} {payment.currency}
                              </span>
                            </div>
                            {payment.description && (
                              <p className="text-xs text-gray-400 mt-1 truncate">{payment.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
