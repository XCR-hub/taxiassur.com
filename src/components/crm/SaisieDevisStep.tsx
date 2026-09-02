import { useState, useEffect } from 'react';
import { nativeAdminCall, nativeAdminCompanyDocumentUrl, nativeAdminLead, nativeAdminUploadQuoteDocument } from '@/lib/native-admin-data';
import { Upload, CheckCircle2, X, FileText, Send, Loader2, Building2, AlertCircle, Plus, CheckCheck, Mail } from 'lucide-react';
import { toast } from '@/lib/toast';
import SubmitQuoteModal from './SubmitQuoteModal';
import SendToInsurerModal from './SendToInsurerModal';
import { companyVisualStyle } from '@/lib/company-visual-style';

interface SaisieDevisStepProps {
  leadId: string;
  leadEmail?: string;
  leadFirstName?: string;
  leadAccessToken?: string;
  onComplete?: () => void;
}

interface InsuranceCompany {
  id: string;
  name: string;
  code: string;
  logo_url?: string;
  is_mandatory: boolean;
}

interface Quote {
  id: string;
  company_id: string;
  quote_pdf_url: string;
  quote_amount?: number;
  last_sent_at?: string;
  submitted_at?: string;
  sent_to_client_at?: string | null;
  status: string;
  company?: InsuranceCompany;
}

export default function SaisieDevisStep({
  leadId,
  leadEmail,
  leadFirstName,
  leadAccessToken,
  onComplete
}: SaisieDevisStepProps) {
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [companyLogoUrls, setCompanyLogoUrls] = useState<Record<string, string>>({});
  const [logoErrors, setLogoErrors] = useState<Set<string>>(new Set());
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dragOverCompanyId, setDragOverCompanyId] = useState<string | null>(null);
  const [openModalQuote, setOpenModalQuote] = useState<Quote | null>(null);

  useEffect(() => {
    let active = true;
    const objectUrls: string[] = [];
    void Promise.all(companies.map(async company => {
      const rawUrl = String(company.logo_url || '').trim();
      if (!rawUrl) return [company.id, ''] as const;
      const documentId = rawUrl.match(/\/company-documents\/([0-9a-f-]{36})\/download/i)?.[1];
      if (!documentId) return [company.id, rawUrl] as const;
      try {
        const securedUrl = await nativeAdminCompanyDocumentUrl(documentId);
        objectUrls.push(securedUrl);
        return [company.id, securedUrl] as const;
      } catch {
        return [company.id, ''] as const;
      }
    })).then(entries => {
      if (active) {
        setCompanyLogoUrls(Object.fromEntries(entries));
        setLogoErrors(new Set());
      }
    });
    return () => {
      active = false;
      objectUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [companies]);
  const [showSendToInsurer, setShowSendToInsurer] = useState(false);
  const [leadFullName, setLeadFullName] = useState('');
  const [leadPhone, setLeadPhone] = useState<string | undefined>();

  const handleFileSelected = (companyId: string, file: File | undefined | null) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Seuls les fichiers PDF sont acceptés');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Le fichier dépasse 10 MB');
      return;
    }
    uploadQuote(companyId, file);
  };

  useEffect(() => {
    loadCompanies();
    loadQuotes();
  }, [leadId]);

  useEffect(() => {
    async function fetchLeadInfo() {
      try {
        const response = await nativeAdminLead(leadId) as { lead?: { first_name?: string; last_name?: string; phone?: string } };
        const lead = response.lead;
        if (lead) {
          setLeadFullName([lead.first_name, lead.last_name].filter(Boolean).join(' '));
          setLeadPhone(lead.phone || undefined);
        }
      } catch (error) {
        console.error('Error loading lead information:', error);
      }
    }
    fetchLeadInfo();
  }, [leadId]);

  useEffect(() => {
    // Check if all mandatory companies have at least 1 quote with a file (Swisslife RC Pro is optional)
    const mandatoryIds = new Set(companies.filter(c => c.code !== 'SWISSLIFE_RCPRO').map(c => c.id));
    const quotesWithFiles = quotes.filter(q => q.quote_pdf_url && q.quote_pdf_url.trim() !== '');
    const companiesWithQuotes = new Set(quotesWithFiles.map(q => q.company_id).filter(id => mandatoryIds.has(id)));
    if (mandatoryIds.size > 0 && companiesWithQuotes.size >= mandatoryIds.size) {
      onComplete?.();
    }
  }, [quotes, companies]);

  async function loadCompanies() {
    try {
      const response = await nativeAdminCall<{ companies?: InsuranceCompany[] }>('/v1/admin/insurance-companies');
      setCompanies((response.companies || [])
        .filter(company => company.is_mandatory || company.code === 'SWISSLIFE_RCPRO')
        .sort((a: any, b: any) => Number(a.priority_order || 0) - Number(b.priority_order || 0)));
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadQuotes() {
    try {
      const response = await nativeAdminCall<{ workspace?: { quotes?: Quote[] } }>(
        `/v1/admin/leads/${encodeURIComponent(leadId)}/quotes-workspace`,
      );
      const rows = (response.workspace?.quotes || []).map((q: any) => {
        const url = (q.quote_pdf_url && String(q.quote_pdf_url).trim())
          || (q.quote_file_url && String(q.quote_file_url).trim())
          || '';
        return { ...q, quote_pdf_url: url };
      }).filter((q: any) => q.quote_pdf_url !== '');
      setQuotes(rows);
    } catch (error) {
      console.error('Error loading quotes:', error);
      toast.error('Erreur chargement des devis: ' + ((error as any)?.message || ''));
    }
  }

  async function uploadQuote(companyId: string, file: File) {
    setUploading(companyId);

    try {
      const workspace = await nativeAdminCall<{ workspace?: { quotes?: Quote[] } }>(
        `/v1/admin/leads/${encodeURIComponent(leadId)}/quotes-workspace`,
      );
      const nativeQuote = (workspace.workspace?.quotes || []).find(
        (row) => String(row.company_id) === String(companyId),
      );
      if (!nativeQuote?.id) throw new Error('Devis compagnie introuvable');
      await nativeAdminUploadQuoteDocument(leadId, nativeQuote.id, file);
      const nativeCompany = companies.find((company) => company.id === companyId);
      toast.success(`Devis ${nativeCompany?.name || ''} uploadé avec succès !`);
      await loadQuotes();
    } catch (error) {
      console.error('Error uploading quote:', error);
      toast.error(`❌ Erreur lors de l'upload du devis\n\n${error.message || error}`);
    } finally {
      setUploading(null);
    }
  }

  async function resendQuoteEmail(quote: Quote) {
    const company = companies.find(c => c.id === quote.company_id);
    if (company) {
      setSending(company.id);
      try {
        const result = await nativeAdminCall<{ email_queued?: boolean }>(
          `/v1/admin/leads/${encodeURIComponent(leadId)}/quotes/${encodeURIComponent(quote.id)}/email`,
          { method: 'POST', body: '{}' },
        );
        if (!result.email_queued) throw new Error('Email non mis en file d\'envoi');
        await loadQuotes();
        toast.success('Email renvoyé avec succès !');
      } catch (error) {
        console.error('Error resending quote email:', error);
        toast.error("Erreur lors de l'envoi de l'email");
      } finally {
        setSending(null);
      }
    }
  }

  async function deleteQuote(quoteId: string, _fileUrl: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce devis ?')) return;

    try {
      await nativeAdminCall(
        `/v1/admin/leads/${encodeURIComponent(leadId)}/quotes/${encodeURIComponent(quoteId)}/document`,
        { method: 'DELETE' },
      );

      toast.success('✅ Devis supprimé avec succès !');
      await loadQuotes();
    } catch (error) {
      console.error('Error deleting quote:', error);
      toast.error('❌ Erreur lors de la suppression');
    }
  }

  const getQuotesForCompany = (companyId: string) => {
    return quotes.filter(q => q.company_id === companyId);
  };

  // Only count mandatory companies with uploaded files (Swisslife RC Pro is optional)
  const mandatoryCompanies = companies.filter(c => c.code !== 'SWISSLIFE_RCPRO');
  const mandatoryIds = new Set(mandatoryCompanies.map(c => c.id));
  const quotesWithFiles = quotes.filter(q => q.quote_pdf_url && q.quote_pdf_url.trim() !== '');
  const companiesWithQuotes = new Set(quotesWithFiles.map(q => q.company_id).filter(id => mandatoryIds.has(id)));
  const progressPercent = mandatoryCompanies.length > 0
    ? Math.round((companiesWithQuotes.size / mandatoryCompanies.length) * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Progression des Devis
          </h3>
          <div className="flex items-center gap-2">
            {progressPercent === 100 ? (
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            ) : (
              <AlertCircle className="h-6 w-6 text-orange-600" />
            )}
            <span className="text-2xl font-bold text-gray-900">
              {companiesWithQuotes.size}/{mandatoryCompanies.length}
            </span>
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              progressPercent === 100 ? 'bg-green-600' : 'bg-blue-600'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="text-sm text-gray-600 text-center">
          {quotesWithFiles.length} devis uploadé{quotesWithFiles.length > 1 ? 's' : ''} au total
          {quotes.length > quotesWithFiles.length && (
            <span className="text-orange-600 ml-2">
              ({quotes.length - quotesWithFiles.length} en attente)
            </span>
          )}
        </div>
      </div>

      {/* Transmettre le dossier a l'assureur */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Mail className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Transmettre le dossier a l'assureur</h4>
              <p className="text-sm text-gray-600">Envoyer les pieces du prospect a AXA ou autre assureur pour saisie du devis</p>
            </div>
          </div>
          <button
            onClick={() => setShowSendToInsurer(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-700 hover:to-orange-700 font-semibold text-sm shadow-sm transition-all flex items-center gap-2"
          >
            <Send className="h-4 w-4" />
            Transmettre
          </button>
        </div>
      </div>

      {/* Companies & Quotes */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {companies.map((company) => {
          const companyStyle = companyVisualStyle(company.id || company.name);
          const companyQuotes = getQuotesForCompany(company.id);
          const isUploading = uploading === company.id;
          const isSending = sending === company.id;

          return (
            <div
              key={company.id}
              className={`rounded-lg shadow-sm border-2 border-l-4 ${companyStyle.border} ${companyStyle.light} p-6 transition-all ${
                companyQuotes.length > 0
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="flex h-16 w-28 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
                  {companyLogoUrls[company.id] && !logoErrors.has(company.id) ? (
                    <img
                      src={companyLogoUrls[company.id]}
                      alt={`Logo ${company.name}`}
                      className="h-full w-full object-contain"
                      onError={() => setLogoErrors(previous => new Set(previous).add(company.id))}
                    />
                  ) : company.name.toLowerCase().includes('axa') || company.code.toLowerCase().includes('axa') ? (
                    <div className="flex h-full w-full items-center justify-center rounded bg-red-600 text-2xl font-black tracking-tight text-white">AXA</div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1 text-center text-gray-500">
                      <Building2 className="h-6 w-6 text-blue-600" />
                      <span className="max-w-[90px] truncate text-[10px] font-semibold">{company.name}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`text-lg font-semibold mb-1 flex items-center gap-2 w-fit px-2.5 py-1 rounded-md ${companyStyle.lightAccent}`}>
                    {company.name}
                    {company.code === 'SWISSLIFE_RCPRO' && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded-full border border-amber-300">
                        Optionnel - RC Pro seule
                      </span>
                    )}
                  </h4>
                  <p className="text-sm text-gray-600">{company.code}</p>
                </div>
                {companyQuotes.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                      {companyQuotes.length} devis
                    </span>
                    <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
                  </div>
                )}
              </div>

              {/* Liste des devis existants */}
              {companyQuotes.length > 0 && (
                <div className="space-y-3 mb-4">
                  {companyQuotes.map((quote) => {
                    // Check if quote has a file
                    const hasFile = quote.quote_pdf_url && quote.quote_pdf_url.trim() !== '';
                    const fileName = hasFile ? (quote.quote_pdf_url.split('/').pop() || 'devis.pdf') : 'Devis en attente';

                    return (
                      <div key={quote.id} className={`rounded-lg p-4 border ${hasFile ? 'bg-white border-green-200' : 'bg-orange-50 border-orange-200'}`}>
                        <div className="flex items-start gap-3">
                          <FileText className={`h-5 w-5 flex-shrink-0 mt-0.5 ${hasFile ? 'text-gray-600' : 'text-orange-600'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate mb-1">
                              {hasFile ? decodeURIComponent(fileName) : '⚠️ Fichier non uploadé'}
                            </p>
                            {hasFile && quote.submitted_at && (
                              <p className="text-xs text-gray-600">
                                Uploadé le {new Date(quote.submitted_at).toLocaleDateString('fr-FR')} à {new Date(quote.submitted_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                            {hasFile && quote.last_sent_at && (
                              <p className="text-xs text-green-600">
                                Email envoyé le {new Date(quote.last_sent_at).toLocaleDateString('fr-FR')} à {new Date(quote.last_sent_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            )}
                            {!hasFile && (
                              <p className="text-xs text-orange-600 font-medium">
                                Veuillez uploader le fichier PDF du devis
                              </p>
                            )}
                          </div>
                        </div>

                        {hasFile && (
                          <>
                            <div className="mt-3">
                              <button
                                onClick={() => setOpenModalQuote(quote)}
                                className={`w-full text-sm py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 font-semibold transition-all ${
                                  quote.sent_to_client_at
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                    : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-sm'
                                }`}
                              >
                                {quote.sent_to_client_at ? (
                                  <>
                                    <CheckCheck className="h-4 w-4" />
                                    Devis soumis le {new Date(quote.sent_to_client_at).toLocaleDateString('fr-FR')} - Re-soumettre
                                  </>
                                ) : (
                                  <>
                                    <Send className="h-4 w-4" />
                                    Soumettre le devis au prospect
                                  </>
                                )}
                              </button>
                            </div>
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => window.open(quote.quote_pdf_url, '_blank')}
                                className="flex-1 text-sm py-2 px-3 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 flex items-center justify-center gap-2 font-medium"
                              >
                                <FileText className="h-4 w-4" />
                                Voir
                              </button>
                              <button
                                onClick={() => resendQuoteEmail(quote)}
                                disabled={isSending}
                                className="flex-1 text-sm py-2 px-3 bg-green-50 text-green-600 rounded hover:bg-green-100 flex items-center justify-center gap-2 disabled:opacity-50 font-medium"
                              >
                                {isSending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4" />
                                )}
                                {isSending ? 'Envoi...' : 'Renvoyer'}
                              </button>
                              <button
                                onClick={() => deleteQuote(quote.id, quote.quote_pdf_url)}
                                className="text-sm py-2 px-3 bg-red-50 text-red-600 rounded hover:bg-red-100 flex items-center justify-center gap-2"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </>
                        )}
                        {!hasFile && (
                          <div className="mt-3">
                            <button
                              onClick={() => deleteQuote(quote.id, '')}
                              className="w-full text-sm py-2 px-3 bg-red-50 text-red-600 rounded hover:bg-red-100 flex items-center justify-center gap-2 font-medium"
                            >
                              <X className="h-4 w-4" />
                              Supprimer cette entrée
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Zone d'upload (toujours visible) */}
              <div>
                <label className="block">
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (!isUploading) setDragOverCompanyId(company.id);
                    }}
                    onDragLeave={() => setDragOverCompanyId(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverCompanyId(null);
                      if (isUploading) return;
                      handleFileSelected(company.id, e.dataTransfer.files?.[0]);
                    }}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                      isUploading
                        ? 'border-blue-400 bg-blue-50'
                        : dragOverCompanyId === company.id
                        ? 'border-blue-500 bg-blue-100 ring-2 ring-blue-300 scale-[1.01]'
                        : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                    }`}
                  >
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        <span className="text-sm text-gray-600">Upload en cours...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center justify-center gap-2">
                          <Plus className="h-6 w-6 text-blue-600" />
                          <Upload className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <span className="text-sm font-medium text-blue-600">
                            {dragOverCompanyId === company.id
                              ? 'Déposez le PDF ici'
                              : companyQuotes.length > 0
                              ? 'Ajouter un autre devis'
                              : 'Cliquez ou glissez-déposez un devis'}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">PDF jusqu'à 10 MB</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    disabled={isUploading}
                    onChange={(e) => {
                      handleFileSelected(company.id, e.target.files?.[0]);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">À chaque upload :</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-800">
              <li>Le devis est stocké de manière sécurisée</li>
              <li>Un email automatique est envoyé au prospect</li>
              <li>Le prospect peut consulter tous ses devis dans son espace</li>
              <li>Vous pouvez uploader plusieurs devis par compagnie</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Modal de soumission complète du devis */}
      {openModalQuote && (
        <SubmitQuoteModal
          isOpen={!!openModalQuote}
          onClose={() => setOpenModalQuote(null)}
          leadId={leadId}
          leadEmail={leadEmail}
          leadFirstName={leadFirstName}
          leadAccessToken={leadAccessToken}
          company={(() => {
            const c = companies.find((c) => c.id === openModalQuote.company_id);
            return c
              ? { id: c.id, name: c.name, logo_url: c.logo_url }
              : { id: openModalQuote.company_id, name: 'Compagnie' };
          })()}
          existingQuote={{
            id: openModalQuote.id,
            quote_amount: openModalQuote.quote_amount ?? null,
            quote_file_url: openModalQuote.quote_pdf_url ?? null,
          }}
          onSubmitted={() => {
            setOpenModalQuote(null);
            loadQuotes();
          }}
        />
      )}

      <SendToInsurerModal
        isOpen={showSendToInsurer}
        onClose={() => setShowSendToInsurer(false)}
        leadId={leadId}
        leadName={leadFullName || leadFirstName || ''}
        leadEmail={leadEmail}
        leadPhone={leadPhone}
      />

      {/* Lien Espace Prospect */}
      {leadAccessToken && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 mb-2">Lien Espace Prospect</h4>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/espace-prospect?token=${leadAccessToken}`}
                  className="flex-1 px-3 py-2 text-sm bg-white border border-gray-300 rounded text-gray-700"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/espace-prospect?token=${leadAccessToken}`);
                    toast.success('Lien copié !');
                  }}
                  className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Copier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
