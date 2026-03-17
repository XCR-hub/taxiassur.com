import { useState, useEffect } from 'react';
import { Download, FileText, AlertCircle, CheckCircle2, Printer, Eye, Building2, Check, Loader2, X } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';

interface InsuranceCompany {
  id: string;
  code: string;
  name: string;
  logo_url: string | null;
  contact_phone: string | null;
  contact_email: string | null;
}

interface Quote {
  id: string;
  company_id: string;
  quote_file_url: string;
  quote_amount?: number;
  status: string;
  submitted_at?: string;
  last_sent_at?: string;
  created_at: string;
}

interface Props {
  leadId?: string;
  token?: string;
  supabaseClient?: SupabaseClient;
}

export default function ClientQuotesViewer({ leadId, token, supabaseClient }: Props) {
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState<string | null>(null);
  const [refusing, setRefusing] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<string | null>(null);
  const [showRefuseModal, setShowRefuseModal] = useState<string | null>(null);
  const [refusalReason, setRefusalReason] = useState('');

  useEffect(() => {
    loadData();
  }, [leadId, token]);

  const handleValidateQuote = async (quoteId: string, companyName: string) => {
    if (!supabaseClient || !token) {
      alert('❌ Erreur de configuration. Veuillez recharger la page.');
      return;
    }

    setValidating(quoteId);
    try {
      // Utiliser la fonction RPC sécurisée pour valider le devis
      const { data, error } = await supabaseClient.rpc('validate_quote_by_token', {
        p_quote_id: quoteId,
        p_token: token
      });

      if (error) {
        console.error('Error calling validate_quote_by_token:', error);
        throw error;
      }

      // Vérifier le résultat de la fonction
      if (!data?.success) {
        throw new Error(data?.error || 'Erreur lors de la validation');
      }

      // Recharger les données
      await loadData();

      alert(`✅ Devis ${data.company_name || companyName} validé avec succès !\n\nNotre équipe a été notifiée et va vous recontacter très prochainement pour finaliser votre souscription.`);

      // Fermer le modal de confirmation
      setShowConfirmModal(null);
    } catch (error) {
      console.error('Error validating quote:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      alert(`❌ Erreur lors de la validation du devis: ${errorMessage}\n\nVeuillez réessayer ou nous contacter.`);
    } finally {
      setValidating(null);
    }
  };

  const handleRefuseQuote = async (quoteId: string, companyName: string) => {
    if (!supabaseClient || !token) {
      alert('❌ Erreur de configuration. Veuillez recharger la page.');
      return;
    }

    setRefusing(quoteId);
    try {
      // Utiliser la fonction RPC sécurisée pour refuser le devis
      const { data, error } = await supabaseClient.rpc('refuse_quote_by_token', {
        p_quote_id: quoteId,
        p_token: token,
        p_reason: refusalReason || null
      });

      if (error) {
        console.error('Error calling refuse_quote_by_token:', error);
        throw error;
      }

      // Vérifier le résultat de la fonction
      if (!data?.success) {
        throw new Error(data?.error || 'Erreur lors du refus');
      }

      // Recharger les données
      await loadData();

      alert(`Devis ${data.company_name || companyName} refusé.\n\nVous pouvez toujours consulter les autres devis disponibles.`);

      // Fermer le modal et réinitialiser
      setShowRefuseModal(null);
      setRefusalReason('');
    } catch (error) {
      console.error('Error refusing quote:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      alert(`❌ Erreur lors du refus du devis: ${errorMessage}\n\nVeuillez réessayer ou nous contacter.`);
    } finally {
      setRefusing(null);
    }
  };

  const loadData = async () => {
    if (!supabaseClient) return;

    try {
      setLoading(true);

      let quotesData: Quote[] = [];
      let currentLeadId = leadId;

      // Si on a un token, utiliser la fonction RPC pour récupérer les devis
      if (token) {
        const { data, error } = await supabaseClient.rpc('get_lead_quotes_by_token', {
          p_token: token
        });

        if (error) {
          console.error('Erreur RPC get_lead_quotes_by_token:', error);
          throw error;
        }

        quotesData = data || [];

        // Extraire les compagnies des devis retournés
        const companyIds = [...new Set(quotesData.map(q => q.company_id))];
        if (companyIds.length > 0) {
          const { data: companiesData, error: companiesError } = await supabaseClient
            .from('insurance_companies')
            .select('*')
            .in('id', companyIds)
            .eq('is_active', true)
            .order('priority_order');

          if (!companiesError) {
            setCompanies(companiesData || []);
          }
        }
      }
      // Sinon, utiliser le lead_id directement (mode authentifié)
      else if (leadId) {
        currentLeadId = leadId;

        const { data, error } = await supabaseClient
          .from('lead_company_quotes')
          .select('*')
          .eq('lead_id', currentLeadId)
          .not('quote_file_url', 'is', null)  // Seulement les devis avec fichiers
          .order('created_at', { ascending: false });

        if (error) throw error;
        quotesData = data || [];

        // Charger les compagnies d'assurance
        const { data: companiesData, error: companiesError } = await supabaseClient
          .from('insurance_companies')
          .select('*')
          .eq('is_mandatory', true)
          .eq('is_active', true)
          .order('priority_order');

        if (companiesError) throw companiesError;

        setCompanies(companiesData || []);
      }

      setQuotes(quotesData);
    } catch (error) {
      console.error('Erreur chargement devis:', error);
    } finally {
      setLoading(false);
    }
  };

  // Grouper les devis par compagnie
  const quotesByCompany = quotes.reduce((acc, quote) => {
    if (!acc[quote.company_id]) {
      acc[quote.company_id] = [];
    }
    acc[quote.company_id].push(quote);
    return acc;
  }, {} as Record<string, Quote[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-12 text-center">
        <AlertCircle className="w-16 h-16 text-gray-500 mx-auto mb-4" />
        <h3 className="font-bold text-xl text-white mb-2">Aucun devis disponible</h3>
        <p className="text-gray-400">
          Vos documents sont en cours de traitement. Vous recevrez une notification dès qu'un devis sera disponible.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="font-bold text-green-400">Vos devis sont prêts!</h4>
          <p className="text-sm text-gray-300 mt-1">
            {quotes.length} devis {quotes.length > 1 ? 'sont disponibles' : 'est disponible'} de {Object.keys(quotesByCompany).length} compagnie{Object.keys(quotesByCompany).length > 1 ? 's' : ''}.
            Consultez-les, téléchargez-les et contactez-nous pour souscrire.
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        {companies.map((company) => {
          const companyQuotes = quotesByCompany[company.id] || [];
          if (companyQuotes.length === 0) return null;

          return (
            <div key={company.id} className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-amber-500/50 transition-all">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  {company.logo_url ? (
                    <div className="w-16 h-16 bg-white rounded-lg p-2 flex items-center justify-center flex-shrink-0">
                      <img
                        src={company.logo_url}
                        alt={`Logo ${company.name}`}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  ) : company.name.toLowerCase().includes('simple') || company.code === 'PLUS_SIMPLE' ? (
                    <div className="w-16 h-16 bg-white rounded-lg p-2 flex items-center justify-center flex-shrink-0">
                      <img
                        src="/logo_plu_simple.png"
                        alt="Logo +Simple"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  ) : (
                    <Building2 className="w-12 h-12 text-amber-500" />
                  )}
                  <div>
                    <h4 className="font-bold text-2xl text-white">{company.name}</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      {companyQuotes.length} devis disponible{companyQuotes.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {companyQuotes.map((quote) => {
                  // Le quote_file_url est déjà une URL publique complète
                  const fileUrl = quote.quote_file_url;
                  // Extraire le nom du fichier de l'URL
                  const fileName = fileUrl.split('/').pop() || 'Devis.pdf';

                  return (
                    <div key={quote.id} className="bg-gray-900/50 border border-gray-700 rounded-lg p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-3 flex-1">
                          <FileText className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white text-lg mb-1 truncate">
                              {decodeURIComponent(fileName)}
                            </p>
                            <p className="text-sm text-gray-400">
                              {quote.submitted_at ? (
                                <>Uploadé le {new Date(quote.submitted_at).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })}</>
                              ) : (
                                <>Créé le {new Date(quote.created_at).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })}</>
                              )}
                            </p>
                            {quote.last_sent_at && (
                              <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Email envoyé le {new Date(quote.last_sent_at).toLocaleDateString('fr-FR')}
                              </p>
                            )}
                          </div>
                        </div>
                        {quote.quote_amount && (
                          <div className="text-right ml-4">
                            <div className="text-2xl font-bold text-amber-500">
                              {quote.quote_amount.toFixed(2)} €
                            </div>
                            <div className="text-xs text-gray-400">par an</div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-black font-semibold rounded-lg transition-all text-sm"
                        >
                          <Eye className="w-4 h-4" />
                          Consulter
                        </a>

                        <a
                          href={fileUrl}
                          download={fileName}
                          className="flex items-center gap-2 px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors text-sm"
                        >
                          <Download className="w-4 h-4" />
                          Télécharger
                        </a>

                        <button
                          onClick={() => window.open(fileUrl, '_blank')}
                          className="flex items-center gap-2 px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors text-sm"
                        >
                          <Printer className="w-4 h-4" />
                          Imprimer
                        </button>

                        {/* Boutons Valider et Refuser */}
                        {quote.status !== 'validated' && quote.status !== 'refused' && (
                          <>
                            <button
                              onClick={() => setShowRefuseModal(quote.id)}
                              disabled={refusing !== null || validating !== null}
                              className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
                            >
                              <X className="w-4 h-4" />
                              Refuser
                            </button>
                            <button
                              onClick={() => setShowConfirmModal(quote.id)}
                              disabled={validating !== null || refusing !== null}
                              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Check className="w-4 h-4" />
                              Valider ce devis
                            </button>
                          </>
                        )}

                        {quote.status === 'validated' && (
                          <div className="flex items-center gap-2 px-5 py-2.5 bg-green-600/20 border border-green-500 text-green-400 font-bold rounded-lg text-sm ml-auto">
                            <CheckCircle2 className="w-4 h-4" />
                            Devis validé
                          </div>
                        )}

                        {quote.status === 'refused' && (
                          <div className="flex items-center gap-2 px-5 py-2.5 bg-red-600/20 border border-red-500 text-red-400 font-semibold rounded-lg text-sm ml-auto">
                            <X className="w-4 h-4" />
                            Devis refusé
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Coordonnées TaxiAssur pour tous les devis */}
              <div className="mt-6 pt-6 border-t border-gray-700">
                <p className="text-sm text-gray-400 mb-3">Pour souscrire à cette offre, contactez-nous :</p>
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href="tel:0180855786"
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-semibold"
                  >
                    <span className="text-lg">📞</span>
                    01 80 85 57 86
                  </a>
                  <span className="text-gray-500">ou</span>
                  <a
                    href="mailto:team@taxiassur.com"
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors text-sm font-semibold"
                  >
                    <span className="text-lg">✉️</span>
                    team@taxiassur.com
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 mt-6">
        <h4 className="font-bold text-white mb-2">Besoin d'aide pour choisir ?</h4>
        <p className="text-gray-300 mb-4">
          Notre équipe est là pour vous accompagner et répondre à toutes vos questions.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="tel:0180855786"
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors"
          >
            <span className="text-xl">📞</span>
            01 80 85 57 86
          </a>
          <a
            href="mailto:team@taxiassur.com"
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors"
          >
            <span className="text-xl">✉️</span>
            team@taxiassur.com
          </a>
        </div>
      </div>

      {/* Modal de confirmation */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Valider ce devis ?</h3>
              <p className="text-gray-400">
                Vous êtes sur le point de valider ce devis. Notre équipe sera notifiée et vous recontactera pour finaliser votre souscription.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  const quote = quotes.find(q => q.id === showConfirmModal);
                  const company = companies.find(c => c.id === quote?.company_id);
                  if (quote && company) {
                    handleValidateQuote(quote.id, company.name);
                  }
                }}
                disabled={validating !== null}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {validating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Validation en cours...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Oui, valider ce devis
                  </>
                )}
              </button>

              <button
                onClick={() => setShowConfirmModal(null)}
                disabled={validating !== null}
                className="w-full px-6 py-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de refus */}
      {showRefuseModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Refuser ce devis ?</h3>
              <p className="text-gray-300">
                Vous pouvez indiquer la raison du refus (optionnel) pour nous aider à mieux vous servir.
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <textarea
                value={refusalReason}
                onChange={(e) => setRefusalReason(e.target.value)}
                placeholder="Raison du refus (optionnel)"
                rows={3}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-yellow-500 focus:outline-none resize-none"
              />
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  const quote = quotes.find(q => q.id === showRefuseModal);
                  const company = companies.find(c => c.id === quote?.company_id);
                  if (quote && company) {
                    handleRefuseQuote(quote.id, company.name);
                  }
                }}
                disabled={refusing !== null}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {refusing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Refus en cours...
                  </>
                ) : (
                  <>
                    <X className="w-5 h-5" />
                    Confirmer le refus
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setShowRefuseModal(null);
                  setRefusalReason('');
                }}
                disabled={refusing !== null}
                className="w-full px-6 py-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
