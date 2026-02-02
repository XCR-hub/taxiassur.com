import { useState, useEffect } from 'react';
import { Download, FileText, AlertCircle, CheckCircle2, Printer, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface InsuranceCompany {
  id: string;
  code: string;
  name: string;
  logo_url: string | null;
  contact_phone: string | null;
  assistance_phone: string | null;
}

interface LeadQuote {
  id: string;
  lead_id: string;
  company_id: string;
  status: string;
  quote_file_url: string | null;
  quote_amount: number | null;
  refusal_reason: string | null;
  submitted_at: string | null;
  validated_at: string | null;
  sent_to_client_at: string | null;
  notes: string | null;
  created_at: string;
}

interface Props {
  leadId?: string;
  token?: string;
}

export default function ClientQuotesViewer({ leadId, token }: Props) {
  const [companies, setCompanies] = useState<Map<string, InsuranceCompany>>(new Map());
  const [quotes, setQuotes] = useState<LeadQuote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [leadId, token]);

  const loadData = async () => {
    try {
      setLoading(true);

      let quotesData: LeadQuote[] = [];

      // Si on a un token, utiliser la fonction RPC pour l'accès anonyme
      if (token) {
        const { data, error } = await supabase.rpc('get_lead_quotes_by_token', {
          p_token: token
        });

        if (error) throw error;
        quotesData = data || [];
      }
      // Sinon utiliser l'accès authentifié classique
      else if (leadId) {
        const { data, error } = await supabase
          .from('lead_company_quotes')
          .select('*')
          .eq('lead_id', leadId)
          .in('status', ['quote_submitted', 'validated']);

        if (error) throw error;
        quotesData = data || [];
      }

      // Charger les compagnies d'assurance
      const { data: companiesData, error: companiesError } = await supabase
        .from('insurance_companies')
        .select('*')
        .eq('is_mandatory', true);

      if (companiesError) throw companiesError;

      const companiesMap = new Map<string, InsuranceCompany>();
      (companiesData || []).forEach((company: InsuranceCompany) => {
        companiesMap.set(company.id, company);
      });
      setCompanies(companiesMap);
      setQuotes(quotesData);
    } catch (error) {
      console.error('Erreur chargement devis:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = (quote: LeadQuote) => {
    if (quote.quote_file_url) {
      window.open(quote.quote_file_url, '_blank');
    }
  };

  const availableQuotes = quotes.filter(q => q.quote_file_url);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (availableQuotes.length === 0) {
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
            {availableQuotes.length} devis {availableQuotes.length > 1 ? 'sont disponibles' : 'est disponible'} ci-dessous.
            Consultez-les, téléchargez-les et contactez-nous pour souscrire.
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {availableQuotes.map((quote) => {
          const company = companies.get(quote.company_id);
          if (!company) return null;

          return (
            <div key={quote.id} className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-amber-500/50 transition-all">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {company.logo_url && (
                      <img
                        src={company.logo_url}
                        alt={company.name}
                        className="h-12 w-auto object-contain bg-white rounded p-1"
                      />
                    )}
                    <h4 className="font-bold text-xl text-white">{company.name}</h4>
                  </div>
                  {quote.notes && (
                    <p className="text-sm text-gray-400 mt-2">{quote.notes}</p>
                  )}
                </div>

                {quote.quote_amount && (
                  <div className="text-right ml-4">
                    <div className="text-3xl font-bold text-amber-500">
                      {quote.quote_amount.toFixed(2)} €
                    </div>
                    <div className="text-sm text-gray-400">par an</div>
                  </div>
                )}
              </div>

              {quote.submitted_at && (
                <div className="mb-4 text-sm text-gray-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span>
                    Devis reçu le {new Date(quote.submitted_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={quote.quote_file_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                >
                  <Eye className="w-5 h-5" />
                  Consulter le devis
                </a>

                <a
                  href={quote.quote_file_url!}
                  download
                  className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Télécharger
                </a>

                <button
                  onClick={() => handlePrint(quote)}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                >
                  <Printer className="w-5 h-5" />
                  Imprimer
                </button>
              </div>

              {company.contact_phone && (
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <p className="text-sm text-gray-400 mb-2">Pour souscrire à cette offre, contactez-nous :</p>
                  <div className="flex items-center gap-4">
                    <a
                      href={`tel:${company.contact_phone}`}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-semibold"
                    >
                      <span className="text-lg">📞</span>
                      {company.contact_phone}
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
