import { useState, useEffect } from 'react';
import { Upload, X, CheckCircle, XCircle, AlertCircle, FileText, Download, Eye, Mail, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface InsuranceCompany {
  id: string;
  code: string;
  name: string;
  is_mandatory: boolean;
  priority_order: number;
}

interface LeadQuote {
  id: string;
  company_id: string;
  status: string;
  quote_file_url: string | null;
  quote_amount: number | null;
  refusal_reason: string | null;
  notes: string | null;
  submitted_at: string | null;
  submitted_by: string | null;
  last_sent_at: string | null;
}

interface QuoteSummary {
  total_companies: number;
  quotes_pending: number;
  quotes_uploaded: number;
  quotes_refused_by_company: number;
  all_processed: boolean;
}

interface Props {
  leadId: string;
}

export default function LeadQuotesManager({ leadId }: Props) {
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [quotes, setQuotes] = useState<Map<string, LeadQuote>>(new Map());
  const [summary, setSummary] = useState<QuoteSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<{
    type: 'upload' | 'refuse';
    companyId: string;
    companyName: string;
  } | null>(null);

  const [uploadForm, setUploadForm] = useState({
    amount: '',
    reference: '',
    validUntil: '',
    file: null as File | null,
  });

  const [refuseForm, setRefuseForm] = useState({
    reason: '',
  });

  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [emailModal, setEmailModal] = useState<{
    companyId: string;
    companyName: string;
    quoteAmount: number | null;
    quoteUrl: string;
  } | null>(null);
  const [emailMessage, setEmailMessage] = useState('');

  useEffect(() => {
    loadData();
  }, [leadId]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [companiesRes, quotesRes, summaryRes] = await Promise.all([
        supabase
          .from('insurance_companies')
          .select('*')
          .eq('is_mandatory', true)
          .order('priority_order'),

        supabase
          .from('lead_company_quotes')
          .select('*')
          .eq('lead_id', leadId),

        supabase.rpc('get_lead_quotes_summary', { lead_id_param: leadId })
      ]);

      if (companiesRes.error) throw companiesRes.error;
      if (quotesRes.error) throw quotesRes.error;

      setCompanies(companiesRes.data || []);

      const quotesMap = new Map<string, LeadQuote>();
      (quotesRes.data || []).forEach((quote: LeadQuote) => {
        quotesMap.set(quote.company_id, quote);
      });
      setQuotes(quotesMap);

      if (summaryRes.data && summaryRes.data.length > 0) {
        setSummary(summaryRes.data[0]);
      }
    } catch (error) {
      console.error('Erreur chargement devis:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadQuote = async () => {
    if (!activeModal || !uploadForm.file) {
      alert('Fichier requis');
      return;
    }

    try {
      setUploading(activeModal.companyId);

      const fileExt = uploadForm.file.name.split('.').pop();
      const fileName = `quotes/${leadId}/${activeModal.companyId}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, uploadForm.file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      const { data: adminData } = await supabase.auth.getUser();

      const { error: updateError } = await supabase
        .from('lead_company_quotes')
        .upsert({
          lead_id: leadId,
          company_id: activeModal.companyId,
          status: 'quote_submitted',
          quote_file_url: publicUrl,
          quote_amount: uploadForm.amount ? parseFloat(uploadForm.amount) : null,
          submitted_at: new Date().toISOString(),
          submitted_by: adminData?.user?.id,
          updated_at: new Date().toISOString(),
          notes: uploadForm.reference ? `Référence: ${uploadForm.reference}${uploadForm.validUntil ? ` - Valide jusqu'au: ${uploadForm.validUntil}` : ''}` : null,
        }, {
          onConflict: 'lead_id,company_id'
        });

      if (updateError) throw updateError;

      setActiveModal(null);
      setUploadForm({ amount: '', reference: '', validUntil: '', file: null });
      loadData();
    } catch (error: any) {
      console.error('Erreur upload devis:', error);
      alert(error.message || 'Erreur lors de l\'upload du devis');
    } finally {
      setUploading(null);
    }
  };

  const handleRefuseQuote = async () => {
    if (!activeModal || !refuseForm.reason) {
      alert('Motif de refus requis');
      return;
    }

    try {
      setUploading(activeModal.companyId);

      const { error } = await supabase
        .from('lead_company_quotes')
        .upsert({
          lead_id: leadId,
          company_id: activeModal.companyId,
          status: 'refused',
          refusal_reason: refuseForm.reason,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'lead_id,company_id'
        });

      if (error) throw error;

      setActiveModal(null);
      setRefuseForm({ reason: '' });
      loadData();
    } catch (error: any) {
      console.error('Erreur refus devis:', error);
      alert(error.message || 'Erreur lors du refus du devis');
    } finally {
      setUploading(null);
    }
  };

  const handleSendQuoteEmail = async () => {
    if (!emailModal) return;

    try {
      setSendingEmail(emailModal.companyId);

      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      // Créer un timeout de 60 secondes
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/send-quote-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || anonKey}`,
          },
          body: JSON.stringify({
            lead_id: leadId,
            company_id: emailModal.companyId,
            company_name: emailModal.companyName,
            quote_file_url: emailModal.quoteUrl,
            quote_amount: emailModal.quoteAmount,
            personal_message: emailMessage || undefined,
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const result = await response.json().catch(() => ({ error: 'Erreur réseau' }));
          throw new Error(result.error || `Erreur ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        alert(`✅ Devis envoyé avec succès à ${result.to}`);
        setEmailModal(null);
        setEmailMessage('');
        loadData();
      } catch (fetchError: any) {
        clearTimeout(timeoutId);

        if (fetchError.name === 'AbortError') {
          throw new Error('⏱️ L\'envoi a pris trop de temps. Le devis est peut-être en cours d\'envoi. Veuillez vérifier dans quelques instants.');
        }
        throw fetchError;
      }
    } catch (error: any) {
      console.error('Erreur envoi email devis:', error);
      alert(error.message || 'Erreur lors de l\'envoi de l\'email');
    } finally {
      setSendingEmail(null);
    }
  };

  const getQuoteStatus = (companyId: string) => {
    const quote = quotes.get(companyId);
    if (!quote) return 'pending';
    return quote.status;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> En attente</span>;
      case 'quote_submitted':
      case 'quote_uploaded':
        return <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Devis uploadé</span>;
      case 'refused':
      case 'refused_by_company':
        return <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-800 flex items-center gap-1"><XCircle className="w-3 h-3" /> Refusé</span>;
      case 'validated':
      case 'accepted_by_client':
        return <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Accepté par client</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Chargement des devis...</div>;
  }

  return (
    <div className="space-y-4">
      {summary && (
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Progression des devis</h3>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Total</div>
              <div className="text-2xl font-bold">{summary.total_companies}</div>
            </div>
            <div>
              <div className="text-gray-600">En attente</div>
              <div className="text-2xl font-bold text-yellow-600">{summary.quotes_pending}</div>
            </div>
            <div>
              <div className="text-gray-600">Uploadés</div>
              <div className="text-2xl font-bold text-green-600">{summary.quotes_uploaded}</div>
            </div>
            <div>
              <div className="text-gray-600">Refusés</div>
              <div className="text-2xl font-bold text-red-600">{summary.quotes_refused_by_company}</div>
            </div>
          </div>
          {summary.all_processed && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
              Tous les devis ont été traités! Le prospect peut maintenant consulter les offres disponibles.
            </div>
          )}
        </div>
      )}

      <div className="bg-white border rounded-lg">
        <div className="p-4 border-b">
          <h3 className="font-semibold">5 Compagnies Obligatoires</h3>
          <p className="text-sm text-gray-600 mt-1">
            Vous devez traiter chaque compagnie : soit uploader un devis, soit indiquer un refus avec motif.
          </p>
        </div>

        <div className="divide-y">
          {companies.map((company) => {
            const status = getQuoteStatus(company.id);
            const quote = quotes.get(company.id);

            return (
              <div key={company.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900">{company.name}</span>
                      {getStatusBadge(status)}
                    </div>

                    {quote?.quote_amount && (
                      <div className="text-sm text-gray-600 mt-1">
                        Montant: {quote.quote_amount.toFixed(2)} €
                        {quote.notes && ` • ${quote.notes}`}
                      </div>
                    )}

                    {quote?.refusal_reason && (
                      <div className="text-sm text-red-600 mt-1">
                        Motif de refus: {quote.refusal_reason}
                      </div>
                    )}

                    {quote?.last_sent_at && (
                      <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Envoyé par email le {new Date(quote.last_sent_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {status === 'pending' && (
                      <>
                        <button
                          onClick={() => setActiveModal({ type: 'upload', companyId: company.id, companyName: company.name })}
                          className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 text-sm"
                        >
                          <Upload className="w-4 h-4" />
                          Uploader devis
                        </button>
                        <button
                          onClick={() => setActiveModal({ type: 'refuse', companyId: company.id, companyName: company.name })}
                          className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2 text-sm"
                        >
                          <X className="w-4 h-4" />
                          Refuser
                        </button>
                      </>
                    )}

                    {(status === 'quote_submitted' || status === 'validated') && quote?.quote_file_url && (
                      <>
                        <button
                          onClick={() => setEmailModal({
                            companyId: company.id,
                            companyName: company.name,
                            quoteAmount: quote.quote_amount,
                            quoteUrl: quote.quote_file_url!
                          })}
                          disabled={sendingEmail === company.id}
                          className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2 text-sm disabled:opacity-50"
                        >
                          <Mail className="w-4 h-4" />
                          {sendingEmail === company.id ? 'Envoi...' : 'Envoyer par email'}
                        </button>
                        <a
                          href={quote.quote_file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-2 text-sm"
                        >
                          <Eye className="w-4 h-4" />
                          Voir
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {emailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Mail className="w-5 h-5 text-green-600" />
                Envoyer le devis par email
              </h3>
              <button
                onClick={() => {
                  setEmailModal(null);
                  setEmailMessage('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Devis : </strong>{emailModal.companyName}
                </p>
                {emailModal.quoteAmount && (
                  <p className="text-sm text-blue-800 mt-1">
                    <strong>Montant : </strong>{emailModal.quoteAmount.toFixed(2)} €/an
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message personnalisé (optionnel)
                </label>
                <textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  rows={5}
                  className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-gray-900 placeholder-gray-400"
                  placeholder="Ajoutez un message personnalisé pour votre prospect..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ce message sera affiché dans l'email envoyé au prospect avec le devis en pièce jointe.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSendQuoteEmail}
                  disabled={sendingEmail === emailModal.companyId}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold"
                >
                  <Send className="w-4 h-4" />
                  {sendingEmail === emailModal.companyId ? 'Envoi en cours...' : 'Envoyer le devis'}
                </button>
                <button
                  onClick={() => {
                    setEmailModal(null);
                    setEmailMessage('');
                  }}
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  disabled={sendingEmail === emailModal.companyId}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {activeModal.type === 'upload' ? 'Uploader un devis' : 'Refuser le devis'} - {activeModal.companyName}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeModal.type === 'upload' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fichier PDF du devis *
                  </label>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                    className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {uploadForm.file && (
                    <p className="text-sm text-green-600 mt-1">
                      ✓ {uploadForm.file.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Montant annuel (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={uploadForm.amount}
                    onChange={(e) => setUploadForm({ ...uploadForm, amount: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-gray-900 placeholder-gray-400"
                    placeholder="ex: 1200.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Référence devis
                  </label>
                  <input
                    type="text"
                    value={uploadForm.reference}
                    onChange={(e) => setUploadForm({ ...uploadForm, reference: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-gray-900 placeholder-gray-400"
                    placeholder="ex: DEV-2024-12345"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valide jusqu'au
                  </label>
                  <input
                    type="date"
                    value={uploadForm.validUntil}
                    onChange={(e) => setUploadForm({ ...uploadForm, validUntil: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-gray-900"
                    style={{ colorScheme: 'light' }}
                  />
                </div>

                <button
                  onClick={handleUploadQuote}
                  disabled={!uploadForm.file || uploading === activeModal.companyId}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading === activeModal.companyId ? 'Upload en cours...' : 'Uploader le devis'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Motif de refus *
                  </label>
                  <textarea
                    value={refuseForm.reason}
                    onChange={(e) => setRefuseForm({ reason: e.target.value })}
                    rows={4}
                    className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-gray-900 placeholder-gray-400"
                    placeholder="Indiquez pourquoi cette compagnie refuse de faire un devis (ex: profil trop risqué, zone non couverte, etc.)"
                  />
                </div>

                <button
                  onClick={handleRefuseQuote}
                  disabled={!refuseForm.reason || uploading === activeModal.companyId}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading === activeModal.companyId ? 'Enregistrement...' : 'Confirmer le refus'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
