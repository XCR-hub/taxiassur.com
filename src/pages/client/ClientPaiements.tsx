import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  CreditCard, CheckCircle, Clock, XCircle, AlertCircle,
  ExternalLink, RefreshCw, TrendingUp, Receipt,
  Loader, Mail, ShieldCheck, type LucideIcon
} from 'lucide-react';
import ClientLayout from '../../components/client/ClientLayout';
import SEOHead from '../../components/SEOHead';
import { getClientAccessToken } from '@/lib/client-access';
import { loadClientPlatformSession } from '@/lib/client-platform-api';

interface Payment {
  id: string;
  reference: string;
  amount: number;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'cancelled' | 'refunded';
  payment_date: string | null;
  card_type: string | null;
  card_last4: string | null;
  description: string | null;
  payment_url: string | null;
  created_at: string;
}

interface LeadData {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: LucideIcon }> = {
  success: { label: 'Payé', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: CheckCircle },
  pending: { label: 'En attente', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: Clock },
  processing: { label: 'En cours', bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: Loader },
  failed: { label: 'Refusé', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: XCircle },
  cancelled: { label: 'Annulé', bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', icon: XCircle },
  refunded: { label: 'Remboursé', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', icon: RefreshCw },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      <Icon size={11} className={status === 'processing' ? 'animate-spin' : ''} />
      {cfg.label}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export default function ClientPaiements() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const accessToken = getClientAccessToken(searchParams.get('token'));

  const [leadData, setLeadData] = useState<LeadData | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [sentSuccess, setSentSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      navigate('/espace-client');
      return;
    }
    loadData();
  }, [accessToken, navigate]);

  const loadData = async () => {
    try {
      const data = await loadClientPlatformSession(accessToken);
      setLeadData(data.lead as LeadData);
      setPayments((data.payments || []) as Payment[]);
    } catch (err) {
      console.error('Erreur chargement données client:', err);
      setLeadData(null);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handlePay = (payment: Payment) => {
    if (payment.payment_url) {
      window.open(payment.payment_url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleSendEmail = async (paymentId: string) => {
    setSendingEmail(paymentId);
    setError(null);
    setSentSuccess(null);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-payment-link-monetico`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ paymentId, accessToken }),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erreur envoi email');
      setSentSuccess(paymentId);
      setTimeout(() => setSentSuccess(null), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSendingEmail(null);
    }
  };

  const totalPaid = payments.filter(p => p.status === 'success').reduce((s, p) => s + p.amount, 0);
  const totalPending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
  const pendingPayments = payments.filter(p => p.status === 'pending');
  const paidPayments = payments.filter(p => p.status === 'success');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Chargement de vos paiements...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title="Mes Paiements - Espace Client TaxiAssur"
        description="Consultez et gérez vos paiements"
        noIndex={true}
      />

      <ClientLayout email={leadData?.email || ''}>
        <div className="space-y-6 max-w-3xl">

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mes Paiements</h1>
              <p className="text-gray-500 text-sm mt-0.5">Historique et suivi de vos transactions</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 bg-white border border-gray-200 rounded-lg px-3 py-2 transition-colors hover:bg-gray-50"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Actualiser
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
              <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {payments.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp size={16} className="text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-600">Total réglé</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{totalPaid.toFixed(2)} €</div>
                <p className="text-xs text-gray-500 mt-1">{paidPayments.length} paiement{paidPayments.length > 1 ? 's' : ''} confirmé{paidPayments.length > 1 ? 's' : ''}</p>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Clock size={16} className="text-amber-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-600">En attente</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">{totalPending.toFixed(2)} €</div>
                <p className="text-xs text-gray-500 mt-1">{pendingPayments.length} paiement{pendingPayments.length > 1 ? 's' : ''} à régler</p>
              </div>
            </div>
          )}

          {pendingPayments.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                Paiements en attente
              </h2>

              {pendingPayments.map(payment => (
                <div key={payment.id} className="bg-white rounded-xl border-2 border-amber-200 shadow-sm overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <CreditCard size={18} className="text-amber-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-lg text-gray-900">{payment.amount.toFixed(2)} €</span>
                            <StatusBadge status={payment.status} />
                          </div>
                          <p className="text-sm text-gray-600 mt-0.5">{payment.description || 'Paiement assurance taxi'}</p>
                          <p className="text-xs text-gray-400 mt-1">Demandé le {formatDate(payment.created_at)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col sm:flex-row gap-2">
                      {payment.payment_url && (
                        <button
                          onClick={() => handlePay(payment)}
                          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-semibold py-2.5 px-4 rounded-lg transition-all text-sm shadow-sm"
                        >
                          <CreditCard size={15} />
                          Payer maintenant
                          <ExternalLink size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => handleSendEmail(payment.id)}
                        disabled={sendingEmail === payment.id}
                        className="flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-2.5 px-4 rounded-lg transition-all text-sm"
                      >
                        {sendingEmail === payment.id ? (
                          <><Loader size={14} className="animate-spin" /> Envoi...</>
                        ) : sentSuccess === payment.id ? (
                          <><CheckCircle size={14} className="text-green-600" /> Envoyé !</>
                        ) : (
                          <><Mail size={14} /> Recevoir par email</>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="bg-amber-50 border-t border-amber-100 px-5 py-3">
                    <div className="flex items-center gap-2 text-xs text-amber-700">
                      <ShieldCheck size={12} />
                      Paiement sécurisé via Monetico CIC — 3D Secure — PCI-DSS niveau 1
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {payments.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Receipt size={24} className="text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-1">Aucun paiement enregistré</h3>
              <p className="text-sm text-gray-500">Vos transactions CB apparaitront ici dès qu'une demande de paiement aura été envoyée.</p>
            </div>
          )}

          {paidPayments.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <CheckCircle size={16} className="text-green-600" />
                Paiements réalisés
              </h2>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                {paidPayments.map((payment) => (
                  <div key={payment.id} className="p-5 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <CheckCircle size={16} className="text-green-600" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">{payment.amount.toFixed(2)} €</span>
                          <StatusBadge status={payment.status} />
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {payment.description || 'Paiement assurance taxi'}
                        </p>
                        {payment.card_type && payment.card_last4 && (
                          <div className="flex items-center gap-1 mt-1">
                            <CreditCard size={11} className="text-gray-400" />
                            <span className="text-xs text-gray-500">
                              {payment.card_type} •••• {payment.card_last4}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="text-right flex-shrink-0">
                        {payment.payment_date ? (
                          <p className="text-xs font-medium text-green-600">{formatDate(payment.payment_date)}</p>
                        ) : (
                          <p className="text-xs text-gray-400">{formatDate(payment.created_at)}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">Réf. {payment.reference?.slice(-8)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {payments.filter(p => !['success', 'pending'].includes(p.status)).length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-gray-600 flex items-center gap-2">
                <XCircle size={16} className="text-gray-400" />
                Autres transactions
              </h2>

              <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                {payments
                  .filter(p => !['success', 'pending'].includes(p.status))
                  .map(payment => (
                    <div key={payment.id} className="p-5">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <XCircle size={16} className="text-gray-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-700">{payment.amount.toFixed(2)} €</span>
                            <StatusBadge status={payment.status} />
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(payment.created_at)}</p>
                        </div>
                        <p className="text-xs text-gray-400">Réf. {payment.reference?.slice(-8)}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck size={18} className="text-gray-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Paiements sécurisés</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Tous vos paiements sont traités via Monetico CIC avec chiffrement 3D Secure et conformité PCI-DSS niveau 1.
                  Vos coordonnées bancaires ne sont jamais stockées chez TaxiAssur.
                  Pour toute question, contactez-nous au <a href="tel:0180855786" className="text-yellow-600 font-medium hover:underline">01 80 85 57 86</a>.
                </p>
              </div>
            </div>
          </div>

        </div>
      </ClientLayout>
    </>
  );
}
