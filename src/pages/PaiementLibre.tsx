import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  CreditCard, Check, X, AlertCircle, Lock,
  Shield, Loader2, Phone, Euro, FileText, User, Clock
} from 'lucide-react';
import {
  createPublicPlatformPaymentForm,
  lookupPublicPlatformPayment,
  type PublicPaymentFormData,
  type PublicPaymentRecord,
} from '@/lib/platform-api';
import SEOHead from '@/components/SEOHead';

const PaiementLibre: React.FC = () => {
  const { reference } = useParams<{ reference: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const accessToken = (searchParams.get('token') || '').trim().toLowerCase();
  const formRef = useRef<HTMLFormElement>(null);

  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState<PublicPaymentRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [formData, setFormData] = useState<PublicPaymentFormData | null>(null);

  useEffect(() => {
    if (reference && /^[0-9a-f]{64}$/.test(accessToken)) {
      loadPayment(reference);
    } else {
      setError('Lien de paiement invalide ou incomplet.');
      setLoading(false);
    }
  }, [reference, accessToken]);

  useEffect(() => {
    if (formData && formRef.current) {
      formRef.current.submit();
    }
  }, [formData]);

  const loadPayment = async (ref: string) => {
    try {
      setPayment(await lookupPublicPlatformPayment(ref, accessToken));
    } catch (err: unknown) {
      console.error('Payment lookup failure', err instanceof Error ? err.name : 'unknown');
      setError('Erreur lors du chargement. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    if (!payment) return;
    setProcessing(true);
    setError(null);

    try {
      setFormData(await createPublicPlatformPaymentForm(payment.reference, accessToken));
    } catch (err: unknown) {
      console.error('Payment form failure', err instanceof Error ? err.name : 'unknown');
      setError('Une erreur est survenue. Veuillez réessayer ou contacter le support.');
      setProcessing(false);
    }
  };

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric'
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Chargement de votre facture...</p>
        </div>
      </div>
    );
  }

  if (formData) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <form ref={formRef} method="POST" action={formData.action} className="hidden">
          {Object.entries(formData.fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
        </form>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white font-semibold mb-1">Redirection vers le paiement sécurisé...</p>
          <p className="text-gray-400 text-sm">Merci de patienter</p>
        </div>
      </div>
    );
  }

  if (error && !payment) {
    return (
      <>
        <SEOHead
          title="Lien invalide - TaxiAssur"
          description="Ce lien de paiement est invalide ou expiré"
          noindex={true}
        />
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                  <span className="text-black font-black text-sm">T</span>
                </div>
                <span className="text-white font-bold text-xl">TaxiAssur</span>
              </div>
            </div>
            <div className="bg-[#151515] rounded-2xl border border-white/[0.08] p-8 text-center shadow-xl">
              <div className="w-16 h-16 bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-red-400" />
              </div>
              <h1 className="text-xl font-bold text-white mb-2">Lien non valide</h1>
              <p className="text-gray-400 text-sm mb-6">{error}</p>
              <a
                href="tel:0176390060"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-yellow-500 text-black rounded-xl font-semibold hover:bg-yellow-400 transition-colors"
              >
                <Phone className="w-4 h-4" />
                Appeler le 01 76 39 00 60
              </a>
              <button
                onClick={() => navigate('/')}
                className="mt-3 w-full px-4 py-3 border border-white/[0.1] text-gray-400 rounded-xl hover:text-white hover:border-white/[0.2] transition-colors text-sm"
              >
                Retour a l'accueil
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (payment?.status === 'paid') {
    return (
      <>
        <SEOHead
          title="Paiement effectue - TaxiAssur"
          description="Votre paiement a ete effectue avec succes"
          noindex={true}
        />
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2">
                <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                  <span className="text-black font-black text-sm">T</span>
                </div>
                <span className="text-white font-bold text-xl">TaxiAssur</span>
              </div>
            </div>
            <div className="bg-[#151515] rounded-2xl border border-white/[0.08] p-8 text-center shadow-xl">
              <div className="w-16 h-16 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <h1 className="text-xl font-bold text-white mb-2">Paiement deja effectue</h1>
              <p className="text-gray-400 text-sm mb-1">
                Ce paiement de <span className="text-emerald-400 font-semibold">{formatAmount(payment.amount)}</span> a deja ete regle.
              </p>
              {payment.paid_at && (
                <p className="text-gray-600 text-xs mb-6">Le {formatDate(payment.paid_at)}</p>
              )}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-left mb-6">
                <p className="text-emerald-300 text-sm">
                  Un email de confirmation vous a ete envoye. Votre dossier est en cours de traitement.
                </p>
              </div>
              <a
                href="tel:0176390060"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-yellow-500 text-black rounded-xl font-semibold hover:bg-yellow-400 transition-colors"
              >
                <Phone className="w-4 h-4" />
                Contacter TaxiAssur
              </a>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (payment?.status === 'cancelled' || payment?.status === 'failed') {
    return (
      <>
        <SEOHead
          title="Paiement annule - TaxiAssur"
          description="Ce lien de paiement est annule"
          noindex={true}
        />
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2">
                <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                  <span className="text-black font-black text-sm">T</span>
                </div>
                <span className="text-white font-bold text-xl">TaxiAssur</span>
              </div>
            </div>
            <div className="bg-[#151515] rounded-2xl border border-white/[0.08] p-8 text-center shadow-xl">
              <div className="w-16 h-16 bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-red-400" />
              </div>
              <h1 className="text-xl font-bold text-white mb-2">Paiement annule</h1>
              <p className="text-gray-400 text-sm mb-6">
                Ce lien de paiement a ete annule. Contactez-nous pour obtenir un nouveau lien.
              </p>
              <a
                href="tel:0176390060"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-yellow-500 text-black rounded-xl font-semibold hover:bg-yellow-400 transition-colors"
              >
                <Phone className="w-4 h-4" />
                Appeler le 01 76 39 00 60
              </a>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead
        title={`Paiement ${payment?.reference || ''} - TaxiAssur`}
        description="Reglez votre facture en ligne de maniere securisee"
        noindex={true}
      />
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
        <header className="border-b border-white/[0.06] px-4 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <a href="https://taxiassur.com" className="inline-flex items-center gap-2 group">
              <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center group-hover:bg-yellow-400 transition-colors">
                <span className="text-black font-black text-sm">T</span>
              </div>
              <span className="text-white font-bold text-lg">TaxiAssur</span>
            </a>
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
              <Lock className="w-3.5 h-3.5" />
              <span>Paiement securise</span>
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4 py-8">
          <div className="max-w-lg w-full">
            <div className="bg-[#151515] rounded-2xl border border-white/[0.08] overflow-hidden shadow-2xl">
              <div className="bg-gradient-to-r from-yellow-500 to-amber-500 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-black/20 rounded-xl flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-black font-bold text-lg leading-tight">Reglement de facture</h1>
                    <p className="text-black/60 text-sm">Paiement securise par Monetico</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="bg-[#0a0a0a] rounded-xl border border-white/[0.06] p-5 mb-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-500 text-xs uppercase tracking-wider font-medium">Montant a regler</span>
                    <span className="text-xs text-gray-600 font-mono">{payment?.reference}</span>
                  </div>
                  <div className="text-4xl font-black text-white mb-1">
                    {payment ? formatAmount(payment.amount) : '—'}
                  </div>
                  {payment?.description && (
                    <p className="text-gray-500 text-sm mt-2">{payment.description}</p>
                  )}
                </div>

                <div className="space-y-2.5 mb-6">
                  {payment?.customer_name && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Client</p>
                        <p className="text-white text-sm font-medium">{payment.customer_name}</p>
                      </div>
                    </div>
                  )}
                  {payment?.created_at && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Emis le</p>
                        <p className="text-white text-sm font-medium">{formatDate(payment.created_at)}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs">Reference</p>
                      <p className="text-white text-sm font-mono font-medium">{payment?.reference}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 mb-5 bg-emerald-500/[0.06] border border-emerald-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2.5 text-emerald-300 text-sm">
                    <Shield className="w-4 h-4 shrink-0" />
                    <span>Paiement chiffre SSL 256 bits</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-emerald-300 text-sm">
                    <Lock className="w-4 h-4 shrink-0" />
                    <span>Vos coordonnees bancaires ne sont pas stockees</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-emerald-300 text-sm">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>Confirmation par email immediate</span>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl mb-4">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-red-300 text-sm">{error}</p>
                  </div>
                )}

                <button
                  onClick={handlePay}
                  disabled={processing || !payment}
                  className="w-full flex items-center justify-center gap-2.5 px-6 py-4 bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600 text-black rounded-xl font-bold text-base transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-yellow-500/20"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Preparation du paiement...
                    </>
                  ) : (
                    <>
                      <Euro className="w-5 h-5" />
                      Payer {payment ? formatAmount(payment.amount) : ''}
                    </>
                  )}
                </button>

                <p className="text-gray-600 text-xs text-center mt-3">
                  En cliquant sur "Payer", vous acceptez les{' '}
                  <a href="/conditions" className="text-gray-500 hover:text-gray-300 underline">conditions generales</a>
                </p>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-gray-600 text-sm">
                Besoin d'aide ?{' '}
                <a href="tel:0176390060" className="text-yellow-500 hover:text-yellow-400 font-medium">
                  01 76 39 00 60
                </a>
              </p>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default PaiementLibre;
