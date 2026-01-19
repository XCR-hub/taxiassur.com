import { useState, useEffect } from 'react';
import { Upload, X, CheckCircle, XCircle, AlertCircle, FileText, Download, Eye } from 'lucide-react';
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
  quote_reference: string | null;
  quote_valid_until: string | null;
  company_refusal_reason: string | null;
  uploaded_at: string | null;
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
          .from('lead_quotes')
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
        .from('lead_quotes')
        .update({
          status: 'quote_uploaded',
          quote_file_url: publicUrl,
          quote_amount: uploadForm.amount ? parseFloat(uploadForm.amount) : null,
          quote_reference: uploadForm.reference || null,
          quote_valid_until: uploadForm.validUntil || null,
          uploaded_at: new Date().toISOString(),
          uploaded_by: adminData?.user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq('lead_id', leadId)
        .eq('company_id', activeModal.companyId);

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
        .from('lead_quotes')
        .update({
          status: 'refused_by_company',
          company_refusal_reason: refuseForm.reason,
          company_refused_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('lead_id', leadId)
        .eq('company_id', activeModal.companyId);

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

  const getQuoteStatus = (companyId: string) => {
    const quote = quotes.get(companyId);
    if (!quote) return 'pending';
    return quote.status;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> En attente</span>;
      case 'quote_uploaded':
        return <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Devis uploadé</span>;
      case 'refused_by_company':
        return <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-800 flex items-center gap-1"><XCircle className="w-3 h-3" /> Refusé</span>;
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
                        {quote.quote_reference && ` • Référence: ${quote.quote_reference}`}
                      </div>
                    )}

                    {quote?.company_refusal_reason && (
                      <div className="text-sm text-red-600 mt-1">
                        Motif de refus: {quote.company_refusal_reason}
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

                    {status === 'quote_uploaded' && quote?.quote_file_url && (
                      <a
                        href={quote.quote_file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-2 text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        Voir devis
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
                    className="w-full border rounded px-3 py-2"
                  />
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
                    className="w-full border rounded px-3 py-2"
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
                    className="w-full border rounded px-3 py-2"
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
                    className="w-full border rounded px-3 py-2"
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
                    className="w-full border rounded px-3 py-2"
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
