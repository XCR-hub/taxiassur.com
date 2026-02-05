import { useState, useEffect } from 'react';
import { Download, FileText, AlertCircle, CheckCircle2, Printer, Eye, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

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
}

export default function ClientQuotesViewer({ leadId, token }: Props) {
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [leadId, token]);

  const loadData = async () => {
    try {
      setLoading(true);

      let quotesData: Quote[] = [];
      let currentLeadId = leadId;

      // Si on a un token, récupérer le lead_id associé
      if (token && !leadId) {
        const { data: leadData, error: leadError } = await supabase.rpc('get_lead_by_token', {
          p_token: token
        });

        if (leadError) throw leadError;
        if (leadData && leadData.length > 0) {
          currentLeadId = leadData[0].id;
        }
      }

      // Charger les devis
      if (currentLeadId) {
        const { data, error } = await supabase
          .from('lead_company_quotes')
          .select('*')
          .eq('lead_id', currentLeadId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        quotesData = data || [];
      }

      // Charger les compagnies d'assurance
      const { data: companiesData, error: companiesError } = await supabase
        .from('insurance_companies')
        .select('*')
        .eq('is_mandatory', true)
        .eq('is_active', true)
        .order('priority_order');

      if (companiesError) throw companiesError;

      setCompanies(companiesData || []);
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
                  <Building2 className="w-12 h-12 text-amber-500" />
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
                          <FileText className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
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
                          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors text-sm"
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
                      </div>
                    </div>
                  );
                })}
              </div>

              {company.contact_phone && (
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <p className="text-sm text-gray-400 mb-3">Pour souscrire à cette offre, contactez-nous :</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <a
                      href={`tel:${company.contact_phone}`}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-semibold"
                    >
                      <span className="text-lg">📞</span>
                      {company.contact_phone}
                    </a>
                    {company.contact_email && (
                      <>
                        <span className="text-gray-500">ou</span>
                        <a
                          href={`mailto:${company.contact_email}`}
                          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors text-sm font-semibold"
                        >
                          <span className="text-lg">✉️</span>
                          {company.contact_email}
                        </a>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 mt-6">
        <h4 className="font-bold text-white mb-2">Besoin d'aide pour choisir ?</h4>
        <p className="text-gray-300 mb-4">
          Notre équipe est là pour vous accompagner et répondre à toutes vos questions.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="tel:0180857786"
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors"
          >
            <span className="text-xl">📞</span>
            01 80 85 77 86
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
    </div>
  );
}
