import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, CheckCircle2, X, FileText, Send, Loader2, Building2, AlertCircle, Plus } from 'lucide-react';
import { toast } from '@/lib/toast';

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
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dragOverCompanyId, setDragOverCompanyId] = useState<string | null>(null);

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
    // Check if all 5 companies have at least 1 quote with a file
    const quotesWithFiles = quotes.filter(q => q.quote_pdf_url && q.quote_pdf_url.trim() !== '');
    const companiesWithQuotes = new Set(quotesWithFiles.map(q => q.company_id));
    if (companiesWithQuotes.size >= 5) {
      onComplete?.();
    }
  }, [quotes]);

  async function loadCompanies() {
    try {
      const { data, error } = await supabase
        .from('insurance_companies')
        .select('*')
        .eq('is_mandatory', true)
        .eq('is_active', true)
        .order('priority_order');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadQuotes() {
    try {
      const { data, error } = await supabase
        .from('lead_company_quotes')
        .select(`
          *,
          company:insurance_companies(*)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
    } catch (error) {
      console.error('Error loading quotes:', error);
    }
  }

  async function uploadQuote(companyId: string, file: File) {
    setUploading(companyId);

    try {
      // Upload file to storage
      const safeName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.\-]+/g, '_').replace(/_+/g, '_');
      const fileName = `${leadId}/${companyId}/${Date.now()}_${safeName}`;
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('contract-documents')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Erreur upload storage: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase
        .storage
        .from('contract-documents')
        .getPublicUrl(uploadData.path);

      // Get company details
      const company = companies.find(c => c.id === companyId);
      const now = new Date().toISOString();

      // If a pending row already exists for this company without a file, update it
      // (auto-seeded by Validation Compagnies). Otherwise insert a new submitted row.
      const { data: pendingRow } = await supabase
        .from('lead_company_quotes')
        .select('id')
        .eq('lead_id', leadId)
        .eq('company_id', companyId)
        .eq('status', 'pending')
        .is('quote_file_url', null)
        .limit(1)
        .maybeSingle();

      if (pendingRow) {
        const { error: updateError } = await supabase
          .from('lead_company_quotes')
          .update({
            quote_file_url: publicUrl,
            quote_pdf_url: publicUrl,
            status: 'quote_submitted',
            quote_status: 'quote_submitted',
            submitted_at: now,
            sent_at: now
          })
          .eq('id', pendingRow.id);

        if (updateError) {
          console.error('Database update error:', updateError);
          throw new Error(`Erreur base de données: ${updateError.message}`);
        }
      } else {
        const { error: insertError } = await supabase
          .from('lead_company_quotes')
          .insert({
            lead_id: leadId,
            company_id: companyId,
            insurance_company_id: companyId,
            quote_file_url: publicUrl,
            quote_pdf_url: publicUrl,
            status: 'quote_submitted',
            quote_status: 'quote_submitted',
            submitted_at: now,
            sent_at: now
          });

        if (insertError) {
          console.error('Database insert error:', insertError);
          throw new Error(`Erreur base de données: ${insertError.message}`);
        }
      }

      // Send automatic email to prospect
      await sendQuoteEmail(companyId, company?.name || 'Compagnie', file.name);

      toast.success(`✅ Devis ${company?.name} uploadé avec succès !`);
      loadQuotes();

    } catch (error) {
      console.error('Error uploading quote:', error);
      toast.error(`❌ Erreur lors de l'upload du devis\n\n${error.message || error}`);
    } finally {
      setUploading(null);
    }
  }

  async function sendQuoteEmail(companyId: string, companyName: string, fileName: string) {
    if (!leadEmail) return;

    setSending(companyId);

    try {
      // Lien direct vers l'onglet Devis de l'espace prospect
      const prospectSpaceUrl = leadAccessToken
        ? `${window.location.origin}/espace-prospect?token=${leadAccessToken}&tab=devis`
        : `${window.location.origin}/espace-prospect?tab=devis`;

      const subject = `✅ Nouveau devis ${companyName} disponible - TaxiAssur`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px; border-radius: 10px;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h2 style="color: #16a34a; margin-bottom: 20px;">📄 Votre devis est prêt !</h2>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Bonjour ${leadFirstName || 'Cher client'},</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Excellente nouvelle ! Votre devis d'assurance taxi est maintenant disponible dans votre espace personnel :
            </p>

            <div style="background: linear-gradient(135deg, #16a34a 0%, #059669 100%); border-radius: 12px; padding: 20px; margin: 25px 0; text-align: center;">
              <div style="color: white; font-size: 20px; font-weight: bold; margin-bottom: 8px;">${companyName}</div>
              <div style="color: rgba(255,255,255,0.9); font-size: 14px;">${fileName}</div>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${prospectSpaceUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);">
                📋 Voir mon devis maintenant
              </a>
            </div>

            <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 25px 0; border-radius: 6px;">
              <p style="color: #1e40af; font-weight: bold; margin: 0 0 10px 0;">Dans votre espace sécurisé :</p>
              <ul style="color: #1e3a8a; margin: 0; padding-left: 20px;">
                <li style="margin: 5px 0;">✓ Consultez votre devis en ligne</li>
                <li style="margin: 5px 0;">✓ Téléchargez le PDF</li>
                <li style="margin: 5px 0;">✓ Imprimez-le directement</li>
                <li style="margin: 5px 0;">✓ Comparez avec d'autres offres</li>
              </ul>
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

      // Send email via edge function
      const { error } = await supabase.functions.invoke('send-crm-email', {
        body: {
          to: leadEmail,
          subject: subject,
          content: html,
          lead_id: leadId
        }
      });

      if (error) throw error;

      // Log interaction
      await supabase
        .from('crm_interactions')
        .insert({
          lead_id: leadId,
          type: 'email',
          channel: 'email',
          subject: subject,
          body: html,
          status: 'sent',
          metadata: { company_id: companyId, company_name: companyName, file_name: fileName }
        });

    } catch (error) {
      console.error('Error sending email:', error);
    } finally {
      setSending(null);
    }
  }

  async function resendQuoteEmail(quote: Quote) {
    const company = companies.find(c => c.id === quote.company_id);
    if (company) {
      // Extract filename from URL
      const fileName = quote.quote_pdf_url.split('/').pop() || 'devis.pdf';
      await sendQuoteEmail(company.id, company.name, fileName);

      // Update last_sent_at
      await supabase
        .from('lead_company_quotes')
        .update({ last_sent_at: new Date().toISOString() })
        .eq('id', quote.id);

      loadQuotes();
      toast.success('Email renvoyé avec succès !');
    }
  }

  async function deleteQuote(quoteId: string, fileUrl: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce devis ?')) return;

    try {
      // Extract file path from public URL
      // URL format: https://xxx.supabase.co/storage/v1/object/public/contract-documents/path/to/file.pdf
      const urlParts = fileUrl.split('/contract-documents/');
      const filePath = urlParts.length > 1 ? urlParts[1] : '';

      if (filePath) {
        // Delete from storage
        await supabase.storage.from('contract-documents').remove([filePath]);
      }

      // Delete record
      const { error } = await supabase
        .from('lead_company_quotes')
        .delete()
        .eq('id', quoteId);

      if (error) throw error;

      toast.success('✅ Devis supprimé avec succès !');
      loadQuotes();
    } catch (error) {
      console.error('Error deleting quote:', error);
      toast.error('❌ Erreur lors de la suppression');
    }
  }

  const getQuotesForCompany = (companyId: string) => {
    return quotes.filter(q => q.company_id === companyId);
  };

  // Only count companies with uploaded files
  const quotesWithFiles = quotes.filter(q => q.quote_pdf_url && q.quote_pdf_url.trim() !== '');
  const companiesWithQuotes = new Set(quotesWithFiles.map(q => q.company_id));
  const progressPercent = companies.length > 0
    ? Math.round((companiesWithQuotes.size / companies.length) * 100)
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
              {companiesWithQuotes.size}/{companies.length}
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

      {/* Companies & Quotes */}
      <div className="grid grid-cols-1 gap-6">
        {companies.map((company) => {
          const companyQuotes = getQuotesForCompany(company.id);
          const isUploading = uploading === company.id;
          const isSending = sending === company.id;

          return (
            <div
              key={company.id}
              className={`bg-white rounded-lg shadow-sm border-2 p-6 transition-all ${
                companyQuotes.length > 0
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0">
                  {company.logo_url ? (
                    <img
                      src={company.logo_url}
                      alt={`Logo ${company.name}`}
                      className="h-12 w-12 object-contain"
                    />
                  ) : (
                    <Building2 className="h-8 w-8 text-blue-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-lg font-semibold text-gray-900 mb-1">
                    {company.name}
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
                          <div className="flex gap-2 mt-3">
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
