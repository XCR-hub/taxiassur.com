import React, { useState } from 'react';
import { CreditCard, Send, User, Mail, Phone, Euro, FileText, Check, X, Loader2, ExternalLink, ArrowLeft, Home } from 'lucide-react';
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
  reference?: string;
}

interface PaymentResponse {
  success: boolean;
  paymentId?: string;
  reference?: string;
  paymentUrl?: string;
  htmlForm?: string;
  error?: string;
}

const FreeInvoicing: React.FC = () => {
  const [form, setForm] = useState<InvoiceForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    amount: '',
    description: '',
    reference: ''
  });

  const [loading, setLoading] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [paymentWindow, setPaymentWindow] = useState<Window | null>(null);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [sendEmail, setSendEmail] = useState(true);
  const [emailSent, setEmailSent] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [lastCustomer, setLastCustomer] = useState({ email: '', name: '' });
  const [testingBrevo, setTestingBrevo] = useState(false);
  const [brevoStatus, setBrevoStatus] = useState<string | null>(null);

  React.useEffect(() => {
    loadRecentPayments();
  }, []);

  const loadRecentPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('monetico_payments')
        .select('*')
        .is('lead_id', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setRecentPayments(data);
      }
    } catch (err) {
      console.error('Erreur chargement paiements:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setPaymentLink(null);
    setEmailSent(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Session expirée');
        setLoading(false);
        return;
      }

      const amount = parseFloat(form.amount);
      if (isNaN(amount) || amount <= 0) {
        alert('Montant invalide');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-monetico-payment', {
        body: {
          amount: amount,
          description: form.description || `Paiement ${form.firstName} ${form.lastName}`,
          customerEmail: form.email,
          customerFirstName: form.firstName,
          customerLastName: form.lastName,
          customerPhone: form.phone,
          customReference: form.reference || undefined
        }
      });

      if (error) {
        console.error('Erreur création paiement:', error);
        alert('Erreur lors de la création du lien de paiement');
        setLoading(false);
        return;
      }

      const response = data as PaymentResponse;

      if (response.success && response.reference) {
        const fullPaymentUrl = `${window.location.origin}/paiement/${response.reference}`;
        setPaymentLink(fullPaymentUrl);

        // Sauvegarder les infos du client avant de réinitialiser le formulaire
        setLastCustomer({
          email: form.email,
          name: `${form.firstName} ${form.lastName}`.trim()
        });

        // Si l'option d'envoi d'email est cochée
        if (sendEmail && form.email) {
          try {
            console.log('Envoi email à:', form.email, 'Montant:', amount, 'URL:', fullPaymentUrl);

            const { data: emailData, error: emailError } = await supabase.functions.invoke('send-payment-link-email', {
              body: {
                lead_id: null, // Pas de lead pour facturation libre
                payment_url: fullPaymentUrl,
                amount: amount,
                email: form.email,
                first_name: form.firstName,
                last_name: form.lastName
              }
            });

            console.log('Réponse email:', emailData, 'Erreur:', emailError);

            if (emailError) {
              throw emailError;
            }

            if (emailData && !emailData.success) {
              throw new Error(emailData.error || 'Erreur inconnue lors de l\'envoi');
            }

            setEmailSent(true);
            console.log('✅ Email envoyé avec succès');
          } catch (emailError: any) {
            console.error('❌ Erreur envoi email:', emailError);
            const errorMessage = emailError.message || emailError.toString();
            alert(`⚠️ Lien créé mais erreur lors de l'envoi de l'email:\n\n${errorMessage}\n\nVous pouvez copier le lien ci-dessous.`);
          }
        } else if (!sendEmail && response.htmlForm) {
          // Si pas d'email, ouvrir directement la fenêtre de paiement
          const newWindow = window.open('', '_blank', 'width=800,height=600');
          if (newWindow) {
            newWindow.document.write(response.htmlForm);
            newWindow.document.close();
            setPaymentWindow(newWindow);
          }
        }

        setForm({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          amount: '',
          description: '',
          reference: ''
        });

        loadRecentPayments();
      }
    } catch (err: any) {
      console.error('Erreur:', err);
      alert('Erreur lors de la création du paiement');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!paymentLink) return;
    navigator.clipboard.writeText(paymentLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const testBrevoConfiguration = async () => {
    setTestingBrevo(true);
    setBrevoStatus(null);

    try {
      const { data, error } = await supabase.functions.invoke('test-brevo-config');

      if (error) {
        throw error;
      }

      if (data.success) {
        setBrevoStatus(`✅ ${data.message}\n\nCompte: ${data.account?.email || 'N/A'}\nPlan: ${data.account?.plan || 'N/A'}\nCrédits: ${data.account?.credits || 0}`);
      } else {
        setBrevoStatus(`❌ ${data.error}\n\n${data.help || ''}`);
      }
    } catch (err: any) {
      setBrevoStatus(`❌ Erreur: ${err.message || err.toString()}`);
    } finally {
      setTestingBrevo(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('fr-FR');
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status === 'pending' && 'En attente'}
        {status === 'paid' && 'Payé'}
        {status === 'failed' && 'Échoué'}
        {status === 'cancelled' && 'Annulé'}
      </span>
    );
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-gradient-to-b from-slate-800 to-gray-900 border-r border-gray-700 overflow-y-auto p-6">
        <div className="mb-6">
          <Link
            to="/backoffice"
            className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-medium transition-all shadow-lg mb-4"
          >
            <Home className="w-5 h-5" />
            Retour au Dashboard
          </Link>
        </div>
        <NavigationMenu />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full bg-gradient-to-br from-slate-50 to-blue-50 p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header with Back Button */}
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-6">
                <Link
                  to="/backoffice"
                  className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-300 hover:border-blue-500 text-gray-700 hover:text-blue-600 rounded-lg font-medium transition-all shadow-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Retour
                </Link>
                <div className="flex-1 flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                    <CreditCard className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Facturation Libre</h1>
                    <p className="text-gray-600">Créez un lien de paiement pour n'importe quel client</p>
                  </div>
                </div>
              </div>
            </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulaire */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center gap-2 mb-6">
              <User className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Nouveau Paiement</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Informations client */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Jean"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Dupont"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="jean.dupont@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0612345678"
                />
              </div>

              {/* Informations paiement */}
              <div className="border-t pt-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Euro className="w-4 h-4 inline mr-1" />
                    Montant (EUR) *
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="100.00"
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <FileText className="w-4 h-4 inline mr-1" />
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Paiement comptant assurance taxi..."
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Référence personnalisée (optionnel)
                  </label>
                  <input
                    type="text"
                    value={form.reference}
                    onChange={(e) => setForm({ ...form, reference: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="FACT-2026-001"
                  />
                </div>
              </div>

              {/* Option d'envoi par email */}
              <div className="border-t pt-4 mt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">Envoyer le lien par email</span>
                    <p className="text-sm text-gray-600">Le client recevra un email professionnel avec le lien de paiement</p>
                  </div>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-4 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    {sendEmail ? 'Créer et Envoyer par Email' : 'Créer le Lien de Paiement'}
                  </>
                )}
              </button>

              {/* Bouton de test Brevo */}
              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  onClick={testBrevoConfiguration}
                  disabled={testingBrevo}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 font-medium"
                >
                  {testingBrevo ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Test en cours...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Tester la configuration email (Brevo)
                    </>
                  )}
                </button>

                {brevoStatus && (
                  <div className={`p-4 rounded-lg border text-sm whitespace-pre-line ${
                    brevoStatus.startsWith('✅')
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    {brevoStatus}

                    {!brevoStatus.startsWith('✅') && (
                      <div className="mt-3 pt-3 border-t border-red-300">
                        <p className="font-semibold mb-2">Instructions :</p>
                        <ol className="list-decimal ml-5 space-y-1 text-xs">
                          <li>Allez sur app.supabase.com</li>
                          <li>Projet Settings Edge Functions Secrets</li>
                          <li>Ajoutez : BREVO_API_KEY</li>
                          <li>Voir le fichier BREVO_CONFIG_SUPABASE.md</li>
                        </ol>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                  <p className="font-semibold mb-1">Info :</p>
                  <p>Si le test échoue, consultez le fichier BREVO_CONFIG_SUPABASE.md pour configurer la clé API.</p>
                </div>
              </div>
            </form>

            {paymentLink && (
              <div className="mt-4 space-y-3">
                {/* Message de succès selon le mode */}
                {emailSent ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800 mb-2">
                      <Check className="w-5 h-5" />
                      <span className="font-semibold">Email envoyé avec succès !</span>
                    </div>
                    <p className="text-sm text-green-700">
                      Le client {lastCustomer.name && `${lastCustomer.name} `}({lastCustomer.email}) a reçu un email professionnel avec le lien de paiement sécurisé.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-800 mb-2">
                      <Check className="w-5 h-5" />
                      <span className="font-semibold">Lien de paiement créé !</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      Une nouvelle fenêtre s'est ouverte avec le formulaire de paiement Monético.
                    </p>
                  </div>
                )}

                {/* Lien à copier */}
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lien de paiement à partager :
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={paymentLink}
                      className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copié !
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-4 h-4" />
                          Copier
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Vous pouvez également copier ce lien et l'envoyer manuellement au client
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Historique */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">Paiements Récents</h2>
              </div>
              <button
                onClick={loadRecentPayments}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Actualiser"
              >
                <Loader2 className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {recentPayments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Aucun paiement libre pour le moment</p>
                </div>
              ) : (
                recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-gray-600" />
                          <span className="font-semibold text-gray-900">
                            {payment.customer_name || 'Client'}
                          </span>
                        </div>
                        {payment.customer_email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-3 h-3" />
                            {payment.customer_email}
                          </div>
                        )}
                      </div>
                      {getStatusBadge(payment.status)}
                    </div>

                    <div className="flex items-center justify-between text-sm mt-3">
                      <span className="text-gray-600">Réf: {payment.reference}</span>
                      <span className="font-bold text-green-600 text-lg">
                        {payment.amount?.toFixed(2)} {payment.currency}
                      </span>
                    </div>

                    {payment.description && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                        {payment.description}
                      </p>
                    )}

                    <div className="text-xs text-gray-500 mt-2">
                      {formatDate(payment.created_at)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FreeInvoicing;
