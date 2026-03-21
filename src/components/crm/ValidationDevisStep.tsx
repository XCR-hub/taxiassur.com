import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import {
  CheckCircle, XCircle, Clock, FileText, Eye, Building2,
  AlertTriangle, Mail, MessageSquare, Phone, Loader2
} from 'lucide-react';
import { Badge } from '../Badge';

interface ValidationDevisStepProps {
  leadId: string;
  leadEmail: string;
  leadPhone: string;
  leadFirstName: string;
  leadAccessToken: string;
}

interface InsuranceCompany {
  id: string;
  name: string;
  code: string;
  logo_url: string | null;
}

interface CompanyQuote {
  id: string;
  lead_id: string;
  company_id: string;
  status: 'pending' | 'quote_submitted' | 'refused' | 'validated';
  quote_amount: number | null;
  quote_file_url: string | null;
  refusal_reason: string | null;
  submitted_at: string | null;
  quote_accepted_at: string | null;
  quote_refused_at: string | null;
  company: InsuranceCompany;
}

export default function ValidationDevisStep({
  leadId,
  leadEmail,
  leadPhone,
  leadFirstName,
  leadAccessToken
}: ValidationDevisStepProps) {
  const [quotes, setQuotes] = useState<CompanyQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  useEffect(() => {
    loadQuotes();

    // Écouter les changements en temps réel
    const channel = supabase
      .channel(`quotes-${leadId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lead_company_quotes',
          filter: `lead_id=eq.${leadId}`
        },
        () => {
          loadQuotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId]);

  const loadQuotes = async () => {
    try {
      const { data, error } = await supabase
        .from('lead_company_quotes')
        .select(`
          *,
          company:insurance_companies(*)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setQuotes(data || []);
    } catch (error) {
      console.error('Error loading quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning" icon={<Clock className="w-3 h-3" />}>En attente</Badge>;
      case 'quote_submitted':
        return <Badge variant="info" icon={<FileText className="w-3 h-3" />}>Devis soumis</Badge>;
      case 'refused':
        return <Badge variant="danger" icon={<XCircle className="w-3 h-3" />}>Refusé</Badge>;
      case 'validated':
        return <Badge variant="success" icon={<CheckCircle className="w-3 h-3" />}>Validé</Badge>;
      default:
        return null;
    }
  };

  const calculateProgress = () => {
    const submittedOrProcessed = quotes.filter(
      q => q.status === 'quote_submitted' || q.status === 'validated' || q.status === 'refused'
    ).length;
    return {
      current: submittedOrProcessed,
      total: quotes.length,
      percentage: quotes.length > 0 ? (submittedOrProcessed / quotes.length) * 100 : 0
    };
  };

  const hasValidatedQuote = quotes.some(q => q.status === 'validated');
  const progress = calculateProgress();

  async function sendEmailReminder() {
    if (!leadEmail) {
      toast.info('Le prospect n\'a pas d\'email renseigné');
      return;
    }

    setSendingReminder('email');
    try {
      const prospectUrl = `${window.location.origin}/espace-prospect?token=${leadAccessToken}`;
      const subject = `${leadFirstName || 'Cher client'}, vos devis d'assurance taxi sont prêts ! 📋`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px 25px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">📋 Vos devis sont prêts !</h1>
          </div>

          <div style="padding: 30px 25px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
              Bonjour <strong>${leadFirstName || 'Cher client'}</strong>,
            </p>

            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              Nous avons le plaisir de vous informer que vos <strong>5 devis d'assurance taxi</strong> sont maintenant disponibles dans votre espace sécurisé.
            </p>

            <div style="background-color: #f3f4f6; border-left: 4px solid #2563eb; padding: 20px; margin-bottom: 25px; border-radius: 8px;">
              <p style="color: #1f2937; font-size: 15px; line-height: 1.6; margin: 0;">
                ✅ <strong>Comparez</strong> les offres des meilleures compagnies<br>
                ✅ <strong>Choisissez</strong> le meilleur rapport qualité/prix<br>
                ✅ <strong>Validez</strong> en 1 clic pour finaliser votre souscription
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${prospectUrl}" style="display: inline-block; background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                🔍 Consulter mes devis
              </a>
            </div>

            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 25px;">
              Une question ? Notre équipe est à votre disposition :<br>
              <strong style="color: #16a34a;">📞 01 80 85 57 88</strong> ou
              <strong style="color: #2563eb;">✉️ team@taxiassur.com</strong>
            </p>

            <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px;">
              <p style="color: #9ca3af; font-size: 13px; line-height: 1.5; margin: 0;">
                Cordialement,<br>
                <strong style="color: #374151;">L'équipe TaxiAssur</strong><br>
                <span style="font-size: 12px;">Votre expert en assurance taxi et VTC</span>
              </p>
            </div>
          </div>
        </div>
      `;

      const { error } = await supabase.functions.invoke('send-crm-email', {
        body: {
          to: leadEmail,
          subject: subject,
          content: html,
          lead_id: leadId
        }
      });

      if (error) throw error;

      toast.success('✅ Email de relance envoyé avec succès !');
    } catch (error) {
      console.error('Error sending email reminder:', error);
      toast.error('❌ Erreur lors de l\'envoi de l\'email');
    } finally {
      setSendingReminder(null);
    }
  }

  async function sendWhatsAppReminder() {
    if (!leadPhone) {
      toast.info('Le prospect n\'a pas de numéro de téléphone renseigné');
      return;
    }

    setSendingReminder('whatsapp');
    try {
      const prospectUrl = `${window.location.origin}/espace-prospect?token=${leadAccessToken}`;

      const message = `Bonjour ${leadFirstName || 'Cher client'} 👋

Vos 5 devis d'assurance taxi sont prêts ! 📋

Consultez-les dès maintenant dans votre espace sécurisé :
${prospectUrl}

✅ Comparez les offres
✅ Choisissez le meilleur tarif
✅ Validez en 1 clic

Des questions ? Contactez-nous au 01 80 85 57 88

L'équipe TaxiAssur`;

      const { error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          to: leadPhone,
          message: message,
          lead_id: leadId
        }
      });

      if (error) throw error;

      toast.success('✅ Message WhatsApp envoyé avec succès !');
    } catch (error) {
      console.error('Error sending WhatsApp reminder:', error);
      toast.error('❌ Erreur lors de l\'envoi du message WhatsApp');
    } finally {
      setSendingReminder(null);
    }
  }

  async function sendSMSReminder() {
    if (!leadPhone) {
      toast.info('Le prospect n\'a pas de numéro de téléphone renseigné');
      return;
    }

    setSendingReminder('sms');
    try {
      const prospectUrl = `${window.location.origin}/espace-prospect?token=${leadAccessToken}`;

      const message = `${leadFirstName || 'Bonjour'}, vos 5 devis d'assurance taxi sont prêts ! Consultez-les : ${prospectUrl} - TaxiAssur`;

      const { error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: leadPhone,
          message: message,
          lead_id: leadId
        }
      });

      if (error) throw error;

      toast.success('✅ SMS envoyé avec succès !');
    } catch (error) {
      console.error('Error sending SMS reminder:', error);
      toast.error('❌ Erreur lors de l\'envoi du SMS');
    } finally {
      setSendingReminder(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* En-tête avec statut */}
      <div className={`rounded-lg p-4 border ${
        hasValidatedQuote
          ? 'bg-green-50 border-green-200'
          : 'bg-purple-50 border-purple-200'
      }`}>
        <p className="text-sm font-semibold mb-2 flex items-center gap-2">
          {hasValidatedQuote ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-green-900">Devis validé par le prospect !</span>
            </>
          ) : (
            <>
              <Clock className="w-4 h-4 text-purple-600" />
              <span className="text-purple-900">En attente de validation par le prospect</span>
            </>
          )}
        </p>
        <p className="text-sm text-gray-700">
          {hasValidatedQuote
            ? 'Le prospect a validé un devis. Vous pouvez passer à l\'étape suivante.'
            : 'Le prospect doit se connecter à son espace pour consulter les devis et en valider un.'}
        </p>
      </div>

      {/* Barre de progression */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-900">
            Progression des compagnies
          </span>
          <span className="text-sm text-gray-600">
            {progress.current} / {progress.total}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all ${
              progress.percentage === 100 ? 'bg-green-600' : 'bg-blue-600'
            }`}
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* Liste des devis groupés par compagnie */}
      <div className="space-y-3">
        {Object.entries(
          quotes.reduce((acc, quote) => {
            const companyId = quote.company_id;
            if (!acc[companyId]) {
              acc[companyId] = {
                company: quote.company,
                quotes: []
              };
            }
            acc[companyId].quotes.push(quote);
            return acc;
          }, {} as Record<string, { company: InsuranceCompany, quotes: CompanyQuote[] }>)
        ).map(([companyId, { company, quotes: companyQuotes }]) => {
          const hasValidated = companyQuotes.some(q => q.status === 'validated');
          const hasRefused = companyQuotes.some(q => q.status === 'refused');

          return (
            <div
              key={companyId}
              className={`bg-white rounded-lg border p-4 ${
                hasValidated ? 'border-green-500/30 bg-green-50/30' :
                hasRefused ? 'border-red-500/30 bg-red-50/30' :
                'border-gray-200'
              }`}
            >
              {/* En-tête de la compagnie */}
              <div className="flex items-start gap-3 mb-3 pb-3 border-b border-gray-200">
                {company.logo_url ? (
                  <img
                    src={company.logo_url}
                    alt={`Logo ${company.name}`}
                    className="w-12 h-12 object-contain flex-shrink-0"
                  />
                ) : (
                  <Building2 className="w-6 h-6 text-gray-400 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-lg text-gray-900">
                    {company.name}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {companyQuotes.length} devis disponible{companyQuotes.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Liste des devis de cette compagnie */}
              <div className="space-y-3">
                {companyQuotes.map((quote, idx) => (
                  <div key={quote.id} className={`${idx > 0 ? 'pt-3 border-t border-gray-100' : ''}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <FileText className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-gray-700">
                              Devis #{idx + 1}
                            </p>
                            {getStatusBadge(quote.status)}
                          </div>

                          {quote.quote_amount && (
                            <p className="text-sm text-gray-600">
                              Montant : <span className="font-semibold text-blue-600">
                                {quote.quote_amount} € / an
                              </span>
                            </p>
                          )}

                          {quote.status === 'validated' && quote.quote_accepted_at && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Validé le {new Date(quote.quote_accepted_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  )}

                  {quote.status === 'refused' && quote.quote_refused_at && (
                    <div className="mt-2">
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        Refusé le {new Date(quote.quote_refused_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      {quote.refusal_reason && (
                        <p className="text-xs text-gray-600 mt-1">
                          Raison : {quote.refusal_reason}
                        </p>
                      )}
                    </div>
                          )}
                        </div>
                      </div>

                      {quote.quote_file_url && (
                        <a
                          href={quote.quote_file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex-shrink-0"
                        >
                          <Eye className="w-4 h-4" />
                          Voir
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lien Espace Prospect */}
      {leadAccessToken && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <p className="text-sm font-medium text-gray-900 mb-2">Lien Espace Prospect :</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={`${window.location.origin}/espace-prospect?token=${leadAccessToken}`}
              className="flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/espace-prospect?token=${leadAccessToken}`);
                toast.success('Lien copié !');
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Copier
            </button>
          </div>
        </div>
      )}

      {/* Boutons de relance */}
      {!hasValidatedQuote && (
        <div className="bg-white border-2 border-orange-200 rounded-lg p-6">
          <h4 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-orange-600">📣</span>
            Relancer le prospect
          </h4>
          <p className="text-sm text-gray-600 mb-4">
            Envoyez un rappel au prospect pour l'inviter à consulter ses devis
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={sendEmailReminder}
              disabled={!leadEmail || sendingReminder !== null}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sendingReminder === 'email' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Mail className="h-5 w-5" />
              )}
              <span>{sendingReminder === 'email' ? 'Envoi...' : 'Email'}</span>
            </button>

            <button
              onClick={sendWhatsAppReminder}
              disabled={!leadPhone || sendingReminder !== null}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sendingReminder === 'whatsapp' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <MessageSquare className="h-5 w-5" />
              )}
              <span>{sendingReminder === 'whatsapp' ? 'Envoi...' : 'WhatsApp'}</span>
            </button>

            <button
              onClick={sendSMSReminder}
              disabled={!leadPhone || sendingReminder !== null}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sendingReminder === 'sms' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Phone className="h-5 w-5" />
              )}
              <span>{sendingReminder === 'sms' ? 'Envoi...' : 'SMS'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
