import { useState, useEffect } from 'react';
import { Download, Check, X, FileText, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
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
  company_id: string;
  status: string;
  quote_file_url: string | null;
  quote_amount: number | null;
  quote_reference: string | null;
  quote_valid_until: string | null;
  company_refusal_reason: string | null;
  client_refusal_comment: string | null;
  client_accepted_at: string | null;
}

interface RefusalMotive {
  id: string;
  code: string;
  label: string;
  category: string;
}

interface Props {
  leadId: string;
}

export default function ClientQuotesViewer({ leadId }: Props) {
  const [companies, setCompanies] = useState<Map<string, InsuranceCompany>>(new Map());
  const [quotes, setQuotes] = useState<LeadQuote[]>([]);
  const [refusalMotives, setRefusalMotives] = useState<RefusalMotive[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingQuoteId, setProcessingQuoteId] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<{
    type: 'accept' | 'refuse';
    quote: LeadQuote;
  } | null>(null);
  const [refusalForm, setRefusalForm] = useState({
    motiveId: '',
    comment: '',
  });

  useEffect(() => {
    loadData();
  }, [leadId]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [companiesRes, quotesRes, motivesRes] = await Promise.all([
        supabase
          .from('insurance_companies')
          .select('*')
          .eq('is_mandatory', true),

        supabase
          .from('lead_quotes')
          .select('*')
          .eq('lead_id', leadId)
          .in('status', ['quote_uploaded', 'accepted_by_client', 'refused_by_client']),

        supabase
          .from('quote_refusal_motives')
          .select('*')
          .eq('is_active', true)
          .order('display_order')
      ]);

      if (companiesRes.error) throw companiesRes.error;
      if (quotesRes.error) throw quotesRes.error;
      if (motivesRes.error) throw motivesRes.error;

      const companiesMap = new Map<string, InsuranceCompany>();
      (companiesRes.data || []).forEach((company: InsuranceCompany) => {
        companiesMap.set(company.id, company);
      });
      setCompanies(companiesMap);

      setQuotes(quotesRes.data || []);
      setRefusalMotives(motivesRes.data || []);
    } catch (error) {
      console.error('Erreur chargement devis:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptQuote = async () => {
    if (!activeModal || activeModal.type !== 'accept') return;

    try {
      setProcessingQuoteId(activeModal.quote.id);

      const { error } = await supabase
        .from('lead_quotes')
        .update({
          status: 'accepted_by_client',
          client_accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', activeModal.quote.id);

      if (error) throw error;

      alert('Devis accepté avec succès! Vous allez recevoir les prochaines étapes par email.');
      setActiveModal(null);
      loadData();
    } catch (error: any) {
      console.error('Erreur acceptation devis:', error);
      alert(error.message || 'Erreur lors de l\'acceptation du devis');
    } finally {
      setProcessingQuoteId(null);
    }
  };

  const handleRefuseQuote = async () => {
    if (!activeModal || activeModal.type !== 'refuse' || !refusalForm.motiveId) {
      alert('Veuillez sélectionner un motif de refus');
      return;
    }

    try {
      setProcessingQuoteId(activeModal.quote.id);

      const { error } = await supabase
        .from('lead_quotes')
        .update({
          status: 'refused_by_client',
          client_refusal_motive_id: refusalForm.motiveId,
          client_refusal_comment: refusalForm.comment || null,
          client_refused_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', activeModal.quote.id);

      if (error) throw error;

      setActiveModal(null);
      setRefusalForm({ motiveId: '', comment: '' });
      loadData();
    } catch (error: any) {
      console.error('Erreur refus devis:', error);
      alert(error.message || 'Erreur lors du refus du devis');
    } finally {
      setProcessingQuoteId(null);
    }
  };

  const availableQuotes = quotes.filter(q => q.status === 'quote_uploaded');
  const acceptedQuotes = quotes.filter(q => q.status === 'accepted_by_client');
  const refusedQuotes = quotes.filter(q => q.status === 'refused_by_client');
  const hasAcceptedQuote = acceptedQuotes.length > 0;

  if (loading) {
    return <div className="p-4 text-center">Chargement des devis...</div>;
  }

  if (quotes.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-8 text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="font-semibold text-lg mb-2">Aucun devis disponible</h3>
        <p className="text-gray-600">
          Vos documents sont en cours de traitement. Vous recevrez une notification dès qu'un devis sera disponible.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {hasAcceptedQuote && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-green-900">Devis accepté!</h4>
            <p className="text-sm text-green-700 mt-1">
              Vous avez accepté un devis. Notre équipe va maintenant préparer votre contrat.
              Vous recevrez prochainement vos coordonnées bancaires à renseigner.
            </p>
          </div>
        </div>
      )}

      {availableQuotes.length > 0 && (
        <div>
          <h3 className="font-semibold text-lg mb-4">Devis disponibles ({availableQuotes.length})</h3>
          <div className="grid gap-4">
            {availableQuotes.map((quote) => {
              const company = companies.get(quote.company_id);
              if (!company) return null;

              return (
                <div key={quote.id} className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-lg">{company.name}</h4>
                      {quote.quote_reference && (
                        <p className="text-sm text-gray-600">Réf: {quote.quote_reference}</p>
                      )}
                    </div>
                    {quote.quote_amount && (
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          {quote.quote_amount.toFixed(2)} €
                        </div>
                        <div className="text-sm text-gray-600">par an</div>
                      </div>
                    )}
                  </div>

                  {quote.quote_valid_until && (
                    <div className="mb-4 text-sm text-gray-600">
                      Valide jusqu'au {new Date(quote.quote_valid_until).toLocaleDateString('fr-FR')}
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    {quote.quote_file_url && (
                      <a
                        href={quote.quote_file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm"
                      >
                        <Download className="w-4 h-4" />
                        Télécharger le devis
                      </a>
                    )}

                    {!hasAcceptedQuote && (
                      <>
                        <button
                          onClick={() => setActiveModal({ type: 'accept', quote })}
                          disabled={processingQuoteId === quote.id}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
                        >
                          <Check className="w-4 h-4" />
                          Accepter ce devis
                        </button>

                        <button
                          onClick={() => setActiveModal({ type: 'refuse', quote })}
                          disabled={processingQuoteId === quote.id}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-sm"
                        >
                          <X className="w-4 h-4" />
                          Refuser
                        </button>
                      </>
                    )}
                  </div>

                  {company.contact_phone && (
                    <div className="mt-4 pt-4 border-t text-sm text-gray-600">
                      Contact: {company.contact_phone}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {acceptedQuotes.length > 0 && (
        <div>
          <h3 className="font-semibold text-lg mb-4">Devis accepté</h3>
          <div className="grid gap-4">
            {acceptedQuotes.map((quote) => {
              const company = companies.get(quote.company_id);
              if (!company) return null;

              return (
                <div key={quote.id} className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold">{company.name}</h4>
                      {quote.quote_amount && (
                        <p className="text-lg font-bold text-green-700 mt-1">
                          {quote.quote_amount.toFixed(2)} € / an
                        </p>
                      )}
                      {quote.client_accepted_at && (
                        <p className="text-sm text-green-600 mt-2">
                          Accepté le {new Date(quote.client_accepted_at).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                    {quote.quote_file_url && (
                      <a
                        href={quote.quote_file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 border border-green-300 rounded hover:bg-green-100 text-sm flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Voir devis
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {refusedQuotes.length > 0 && (
        <div>
          <h3 className="font-semibold text-lg mb-4">Devis refusés</h3>
          <div className="grid gap-4">
            {refusedQuotes.map((quote) => {
              const company = companies.get(quote.company_id);
              if (!company) return null;

              return (
                <div key={quote.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-gray-700">{company.name}</h4>
                      {quote.client_refusal_comment && (
                        <p className="text-sm text-gray-600 mt-1">{quote.client_refusal_comment}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {activeModal.type === 'accept' ? 'Accepter le devis' : 'Refuser le devis'}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeModal.type === 'accept' ? (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded p-4">
                  <p className="text-sm text-blue-800">
                    En acceptant ce devis, vous confirmez vouloir souscrire à cette offre.
                    Vous ne pourrez plus accepter d'autre devis.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setActiveModal(null)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleAcceptQuote}
                    disabled={processingQuoteId === activeModal.quote.id}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    Confirmer
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pourquoi refusez-vous ce devis? *
                  </label>
                  <select
                    value={refusalForm.motiveId}
                    onChange={(e) => setRefusalForm({ ...refusalForm, motiveId: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">Sélectionnez un motif</option>
                    {refusalMotives.map((motive) => (
                      <option key={motive.id} value={motive.id}>
                        {motive.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Commentaire (optionnel)
                  </label>
                  <textarea
                    value={refusalForm.comment}
                    onChange={(e) => setRefusalForm({ ...refusalForm, comment: e.target.value })}
                    rows={3}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Ajoutez un commentaire si nécessaire..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setActiveModal(null)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleRefuseQuote}
                    disabled={!refusalForm.motiveId || processingQuoteId === activeModal.quote.id}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    Confirmer le refus
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
